import type { Project, Task } from "@/types";

/** Deterministic hue (0-359) from an id, used to colour-code projects. */
export function projectHue(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

export function formatDue(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso?: string) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export function isOverdue(t: Task) {
  return !!t.dueDate && t.status !== "done" && t.dueDate.slice(0, 10) < todayStr();
}

/** Jira-style issue key, e.g. WEB-12. Falls back gracefully for legacy data without keys/numbers. */
export function taskKey(project: Pick<Project, "key"> | null | undefined, t: Pick<Task, "_id" | "number">) {
  return `${project?.key ?? "TASK"}-${t.number ?? t._id.slice(-4).toUpperCase()}`;
}

export function initials(name?: string) {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "U";
}

export function relativeTime(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
