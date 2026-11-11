"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "@/store";
import { fetchMe } from "@/store/authSlice";
import AppShell from "./AppShell";
import { ToastProvider } from "./Toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  const ref = useRef<AppStore>();
  if (!ref.current) ref.current = makeStore();
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    ref.current!.dispatch(fetchMe());
  }, []);

  return (
    <Provider store={ref.current}>
      <ToastProvider>{isAuthPage ? children : <AppShell>{children}</AppShell>}</ToastProvider>
    </Provider>
  );
}
