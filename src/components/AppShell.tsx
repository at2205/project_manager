"use client";

import { createContext, Suspense, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { logout } from "@/store/authSlice";
import { fetchProjects } from "@/store/projectsSlice";
import Icon, { Logo } from "./Icon";
import Dropdown from "./Dropdown";
import CreateIssueModal from "./CreateIssueModal";
import ProjectForm from "./ProjectForm";
import { initials, projectHue } from "@/lib/utils";
import type { TaskStatus } from "@/types";

interface UI {
  openCreate: (opts?: { projectId?: string; status?: TaskStatus }) => void;
}
const UIContext = createContext<UI>({ openCreate: () => {} });
export const useUI = () => useContext(UIContext);

function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const view = useSearchParams().get("view") === "list" ? "list" : "board";
  const projects = useAppSelector((s) => s.projects.items);
  const currentId = pathname.startsWith("/projects/") ? pathname.split("/")[2] : null;
  const current = projects.find((p) => p._id === currentId);

  return (
    <nav className={`sidebar ${open ? "open" : ""}`} aria-label="Sidebar" onClick={onNavigate}>
      <Link href="/dashboard" className={`sb-item ${pathname === "/dashboard" ? "active" : ""}`}>
        <Icon name="trending" size={18} /> Dashboard
      </Link>
      <Link href="/projects" className={`sb-item ${pathname === "/projects" ? "active" : ""}`}>
        <Icon name="grid" size={18} /> All projects
      </Link>

      {currentId && (
        <>
          <div className="sb-project" style={{ ["--hue" as string]: projectHue(currentId) }}>
            <span className="project-badge">{(current?.title ?? "·").charAt(0).toUpperCase()}</span>
            <div className="sb-project-meta">
              <strong>{current?.title ?? "Project"}</strong>
              <span className="muted small">{current?.key ?? ""}</span>
            </div>
          </div>
          <div className="sb-label">Planning</div>
          <Link href={`/projects/${currentId}?view=board`} className={`sb-item ${view === "board" ? "active" : ""}`}>
            <Icon name="board" size={18} /> Board
          </Link>
          <Link href={`/projects/${currentId}?view=list`} className={`sb-item ${view === "list" ? "active" : ""}`}>
            <Icon name="list" size={18} /> List
          </Link>
        </>
      )}

      <div className="sb-label">Recent projects</div>
      {projects.length === 0 && <div className="sb-empty small muted">No projects yet</div>}
      {projects.slice(0, 8).map((p) => (
        <Link key={p._id} href={`/projects/${p._id}`} className={`sb-item ${p._id === currentId ? "current" : ""}`} style={{ ["--hue" as string]: projectHue(p._id) }}>
          <span className="project-badge sm">{p.title.charAt(0).toUpperCase()}</span>
          <span className="sb-ellipsis">{p.title}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [create, setCreate] = useState<{ projectId?: string; status?: TaskStatus } | null>(null);
  const [newProject, setNewProject] = useState(false);
  const projectCount = useAppSelector((s) => s.projects.items.length);

  useEffect(() => {
    if (user) dispatch(fetchProjects());
  }, [user, dispatch]);

  useEffect(() => setSidebarOpen(false), [pathname]);

  const ui = useMemo<UI>(() => ({ openCreate: (opts) => setCreate(opts ?? {}) }), []);

  async function onLogout() {
    await dispatch(logout());
    router.replace("/login");
    router.refresh();
  }

  return (
    <UIContext.Provider value={ui}>
      <header className="topbar">
        <button className="icon-btn menu-btn" aria-label="Toggle sidebar" onClick={() => setSidebarOpen((o) => !o)}>
          <Icon name="menu" />
        </button>
        <Link href="/dashboard" className="brand">
          <Logo size={28} />
          <span>MiniPM</span>
        </Link>
        <button className="btn btn-primary btn-sm create-btn" onClick={() => (projectCount ? setCreate({}) : setNewProject(true))}>
          <Icon name="plus" size={16} /> Create
        </button>
        <div className="topbar-right">
          {user && (
            <Dropdown
              label="Account menu"
              trigger={<span className="avatar">{initials(user.name)}</span>}
            >
              <div className="menu-head">
                <span className="avatar">{initials(user.name)}</span>
                <div>
                  <strong>{user.name}</strong>
                  <div className="muted small">{user.email}</div>
                </div>
              </div>
              <button className="menu-item" role="menuitem" onClick={onLogout}>
                <Icon name="logout" size={16} /> Log out
              </button>
            </Dropdown>
          )}
        </div>
      </header>

      <div className="shell">
        <Suspense fallback={<nav className="sidebar" />}>
          <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        </Suspense>
        {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
        <main className="content">{children}</main>
      </div>

      {create && <CreateIssueModal projectId={create.projectId} status={create.status} onClose={() => setCreate(null)} />}
      {newProject && <ProjectForm onClose={() => setNewProject(false)} />}
    </UIContext.Provider>
  );
}
