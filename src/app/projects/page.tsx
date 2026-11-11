"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store";
import { deleteProject, fetchProjects } from "@/store/projectsSlice";
import ProjectForm from "@/components/ProjectForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import Dropdown from "@/components/Dropdown";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { projectHue } from "@/lib/utils";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { items, loading, error } = useAppSelector((s) => s.projects);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? items.filter((p) => p.title.toLowerCase().includes(needle) || (p.key ?? "").toLowerCase().includes(needle)) : items;
  }, [items, q]);

  return (
    <>
      <div className="page-title-row">
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          Create project
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" aria-label="Search projects" />
        </div>
      </div>

      {error && (
        <div className="error">
          <Icon name="alert" size={16} /> {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="table-wrap">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-line">
              <span className="skeleton" style={{ width: 28, height: 28 }} />
              <span className="skeleton" style={{ width: "30%", height: 14 }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="empty">
          <span className="empty-icon">
            <Icon name="folder" size={28} />
          </span>
          <h3>Create your first project</h3>
          <p className="muted">Projects hold your tasks. Give it a name and a key like WEB to get started.</p>
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            Create project
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="jtable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th className="hide-md">Description</th>
                <th>Progress</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const pct = p.taskCount ? Math.round((p.doneCount / p.taskCount) * 100) : 0;
                return (
                  <tr key={p._id} style={{ ["--hue" as string]: projectHue(p._id) }}>
                    <td>
                      <Link href={`/projects/${p._id}`} className="name-cell">
                        <span className="project-badge sm">{p.title.charAt(0).toUpperCase()}</span>
                        <span>{p.title}</span>
                      </Link>
                    </td>
                    <td className="muted">{p.key ?? "—"}</td>
                    <td className="muted hide-md ellipsis-cell">{p.description || "—"}</td>
                    <td>
                      <div className="mini-progress">
                        <div className="progress">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <span className="small muted">
                          {p.doneCount}/{p.taskCount} done
                        </span>
                      </div>
                    </td>
                    <td className="actions-cell">
                      <Dropdown label={`Actions for ${p.title}`} trigger={<Icon name="more" />}>
                        <button className="menu-item" role="menuitem" onClick={() => setEditing(p)}>
                          <Icon name="edit" size={16} /> Edit project
                        </button>
                        <button className="menu-item danger" role="menuitem" onClick={() => setDeleting(p)}>
                          <Icon name="trash" size={16} /> Delete project
                        </button>
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="center muted pad">
                    No projects match “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ProjectForm project={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.title}?`}
          message="The project and all of its tasks will be permanently deleted. This can't be undone."
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const r = await dispatch(deleteProject(deleting._id));
            toast(r.meta.requestStatus === "fulfilled" ? "Project deleted" : "Could not delete project", r.meta.requestStatus === "fulfilled" ? "success" : "error");
          }}
        />
      )}
    </>
  );
}
