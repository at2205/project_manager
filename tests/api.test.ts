import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";

// Exercises the real route handlers + Mongoose models against an in-memory MongoDB.
type Handler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<Response>;

let mongod: MongoMemoryServer;
let routes: {
  signup: Handler; login: Handler;
  projects: { GET: Handler; POST: Handler };
  project: { GET: Handler; PUT: Handler; DELETE: Handler };
  projectTasks: { GET: Handler; POST: Handler };
  task: { GET: Handler; PUT: Handler; DELETE: Handler };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("api-test");
  process.env.JWT_SECRET = "test-secret";
  routes = {
    signup: (await import("@/app/api/auth/signup/route")).POST as unknown as Handler,
    login: (await import("@/app/api/auth/login/route")).POST as unknown as Handler,
    projects: (await import("@/app/api/projects/route")) as never,
    project: (await import("@/app/api/projects/[id]/route")) as never,
    projectTasks: (await import("@/app/api/projects/[id]/tasks/route")) as never,
    task: (await import("@/app/api/tasks/[id]/route")) as never,
  };
});

afterAll(async () => {
  const { disconnectDB } = await import("@/lib/db");
  await disconnectDB();
  await mongod.stop();
});

async function call(h: Handler, method: string, opts: { token?: string; body?: unknown; params?: Record<string, string>; qs?: string } = {}) {
  const req = new NextRequest(`http://localhost/api/x${opts.qs ?? ""}`, {
    method,
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const res = await h(req, { params: opts.params ?? {} });
  return { status: res.status, body: await res.json() };
}

describe("auth", () => {
  it("signs up, rejects duplicates, logs in, rejects bad password, stores a hashed password", async () => {
    const u = { name: "Ann", email: "Ann@Example.com", password: "Secret123" };
    const s = await call(routes.signup, "POST", { body: u });
    expect(s.status).toBe(201);
    expect(s.body.user.email).toBe("ann@example.com");
    expect(s.body.token).toBeTruthy();

    expect((await call(routes.signup, "POST", { body: u })).status).toBe(409);
    expect((await call(routes.signup, "POST", { body: { ...u, email: "x", password: "1" } })).status).toBe(400);

    expect((await call(routes.login, "POST", { body: { email: "ann@example.com", password: "Secret123" } })).status).toBe(200);
    expect((await call(routes.login, "POST", { body: { email: "ann@example.com", password: "nope" } })).status).toBe(401);

    const { User } = await import("@/models/User");
    const raw = await User.findOne({ email: "ann@example.com" }).select("+password");
    expect(raw!.password).not.toBe("Secret123");
  });

  it("requires authentication on data routes", async () => {
    expect((await call(routes.projects.GET, "GET")).status).toBe(401);
    expect((await call(routes.projects.GET, "GET", { token: "garbage" })).status).toBe(401);
  });
});

describe("projects, tasks, filtering/sorting and isolation", () => {
  let alice = "", bob = "", pid = "";
  const tid: string[] = [];

  beforeAll(async () => {
    alice = (await call(routes.signup, "POST", { body: { name: "A", email: "alice@x.com", password: "Secret123" } })).body.token;
    bob = (await call(routes.signup, "POST", { body: { name: "B", email: "bob@x.com", password: "Secret123" } })).body.token;
  });

  it("project CRUD", async () => {
    const c = await call(routes.projects.POST, "POST", { token: alice, body: { title: "P1", description: "d" } });
    expect(c.status).toBe(201);
    pid = c.body.project._id;
    expect((await call(routes.projects.POST, "POST", { token: alice, body: { title: " " } })).status).toBe(400);

    const list = await call(routes.projects.GET, "GET", { token: alice });
    expect(list.body.projects).toHaveLength(1);

    const u = await call(routes.project.PUT, "PUT", { token: alice, params: { id: pid }, body: { title: "P1b", description: "x" } });
    expect(u.body.project.title).toBe("P1b");
    expect((await call(routes.project.GET, "GET", { token: alice, params: { id: "not-an-id" } })).status).toBe(404);
  });

  it("task CRUD, filter and sort", async () => {
    const mk = async (body: object) => {
      const r = await call(routes.projectTasks.POST, "POST", { token: alice, params: { id: pid }, body });
      expect(r.status).toBe(201);
      tid.push(r.body.task._id);
    };
    await mk({ title: "late", status: "todo", dueDate: "2026-12-01" });
    await mk({ title: "soon", status: "in-progress", dueDate: "2026-11-01" });
    await mk({ title: "nodate", status: "done" });

    const titles = async (qs: string) =>
      (await call(routes.projectTasks.GET, "GET", { token: alice, params: { id: pid }, qs })).body.tasks.map((t: { title: string }) => t.title);

    expect(await titles("?sortBy=dueDate&order=asc")).toEqual(["soon", "late", "nodate"]);
    expect(await titles("?sortBy=dueDate&order=desc")).toEqual(["late", "soon", "nodate"]); // no due date always last
    expect(await titles("?status=done")).toEqual(["nodate"]);
    expect(await titles("?sortBy=status&order=asc")).toEqual(["late", "soon", "nodate"]);
    expect((await call(routes.projectTasks.GET, "GET", { token: alice, params: { id: pid }, qs: "?status=bogus" })).status).toBe(400);

    // partial update keeps other fields; dueDate can be cleared
    const up = await call(routes.task.PUT, "PUT", { token: alice, params: { id: tid[0] }, body: { status: "done", dueDate: null } });
    expect(up.body.task).toMatchObject({ title: "late", status: "done", dueDate: null });

    const del = await call(routes.task.DELETE, "DELETE", { token: alice, params: { id: tid[2] } });
    expect(del.status).toBe(200);
    expect((await call(routes.task.GET, "GET", { token: alice, params: { id: tid[2] } })).status).toBe(404);

    const counts = (await call(routes.projects.GET, "GET", { token: alice })).body.projects[0];
    expect(counts).toMatchObject({ taskCount: 2, doneCount: 1 });
  });

  it("isolates data between users", async () => {
    expect((await call(routes.projects.GET, "GET", { token: bob })).body.projects).toEqual([]);
    expect((await call(routes.project.GET, "GET", { token: bob, params: { id: pid } })).status).toBe(404);
    expect((await call(routes.project.PUT, "PUT", { token: bob, params: { id: pid }, body: { title: "hax" } })).status).toBe(404);
    expect((await call(routes.project.DELETE, "DELETE", { token: bob, params: { id: pid } })).status).toBe(404);
    expect((await call(routes.projectTasks.GET, "GET", { token: bob, params: { id: pid } })).status).toBe(404);
    expect((await call(routes.projectTasks.POST, "POST", { token: bob, params: { id: pid }, body: { title: "x" } })).status).toBe(404);
    expect((await call(routes.task.PUT, "PUT", { token: bob, params: { id: tid[0] }, body: { title: "hax" } })).status).toBe(404);
    expect((await call(routes.task.DELETE, "DELETE", { token: bob, params: { id: tid[0] } })).status).toBe(404);
  });

  it("deleting a project cascades to its tasks", async () => {
    expect((await call(routes.project.DELETE, "DELETE", { token: alice, params: { id: pid } })).status).toBe(200);
    const { Task } = await import("@/models/Task");
    expect(await Task.countDocuments({ project: pid })).toBe(0);
  });
});
