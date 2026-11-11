import type { TaskStatus } from "@/types";

export const STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Done",
};
