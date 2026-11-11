import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { connectDB, DatabaseError } from "./db";
import { getUserId } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export function assertObjectId(id: string, label = "Resource") {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, `${label} not found`);
}

type Ctx<P> = { params: P };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>, userId: string) => Promise<NextResponse>;

function handleError(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  if (e instanceof DatabaseError) {
    // Generic message to the client; details were logged by connectDB.
    return json({ error: e.message.startsWith("MONGODB_URI") ? "Database is not configured" : e.message }, 503);
  }
  if (e instanceof ZodError) {
    return json({ error: e.issues[0]?.message ?? "Invalid input", issues: e.issues }, 400);
  }
  console.error(e);
  return json({ error: "Internal server error" }, 500);
}

/** Wraps a route handler: connects to DB, handles errors, optionally enforces auth. */
export function route<P = Record<string, never>>(handler: Handler<P>, opts: { auth?: boolean } = { auth: true }) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      await connectDB();
      let userId = "";
      if (opts.auth !== false) {
        const id = await getUserId(req);
        if (!id) throw new HttpError(401, "Authentication required");
        userId = id;
      }
      return await handler(req, ctx, userId);
    } catch (e) {
      return handleError(e);
    }
  };
}

export async function readBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
