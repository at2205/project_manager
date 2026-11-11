export type TaskStatus = "todo" | "in-progress" | "done";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  _id: string;
  key?: string;
  title: string;
  description: string;
  taskCount: number;
  doneCount: number;
  createdAt: string;
}

export interface Task {
  _id: string;
  number?: number;
  project: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type TaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
};

export interface TaskFilters {
  status: TaskStatus | "";
  sortBy: "createdAt" | "dueDate" | "status";
  order: "asc" | "desc";
}

export interface DashboardTask {
  _id: string;
  title: string;
  number: number | null;
  status: TaskStatus;
  dueDate: string | null;
  updatedAt: string;
  projectId: string;
  projectKey: string | null;
  projectTitle: string;
}

export interface DashboardData {
  today: string;
  totals: { projects: number; tasks: number; todo: number; inProgress: number; done: number; overdue: number; dueThisWeek: number };
  byProject: { _id: string; title: string; key: string | null; todo: number; inProgress: number; done: number; total: number }[];
  upcoming: DashboardTask[];
  recent: DashboardTask[];
  activity: { date: string; created: number; completed: number }[];
}
