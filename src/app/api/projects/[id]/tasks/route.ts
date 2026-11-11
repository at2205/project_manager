import mongoose from "mongoose";
import { route, json, readBody, assertObjectId, HttpError } from "@/lib/api";
import { taskSchema, TASK_STATUSES } from "@/lib/validators";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";

type P = { id: string };

async function assertOwnsProject(id: string, userId: string) {
  assertObjectId(id, "Project");
  if (!(await Project.exists({ _id: id, owner: userId }))) throw new HttpError(404, "Project not found");
}

/**
 * GET /api/projects/:id/tasks?status=todo|in-progress|done&sortBy=dueDate|status|createdAt&order=asc|desc
 */
export const GET = route<P>(async (req, { params }, userId) => {
  await assertOwnsProject(params.id, userId);
  const q = req.nextUrl.searchParams;

  const filter: Record<string, unknown> = { project: params.id, owner: userId };
  const status = q.get("status");
  if (status) {
    if (!(TASK_STATUSES as readonly string[]).includes(status)) throw new HttpError(400, "Invalid status filter");
    filter.status = status;
  }

  const sortBy = q.get("sortBy") ?? "createdAt";
  const dir = q.get("order") === "asc" ? 1 : -1;
  const tasks = await Task.find(filter).lean();

  const rank = (s: string) => TASK_STATUSES.indexOf(s as (typeof TASK_STATUSES)[number]);
  tasks.sort((a, b) => {
    if (sortBy === "dueDate") {
      // Tasks without a due date always go last.
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return (+a.dueDate - +b.dueDate) * dir;
    }
    if (sortBy === "status") return (rank(a.status) - rank(b.status)) * dir;
    return (+a.createdAt - +b.createdAt) * dir;
  });

  // Per-status counts for the whole project (ignores the active filter) for the UI summary.
  const grouped = await Task.aggregate([
    { $match: { project: new mongoose.Types.ObjectId(params.id), owner: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const counts = { todo: 0, "in-progress": 0, done: 0 } as Record<string, number>;
  for (const g of grouped) counts[g._id] = g.n;

  return json({ tasks, counts });
});

export const POST = route<P>(async (req, { params }, userId) => {
  assertObjectId(params.id, "Project");
  const data = taskSchema.parse(await readBody(req));
  // Atomically hand out the next issue number for this project (also verifies ownership).
  const project = await Project.findOneAndUpdate({ _id: params.id, owner: userId }, { $inc: { taskSeq: 1 } }, { new: true });
  if (!project) throw new HttpError(404, "Project not found");
  const task = await Task.create({ ...data, completedAt: data.status === "done" ? new Date() : null, number: project.taskSeq, project: params.id, owner: userId });
  return json({ task }, 201);
});

// Always evaluated per request (never prerendered at build time).
export const dynamic = "force-dynamic";
