import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { send, http } from "@/lib/client";
import type { Task, TaskFilters, TaskInput, TaskStatus } from "@/types";

type Counts = Record<TaskStatus, number>;

interface TasksState {
  items: Task[];
  counts: Counts;
  filters: TaskFilters;
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  counts: { todo: 0, "in-progress": 0, done: 0 },
  filters: { status: "", sortBy: "createdAt", order: "desc" },
  loading: false,
  error: null,
};

export const fetchTasks = createAsyncThunk(
  "tasks/fetch",
  async (projectId: string, { getState }) => {
    const { filters } = (getState() as { tasks: TasksState }).tasks;
    const qs = new URLSearchParams({ sortBy: filters.sortBy, order: filters.order });
    if (filters.status) qs.set("status", filters.status);
    return await http<{ tasks: Task[]; counts: Counts }>(`/api/projects/${projectId}/tasks?${qs}`);
  }
);

export const createTask = createAsyncThunk(
  "tasks/create",
  async ({ projectId, data }: { projectId: string; data: TaskInput }, { dispatch }) => {
    const { task } = await send<{ task: Task }>("POST", `/api/projects/${projectId}/tasks`, data);
    await dispatch(fetchTasks(projectId)); // re-fetch so filter/sort stay consistent
    return task;
  }
);

export const updateTask = createAsyncThunk(
  "tasks/update",
  async ({ id, data }: { id: string; data: Partial<TaskInput> }, { dispatch }) => {
    const { task } = await send<{ task: Task }>("PUT", `/api/tasks/${id}`, data);
    await dispatch(fetchTasks(task.project));
    return task;
  }
);

/** Drag & drop / quick status change: optimistic (see reducers); callers re-sync with fetchTasks. */
export const moveTask = createAsyncThunk("tasks/move", async ({ id, status }: { id: string; status: TaskStatus }) => {
  await send("PUT", `/api/tasks/${id}`, { status });
});

export const deleteTask = createAsyncThunk("tasks/delete", async (id: string) => {
  await send("DELETE", `/api/tasks/${id}`);
  return id;
});

const slice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    setFilters: (s, a: PayloadAction<Partial<TaskFilters>>) => {
      s.filters = { ...s.filters, ...a.payload };
    },
    clearTasks: (s) => {
      s.items = [];
      s.counts = { todo: 0, "in-progress": 0, done: 0 };
      s.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchTasks.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchTasks.fulfilled, (s, a) => {
      s.loading = false;
      s.items = a.payload.tasks;
      s.counts = a.payload.counts;
    });
    b.addCase(fetchTasks.rejected, (s, a) => {
      s.loading = false;
      s.error = a.error.message ?? "Failed to load tasks";
    });
    b.addCase(moveTask.pending, (s, a) => {
      const t = s.items.find((x) => x._id === a.meta.arg.id);
      if (t && t.status !== a.meta.arg.status) {
        s.counts[t.status]--;
        s.counts[a.meta.arg.status]++;
        t.status = a.meta.arg.status;
      }
    });
    b.addCase(deleteTask.fulfilled, (s, a) => {
      s.items = s.items.filter((t) => t._id !== a.payload);
    });
  },
});

export const { setFilters, clearTasks } = slice.actions;
export default slice.reducer;
