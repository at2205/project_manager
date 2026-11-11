import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";

type Handler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<Response>;
let mongod: MongoMemoryServer;
let H: Record<string, Handler>;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("dash-test");
  process.env.JWT_SECRET = "test-secret";
  H = {
    signup: (await import("@/app/api/auth/signup/route")).POST as unknown as Handler,
    projects: (await import("@/app/api/projects/route")).POST as unknown as Handler,
    tasks: (await import("@/app/api/projects/[id]/tasks/route")).POST as unknown as Handler,
    task: (await import("@/app/api/tasks/[id]/route")).PUT as unknown as Handler,
    dash: (await import("@/app/api/dashboard/route")).GET as unknown as Handler,
  };
});
afterAll(async () => {
  await (await import("@/lib/db")).disconnectDB();
  await mongod.stop();
});

async function call(h: Handler, method: string, o: { token?: string; body?: unknown; params?: Record<string, string>; qs?: string } = {}) {
  const req = new NextRequest(`http://localhost/api/x${o.qs ?? ""}`, {
    method,
    headers: { "content-type": "application/json", ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const res = await h(req, { params: o.params ?? {} });
  return { status: res.status, body: await res.json() };
}

describe("GET /api/dashboard", () => {
  it("requires authentication", async () => {
    expect((await call(H.dash, "GET")).status).toBe(401);
  });

  it("aggregates totals, overdue, due-soon, per-project breakdown, recent and 14-day activity", async () => {
    const token = (await call(H.signup, "POST", { body: { name: "D", email: "d@x.com", password: "Dash-pass-1" } })).body.token;
    const other = (await call(H.signup, "POST", { body: { name: "O", email: "o@x.com", password: "Other-pass-1" } })).body.token;
    const p = (await call(H.projects, "POST", { token, body: { title: "Alpha" } })).body.project._id;
    const p2 = (await call(H.projects, "POST", { token: other, body: { title: "Not mine" } })).body.project._id;
    const add = (body: object, pid = p, t = token) => call(H.tasks, "POST", { token: t, params: { id: pid }, body });

    await add({ title: "overdue", status: "todo", dueDate: "2026-11-01" });
    await add({ title: "soon", status: "in-progress", dueDate: "2026-11-14" });
    await add({ title: "later", status: "todo", dueDate: "2026-12-30" });
    await add({ title: "overdue but done", status: "done", dueDate: "2026-10-01" });
    const moved = (await add({ title: "to finish", status: "todo" })).body.task._id;
    await add({ title: "someone else's" }, p2, other);

    // moving a task to done stamps completedAt; moving it back clears it
    const done = await call(H.task, "PUT", { token, params: { id: moved }, body: { status: "done" } });
    expect(done.body.task.completedAt).toBeTruthy();
    const reopened = await call(H.task, "PUT", { token, params: { id: moved }, body: { status: "todo" } });
    expect(reopened.body.task.completedAt).toBeNull();
    await call(H.task, "PUT", { token, params: { id: moved }, body: { status: "done" } });

    const today = new Date().toISOString().slice(0, 10);
    const r = await call(H.dash, "GET", { token, qs: "?today=2026-11-12&tz=0" });
    expect(r.status).toBe(200);
    expect(r.body.today).toBe("2026-11-12");
    expect(r.body.totals).toEqual({ projects: 1, tasks: 5, todo: 2, inProgress: 1, done: 2, overdue: 1, dueThisWeek: 1 });
    expect(r.body.upcoming.map((t: { title: string }) => t.title)).toEqual(["overdue", "soon"]); // overdue first, "later" is >7 days away
    expect(r.body.upcoming[0]).toMatchObject({ projectKey: "ALPH", number: 1 });
    expect(r.body.byProject).toEqual([expect.objectContaining({ title: "Alpha", todo: 2, inProgress: 1, done: 2, total: 5 })]);
    expect(r.body.recent.length).toBe(5);
    expect(JSON.stringify(r.body)).not.toContain("someone else's"); // data isolation

    // activity buckets: dates are relative to the client's "today", 14 consecutive days ending on it
    const r2 = await call(H.dash, "GET", { token, qs: `?today=${today}&tz=0` });
    expect(r2.body.activity).toHaveLength(14);
    expect(r2.body.activity.at(-1).date).toBe(today);
    const created = r2.body.activity.reduce((n: number, d: { created: number }) => n + d.created, 0);
    const completed = r2.body.activity.reduce((n: number, d: { completed: number }) => n + d.completed, 0);
    expect(created).toBe(5);
    expect(completed).toBe(2);
  });

  it("ignores a malformed 'today' parameter instead of failing", async () => {
    const token = (await call(H.signup, "POST", { body: { name: "E", email: "e@x.com", password: "Empty-pass-1" } })).body.token;
    const r = await call(H.dash, "GET", { token, qs: "?today=not-a-date&tz=abc" });
    expect(r.status).toBe(200);
    expect(r.body.totals).toMatchObject({ projects: 0, tasks: 0 });
    expect(r.body.activity).toHaveLength(14);
  });
});
