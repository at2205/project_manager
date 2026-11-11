import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import auth from "./authSlice";
import projects from "./projectsSlice";
import tasks from "./tasksSlice";
import dashboard from "./dashboardSlice";

export const makeStore = () => configureStore({ reducer: { auth, projects, tasks, dashboard } });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
