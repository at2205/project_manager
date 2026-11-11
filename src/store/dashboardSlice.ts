import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "@/lib/client";
import type { DashboardData } from "@/types";

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

export const fetchDashboard = createAsyncThunk("dashboard/fetch", async () => {
  const now = new Date();
  // send the browser's local "today" and offset so overdue / daily buckets match the user's calendar
  const qs = new URLSearchParams({ today: now.toLocaleDateString("en-CA"), tz: String(now.getTimezoneOffset()) });
  return http<DashboardData>(`/api/dashboard?${qs}`);
});

const slice = createSlice({
  name: "dashboard",
  initialState: { data: null, loading: false, error: null } as DashboardState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDashboard.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    // a refetch keeps the previous data on screen (no skeleton flash)
    b.addCase(fetchDashboard.fulfilled, (s, a) => {
      s.loading = false;
      s.data = a.payload;
    });
    b.addCase(fetchDashboard.rejected, (s, a) => {
      s.loading = false;
      s.error = a.error.message ?? "Failed to load dashboard";
    });
  },
});

export default slice.reducer;
