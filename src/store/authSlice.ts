import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { send, http } from "@/lib/client";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  /** `loading` until the initial /me check has completed */
  ready: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: AuthState = { user: null, ready: false, submitting: false, error: null };

export const fetchMe = createAsyncThunk("auth/me", async () => (await http<{ user: User }>("/api/auth/me")).user);

export const login = createAsyncThunk("auth/login", async (b: { email: string; password: string }) =>
  (await send<{ user: User }>("POST", "/api/auth/login", b)).user
);

export const signup = createAsyncThunk("auth/signup", async (b: { name: string; email: string; password: string }) =>
  (await send<{ user: User }>("POST", "/api/auth/signup", b)).user
);

export const logout = createAsyncThunk("auth/logout", async () => {
  await send("POST", "/api/auth/logout");
});

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: { clearAuthError: (s) => void (s.error = null) },
  extraReducers: (b) => {
    b.addCase(fetchMe.fulfilled, (s, a) => {
      s.user = a.payload;
      s.ready = true;
    });
    b.addCase(fetchMe.rejected, (s) => {
      s.user = null;
      s.ready = true;
    });
    for (const t of [login, signup]) {
      b.addCase(t.pending, (s) => {
        s.submitting = true;
        s.error = null;
      });
      b.addCase(t.fulfilled, (s, a) => {
        s.submitting = false;
        s.user = a.payload;
      });
      b.addCase(t.rejected, (s, a) => {
        s.submitting = false;
        s.error = a.error.message ?? "Something went wrong";
      });
    }
    b.addCase(logout.fulfilled, (s) => {
      s.user = null;
    });
  },
});

export const { clearAuthError } = slice.actions;
export default slice.reducer;
