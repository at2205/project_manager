import { route, json, readBody, assertObjectId, HttpError } from "@/lib/api";
import { projectSchema } from "@/lib/validators";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";

type P = { id: string };

async function findOwned(id: string, userId: string) {
  assertObjectId(id, "Project");
  const project = await Project.findOne({ _id: id, owner: userId });
  if (!project) throw new HttpError(404, "Project not found");
  return project;
}

export const GET = route<P>(async (_req, { params }, userId) => {
  return json({ project: await findOwned(params.id, userId) });
});

export const PUT = route<P>(async (req, { params }, userId) => {
  const project = await findOwned(params.id, userId);
  const data = projectSchema.parse(await readBody(req));
  project.set(data);
  await project.save();
  return json({ project });
});

// Deleting a project also removes its tasks.
export const DELETE = route<P>(async (_req, { params }, userId) => {
  const project = await findOwned(params.id, userId);
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
  return json({ ok: true });
});

// Always evaluated per request (never prerendered at build time).
export const dynamic = "force-dynamic";
