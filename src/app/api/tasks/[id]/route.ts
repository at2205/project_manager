import { route, json, readBody, assertObjectId, HttpError } from "@/lib/api";
import { taskUpdateSchema } from "@/lib/validators";
import { Task } from "@/models/Task";

type P = { id: string };

async function findOwned(id: string, userId: string) {
  assertObjectId(id, "Task");
  const task = await Task.findOne({ _id: id, owner: userId });
  if (!task) throw new HttpError(404, "Task not found");
  return task;
}

export const GET = route<P>(async (_req, { params }, userId) => {
  return json({ task: await findOwned(params.id, userId) });
});

export const PUT = route<P>(async (req, { params }, userId) => {
  const task = await findOwned(params.id, userId);
  const data = taskUpdateSchema.parse(await readBody(req));
  if (data.status !== undefined && data.status !== task.status) task.completedAt = data.status === "done" ? new Date() : null;
  // Drop undefined keys so a partial update doesn't wipe fields.
  task.set(Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
  await task.save();
  return json({ task });
});

export const DELETE = route<P>(async (_req, { params }, userId) => {
  const task = await findOwned(params.id, userId);
  await task.deleteOne();
  return json({ ok: true });
});

// Always evaluated per request (never prerendered at build time).
export const dynamic = "force-dynamic";
