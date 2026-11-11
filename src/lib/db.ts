import mongoose from "mongoose";

/** Thrown when the database cannot be reached or is misconfigured. Mapped to HTTP 503 by the API wrapper. */
export class DatabaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Cached on globalThis so Next.js hot reloads and concurrent requests reuse one connection.
const g = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = (g._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new DatabaseError("MONGODB_URI is not set. Add it to .env.local (see .env.example).");

  // Reuse a healthy connection (readyState 1 = connected).
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000, // fail fast instead of hanging when Atlas is unreachable
        maxPoolSize: 10,
      })
      .catch((e) => {
        cache.promise = null; // allow a retry on the next request
        cache.conn = null;
        // Log the reason server-side only; never include the URI (it contains credentials).
        console.error("[db] MongoDB connection failed:", e instanceof Error ? e.message : e);
        throw new DatabaseError("Database is unavailable. Please try again later.", e);
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  cache.conn = null;
  cache.promise = null;
  await mongoose.disconnect();
}
