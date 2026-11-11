import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { send, http } from "@/lib/client";
import type { Project } from "@/types";

interface ProjectsState {
  items: Project[];
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = { items: [], loading: false, error: null };

type ProjectInput = { title: string; description: string };
type ProjectCreateInput = ProjectInput & { key?: string };

export const fetchProjects = createAsyncThunk(
  "projects/fetch",
  async () => (await http<{ projects: Project[] }>("/api/projects")).projects
);

export const createProject = createAsyncThunk(
  "projects/create",
  async (b: ProjectCreateInput) => (await send<{ project: Project }>("POST", "/api/projects", b)).project
);

export const updateProject = createAsyncThunk(
  "projects/update",
  async ({ id, ...b }: ProjectInput & { id: string }) =>
    (await send<{ project: Project }>("PUT", `/api/projects/${id}`, b)).project
);

export const deleteProject = createAsyncThunk("projects/delete", async (id: string) => {
  await send("DELETE", `/api/projects/${id}`);
  return id;
});

const slice = createSlice({
  name: "projects",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProjects.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchProjects.fulfilled, (s, a) => {
      s.loading = false;
      s.items = a.payload;
    });
    b.addCase(fetchProjects.rejected, (s, a) => {
      s.loading = false;
      s.error = a.error.message ?? "Failed to load projects";
    });
    b.addCase(createProject.fulfilled, (s, a) => {
      s.items.unshift(a.payload);
    });
    b.addCase(updateProject.fulfilled, (s, a) => {
      const i = s.items.findIndex((p) => p._id === a.payload._id);
      // keep the counts, which the PUT response doesn't carry
      if (i >= 0) s.items[i] = { ...s.items[i], ...a.payload, taskCount: s.items[i].taskCount, doneCount: s.items[i].doneCount };
    });
    b.addCase(deleteProject.fulfilled, (s, a) => {
      s.items = s.items.filter((p) => p._id !== a.payload);
    });
  },
});

export default slice.reducer;
