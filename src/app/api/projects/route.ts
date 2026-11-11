import mongoose from "mongoose";
import { route, json, readBody, HttpError } from "@/lib/api";
import { projectCreateSchema } from "@/lib/validators";
import { suggestKey } from "@/lib/projectKey";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";

// GET /api/projects — list the current user's projects (with task counts)
export const GET = route(async (_req, _ctx, userId) => {
  const projects = await Project.find({ owner: userId }).sort({ createdAt: -1 }).lean();
  const counts = await Task.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$project", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
  ]);
  const byProject = new Map(counts.map((c) => [String(c._id), c]));
  return json({
    projects: projects.map((p) => ({
      ...p,
      taskCount: byProject.get(String(p._id))?.total ?? 0,
      doneCount: byProject.get(String(p._id))?.done ?? 0,
    })),
  });
});

// POST /api/projects — create a project
export const POST = route(async (req, _ctx, userId) => {
  const { key: requested, ...data } = projectCreateSchema.parse(await readBody(req));

  let key = requested || suggestKey(data.title);
  if (requested) {
    if (await Project.exists({ owner: userId, key })) throw new HttpError(409, "That project key is already in use");
  } else {
    // auto-generated: make it unique for this user (WR, WR2, WR3, ...)
    const base = key;
    for (let n = 2; await Project.exists({ owner: userId, key }); n++) key = base.slice(0, 10 - String(n).length) + n;
  }

  const project = await Project.create({ ...data, key, owner: userId });
  return json({ project: { ...project.toObject(), taskCount: 0, doneCount: 0 } }, 201);
});

// Always evaluated per request (never prerendered at build time).
export const dynamic = "force-dynamic";
