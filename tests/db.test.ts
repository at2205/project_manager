import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

process.env.JWT_SECRET = "test-secret";

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("connectDB", () => {
  it("rejects with DatabaseError when MONGODB_URI is missing", async () => {
    delete process.env.MONGODB_URI;
    const { connectDB, DatabaseError } = await import("@/lib/db");
    await expect(connectDB()).rejects.toBeInstanceOf(DatabaseError);
  });

  it("fails gracefully (503, no credentials leaked) when the database is unreachable, then recovers", async () => {
    process.env.MONGODB_URI = "mongodb://user:supersecret@127.0.0.1:1/unreachable";
    const { connectDB, DatabaseError } = await import("@/lib/db");
    await expect(connectDB()).rejects.toBeInstanceOf(DatabaseError);

    const { GET } = await import("@/app/api/projects/route");
    const { NextRequest } = await import("next/server");
    const { signToken } = await import("@/lib/auth");
    const token = await signToken("64b000000000000000000001");
    const res = await GET(
      new NextRequest("http://localhost/api/projects", { headers: { authorization: `Bearer ${token}` } }),
      { params: {} as never }
    );
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("supersecret");

    // A failed attempt must not poison the cache: pointing at a healthy DB now works.
    process.env.MONGODB_URI = mongod.getUri("recover");
    await expect(connectDB()).resolves.toBeDefined();
  });

  it("caches the connection (same instance, single connection)", async () => {
    process.env.MONGODB_URI = mongod.getUri("cache");
    const { connectDB } = await import("@/lib/db");
    const [a, b] = await Promise.all([connectDB(), connectDB()]);
    expect(a).toBe(b);
    expect(mongoose.connections.filter((c) => c.readyState === 1)).toHaveLength(1);
  });
});
