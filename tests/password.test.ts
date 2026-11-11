import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

type Handler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<Response>;
let mongod: MongoMemoryServer;
let signup: Handler, login: Handler, projectsPOST: Handler, tasksPOST: Handler;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("pw-test");
  process.env.JWT_SECRET = "test-secret";
  signup = (await import("@/app/api/auth/signup/route")).POST as unknown as Handler;
  login = (await import("@/app/api/auth/login/route")).POST as unknown as Handler;
  projectsPOST = (await import("@/app/api/projects/route")).POST as unknown as Handler;
  tasksPOST = (await import("@/app/api/projects/[id]/tasks/route")).POST as unknown as Handler;
});
afterAll(async () => {
  const { disconnectDB } = await import("@/lib/db");
  await disconnectDB();
  await mongod.stop();
});
beforeEach(async () => (await import("@/lib/rateLimit")).resetAllFailures());

async function call(h: Handler, body: unknown, opts: { token?: string; ip?: string; params?: Record<string, string> } = {}) {
  const req = new NextRequest("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": opts.ip ?? "10.0.0.1", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: JSON.stringify(body),
  });
  const res = await h(req, { params: opts.params ?? {} });
  return { status: res.status, body: await res.json() };
}

describe("password policy (signup)", () => {
  const base = { name: "P", email: "p@x.com" };
  it.each([
    ["too short", "Ab1", "at least 8"],
    ["no number", "abcdefghij", "contain a number"],
    ["no letter", "1234567890", "contain a letter"],
    ["too common", "Password123", "too common"],
    ["longer than 72 bytes", "A1" + "x".repeat(80), "at most 72"],
  ])("rejects a password that is %s", async (_n, password, msg) => {
    const r = await call(signup, { ...base, password });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain(msg);
  });

  it("accepts a valid password, stores only a cost-12 bcrypt hash, never returns it", async () => {
    const r = await call(signup, { ...base, password: "Tr1cky-pass" });
    expect(r.status).toBe(201);
    expect(JSON.stringify(r.body)).not.toContain("Tr1cky-pass");
    expect(r.body.user.password).toBeUndefined();
    const { User } = await import("@/models/User");
    const u = await User.findOne({ email: "p@x.com" }).select("+password");
    expect(u!.password).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare("Tr1cky-pass", u!.password)).toBe(true);
  });

  it("hashes are salted (same password -> different hashes)", async () => {
    await call(signup, { name: "A", email: "a1@x.com", password: "Same-pass-1" });
    await call(signup, { name: "B", email: "a2@x.com", password: "Same-pass-1" });
    const { User } = await import("@/models/User");
    const [a, b] = await Promise.all(["a1@x.com", "a2@x.com"].map((e) => User.findOne({ email: e }).select("+password")));
    expect(a!.password).not.toBe(b!.password);
  });
});

describe("login security", () => {
  beforeAll(async () => {
    await call(signup, { name: "L", email: "login@x.com", password: "Login-pass-1" });
  });

  it("works with correct password (email is case-insensitive)", async () => {
    expect((await call(login, { email: "LOGIN@x.com", password: "Login-pass-1" })).status).toBe(200);
  });

  it("is case-sensitive for the password", async () => {
    expect((await call(login, { email: "login@x.com", password: "login-pass-1" })).status).toBe(401);
  });

  it("gives the same error for unknown email and wrong password (no account enumeration)", async () => {
    const a = await call(login, { email: "login@x.com", password: "wrong-Pass-9" });
    const b = await call(login, { email: "nobody@x.com", password: "wrong-Pass-9" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it("still lets legacy users with short passwords log in (policy applies to new passwords only)", async () => {
    const { User } = await import("@/models/User");
    await User.create({ name: "Old", email: "old@x.com", password: await bcrypt.hash("abc", 10) });
    expect((await call(login, { email: "old@x.com", password: "abc" })).status).toBe(200);
  });

  it("locks out after 5 failures (429), per IP+email, and a success resets the counter", async () => {
    const bad = { email: "login@x.com", password: "nope-Nope-1" };
    for (let i = 0; i < 5; i++) expect((await call(login, bad, { ip: "9.9.9.9" })).status).toBe(401);
    const locked = await call(login, bad, { ip: "9.9.9.9" });
    expect(locked.status).toBe(429);
    // even the right password is refused while locked
    expect((await call(login, { email: "login@x.com", password: "Login-pass-1" }, { ip: "9.9.9.9" })).status).toBe(429);
    // another IP is unaffected
    expect((await call(login, { email: "login@x.com", password: "Login-pass-1" }, { ip: "8.8.8.8" })).status).toBe(200);

    // success resets the counter
    for (let i = 0; i < 4; i++) await call(login, bad, { ip: "7.7.7.7" });
    expect((await call(login, { email: "login@x.com", password: "Login-pass-1" }, { ip: "7.7.7.7" })).status).toBe(200);
    for (let i = 0; i < 4; i++) expect((await call(login, bad, { ip: "7.7.7.7" })).status).toBe(401);
  });
});

describe("project keys and issue numbers", () => {
  it("generates unique keys, accepts custom keys, rejects duplicates, numbers tasks sequentially", async () => {
    const token = (await call(signup, { name: "K", email: "k@x.com", password: "Keys-pass-1" })).body.token;
    const p1 = await call(projectsPOST, { title: "Website Redesign" }, { token });
    expect(p1.body.project.key).toBe("WR");
    const p2 = await call(projectsPOST, { title: "Web Rebuild" }, { token });
    expect(p2.body.project.key).toBe("WR2");
    expect((await call(projectsPOST, { title: "Mobile", key: "app" }, { token })).body.project.key).toBe("APP");
    expect((await call(projectsPOST, { title: "Other", key: "APP" }, { token })).status).toBe(409);
    expect((await call(projectsPOST, { title: "Bad", key: "1x" }, { token })).status).toBe(400);

    const id = p1.body.project._id;
    const t = async () => (await call(tasksPOST, { title: "t" }, { token, params: { id } })).body.task.number;
    expect([await t(), await t(), await t()]).toEqual([1, 2, 3]);
  });
});
