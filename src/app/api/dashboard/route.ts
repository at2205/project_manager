import { route, json } from "@/lib/api";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const ACTIVITY_DAYS = 14;

/**
 * GET /api/dashboard?today=YYYY-MM-DD&tz=<Date.getTimezoneOffset()>
 * Aggregated overview for the signed-in user. The client passes its local "today" and UTC offset so that
 * "overdue" and the per-day activity buckets agree with what the user sees on their own calendar.
 */
export const GET = route(async (req, _ctx, userId) => {
  const q = req.nextUrl.searchParams;
  const todayParam = q.get("today") ?? "";
  const today = /^\d{4}-\d{2}-\d{2}$/.test(todayParam) && !isNaN(Date.parse(todayParam)) ? todayParam : new Date().toISOString().slice(0, 10);
  const tz = Math.max(-840, Math.min(840, Number(q.get("tz")) || 0)); // minutes, as from getTimezoneOffset()
  const localDay = (d: Date) => new Date(d.getTime() - tz * 60_000).toISOString().slice(0, 10);

  const [projects, tasks] = await Promise.all([
    Project.find({ owner: userId }).select("title key createdAt").sort({ createdAt: -1 }).lean(),
    Task.find({ owner: userId }).select("project number title status dueDate createdAt updatedAt completedAt").lean(),
  ]);
  const projectById = new Map(projects.map((p) => [String(p._id), p]));

  const weekEnd = new Date(Date.parse(today) + 7 * DAY).toISOString().slice(0, 10);
  const totals = { projects: projects.length, tasks: tasks.length, todo: 0, inProgress: 0, done: 0, overdue: 0, dueThisWeek: 0 };
  const perProject = new Map<string, { todo: number; inProgress: number; done: number }>();
  const days = Array.from({ length: ACTIVITY_DAYS }, (_, i) => new Date(Date.parse(today) - (ACTIVITY_DAYS - 1 - i) * DAY).toISOString().slice(0, 10));
  const activity = new Map(days.map((d) => [d, { date: d, created: 0, completed: 0 }]));

  const shape = (t: (typeof tasks)[number]) => {
    const p = projectById.get(String(t.project));
    return {
      _id: String(t._id),
      title: t.title,
      number: t.number ?? null,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      updatedAt: t.updatedAt.toISOString(),
      projectId: String(t.project),
      projectKey: p?.key ?? null,
      projectTitle: p?.title ?? "",
    };
  };

  const upcoming: ReturnType<typeof shape>[] = [];
  for (const t of tasks) {
    const bucket = perProject.get(String(t.project)) ?? { todo: 0, inProgress: 0, done: 0 };
    if (t.status === "done") {
      totals.done++;
      bucket.done++;
      const a = activity.get(localDay(t.completedAt ?? t.updatedAt));
      if (a) a.completed++;
    } else {
      if (t.status === "in-progress") (totals.inProgress++, bucket.inProgress++);
      else (totals.todo++, bucket.todo++);
      const due = t.dueDate?.toISOString().slice(0, 10);
      if (due) {
        if (due < today) totals.overdue++;
        else if (due <= weekEnd) totals.dueThisWeek++;
        if (due <= weekEnd) upcoming.push(shape(t));
      }
    }
    perProject.set(String(t.project), bucket);
    const c = activity.get(localDay(t.createdAt));
    if (c) c.created++;
  }

  upcoming.sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const recent = [...tasks].sort((a, b) => +b.updatedAt - +a.updatedAt).slice(0, 8).map(shape);

  return json({
    today,
    totals,
    byProject: projects.slice(0, 12).map((p) => {
      const b = perProject.get(String(p._id)) ?? { todo: 0, inProgress: 0, done: 0 };
      return { _id: String(p._id), title: p.title, key: p.key ?? null, ...b, total: b.todo + b.inProgress + b.done };
    }),
    upcoming: upcoming.slice(0, 8),
    recent,
    activity: [...activity.values()],
  });
});
