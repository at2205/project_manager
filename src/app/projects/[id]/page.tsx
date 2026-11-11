"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearTasks, fetchTasks, moveTask, createTask, setFilters } from "@/store/tasksSlice";
import { http } from "@/lib/client";
import { STATUSES, STATUS_LABEL } from "@/lib/status";
import { formatDue, initials, isOverdue, projectHue, taskKey } from "@/lib/utils";
import IssueDetail from "@/components/IssueDetail";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { useUI } from "@/components/AppShell";
import type { Project, Task, TaskFilters, TaskStatus } from "@/types";

type SortCol = TaskFilters["sortBy"];

function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const view = useSearchParams().get("view") === "list" ? "list" : "board";
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { openCreate } = useUI();
  const { items, counts, filters, loading, error } = useAppSelector((s) => s.tasks);
  const user = useAppSelector((s) => s.auth.user);
  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setProject(null);
    http<{ project: Project }>(`/api/projects/${id}`)
      .then((r) => setProject(r.project))
      .catch((e) => setProjectError(e.message));
    return () => void dispatch(clearTasks());
  }, [id, dispatch]);

  // Re-fetch whenever the filter / sort changes (server-side filtering & sorting).
  useEffect(() => {
    dispatch(fetchTasks(id));
  }, [id, filters, dispatch]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((t) => t.title.toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle) || taskKey(project, t).toLowerCase().includes(needle));
  }, [items, q, project]);

  // Close the issue view if its task disappears (e.g. filtered out or deleted elsewhere).
  useEffect(() => {
    if (openId && !loading && !items.some((t) => t._id === openId)) setOpenId(null);
  }, [openId, loading, items]);

  if (projectError)
    return (
      <>
        <div className="error">
          <Icon name="alert" size={16} /> {projectError}
        </div>
        <Link href="/projects">← Back to projects</Link>
      </>
    );

  const total = counts.todo + counts["in-progress"] + counts.done;
  const hue = project ? projectHue(project._id) : 250;

  async function move(taskId: string, status: TaskStatus) {
    const t = items.find((x) => x._id === taskId);
    if (!t || t.status === status) return;
    const r = await dispatch(moveTask({ id: taskId, status }));
    if (r.meta.requestStatus !== "fulfilled") toast("Could not move task", "error");
    dispatch(fetchTasks(id)); // re-sync order / filter / counts with the server
  }

  async function quickCreate(status: TaskStatus) {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    const r = await dispatch(createTask({ projectId: id, data: { title, description: "", status, dueDate: null } }));
    if (r.meta.requestStatus === "fulfilled") toast(`${taskKey(project, (r as unknown as { payload: Task }).payload)} created`);
    else toast("Could not create task", "error");
  }

  function sortBy(col: SortCol) {
    dispatch(setFilters(filters.sortBy === col ? { order: filters.order === "asc" ? "desc" : "asc" } : { sortBy: col, order: "asc" }));
  }

  function QuickCreateBox({ status }: { status: TaskStatus }) {
    return (
      <div className="quick-create">
        <input
          autoFocus
          value={draft}
          maxLength={160}
          placeholder="What needs to be done?"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") quickCreate(status);
            if (e.key === "Escape") {
              setCreating(null);
              setDraft("");
            }
          }}
        />
        <div className="quick-hint small muted">Press Enter to create · Esc to cancel</div>
      </div>
    );
  }

  function renderCard(t: Task) {
    const overdue = isOverdue(t);
    return (
      <div
        key={t._id}
        className={`jcard ${dragId === t._id ? "dragging" : ""}`}
        draggable
        tabIndex={0}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", t._id);
          e.dataTransfer.effectAllowed = "move";
          setDragId(t._id);
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverCol(null);
        }}
        onClick={() => setOpenId(t._id)}
        onKeyDown={(e) => e.key === "Enter" && setOpenId(t._id)}
      >
        <div className="jcard-title">{t.title}</div>
        {t.dueDate && (
          <span className={`due-chip ${overdue ? "overdue" : ""}`} title={overdue ? "Overdue" : "Due date"}>
            <Icon name="calendar" size={12} /> {formatDue(t.dueDate)}
          </span>
        )}
        <div className="jcard-foot">
          <span className="type-icon">
            <Icon name="task" size={12} />
          </span>
          <span className={`issue-key ${t.status === "done" ? "struck" : ""}`}>{taskKey(project, t)}</span>
          <span className="avatar xs push" title={user?.name}>
            {initials(user?.name)}
          </span>
        </div>
      </div>
    );
  }

  const columns = filters.status ? [filters.status] : STATUSES;

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/projects">Projects</Link>
        <span>/</span>
        <span>{project?.title ?? "…"}</span>
      </nav>

      <div className="page-title-row">
        <h1>{view === "board" ? "Board" : "List"}</h1>
        <div className="title-meta muted small" style={{ ["--hue" as string]: hue }}>
          {project && <span>{project.key}</span>}
        </div>
      </div>

      <div className="tabs-line" role="tablist">
        <Link role="tab" aria-selected={view === "board"} className={view === "board" ? "active" : ""} href={`/projects/${id}?view=board`}>
          <Icon name="board" size={16} /> Board
        </Link>
        <Link role="tab" aria-selected={view === "list"} className={view === "list" ? "active" : ""} href={`/projects/${id}?view=list`}>
          <Icon name="list" size={16} /> List
        </Link>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this project" aria-label="Search tasks" />
        </div>

        <div className="chips" role="group" aria-label="Filter by status">
          <button className={`chip ${filters.status === "" ? "active" : ""}`} aria-pressed={filters.status === ""} onClick={() => dispatch(setFilters({ status: "" }))}>
            All <span className="count">{total}</span>
          </button>
          {STATUSES.map((s) => (
            <button key={s} className={`chip ${filters.status === s ? "active" : ""}`} aria-pressed={filters.status === s} onClick={() => dispatch(setFilters({ status: filters.status === s ? "" : s }))}>
              {STATUS_LABEL[s]} <span className="count">{counts[s]}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-right">
          <label className="inline-select">
            <span className="muted small">Sort</span>
            <select value={filters.sortBy} onChange={(e) => dispatch(setFilters({ sortBy: e.target.value as SortCol }))}>
              <option value="createdAt">Created</option>
              <option value="dueDate">Due date</option>
              <option value="status">Status</option>
            </select>
          </label>
          <button
            className="btn btn-subtle btn-sm"
            onClick={() => dispatch(setFilters({ order: filters.order === "asc" ? "desc" : "asc" }))}
            aria-label={`Order: ${filters.order === "asc" ? "ascending" : "descending"}`}
            title={filters.order === "asc" ? "Ascending" : "Descending"}
          >
            <Icon name={filters.order === "asc" ? "arrowUp" : "arrowDown"} size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          <Icon name="alert" size={16} /> {error}
        </div>
      )}

      {view === "board" && (
        <div className={`board cols-${columns.length}`}>
          {columns.map((s) => {
            const col = visible.filter((t) => t.status === s);
            return (
              <section
                key={s}
                className={`column ${overCol === s ? "over" : ""}`}
                aria-label={STATUS_LABEL[s]}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overCol !== s) setOverCol(s);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const tid = e.dataTransfer.getData("text/plain") || dragId;
                  setOverCol(null);
                  setDragId(null);
                  if (tid) move(tid, s);
                }}
              >
                <header className="column-head">
                  <span>{STATUS_LABEL[s]}</span>
                  <span className="col-count">{col.length}</span>
                </header>
                <div className="column-body">
                  {loading && items.length === 0 && <div className="skeleton" style={{ height: 70 }} />}
                  {col.map(renderCard)}
                  {creating === s && QuickCreateBox({ status: s })}
                </div>
                {creating !== s && (
                  <button
                    className="column-create"
                    onClick={() => {
                      setCreating(s);
                      setDraft("");
                    }}
                  >
                    <Icon name="plus" size={16} /> Create
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="table-wrap">
          <table className="jtable">
            <thead>
              <tr>
                {([["createdAt", "Key"], [null, "Summary"], ["status", "Status"], ["dueDate", "Due date"]] as [SortCol | null, string][]).map(([col, label]) => (
                  <th key={label} aria-sort={col && filters.sortBy === col ? (filters.order === "asc" ? "ascending" : "descending") : undefined}>
                    {col ? (
                      <button className="th-sort" onClick={() => sortBy(col)}>
                        {label}
                        {filters.sortBy === col && <Icon name={filters.order === "asc" ? "arrowUp" : "arrowDown"} size={13} />}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                ))}
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t._id} className="clickable" onClick={() => setOpenId(t._id)}>
                  <td className="nowrap">
                    <span className="type-icon">
                      <Icon name="task" size={12} />
                    </span>{" "}
                    <span className={`issue-key ${t.status === "done" ? "struck" : ""}`}>{taskKey(project, t)}</span>
                  </td>
                  <td className={t.status === "done" ? "struck-text" : ""}>{t.title}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select className={`lozenge-select ${t.status}`} value={t.status} onChange={(e) => move(t._id, e.target.value as TaskStatus)} aria-label={`Status of ${t.title}`}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s].toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`nowrap ${isOverdue(t) ? "overdue-text" : "muted"}`}>{t.dueDate ? formatDue(t.dueDate) : "—"}</td>
                  <td>
                    <span className="avatar xs" title={user?.name}>
                      {initials(user?.name)}
                    </span>
                  </td>
                </tr>
              ))}
              {creating === "todo" && (
                <tr>
                  <td colSpan={5}>{QuickCreateBox({ status: "todo" })}</td>
                </tr>
              )}
              {!loading && visible.length === 0 && creating !== "todo" && (
                <tr>
                  <td colSpan={5} className="center muted pad">
                    {q || filters.status ? "No tasks match your filters." : "No tasks yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {creating !== "todo" && (
            <button
              className="column-create"
              onClick={() => {
                setCreating("todo");
                setDraft("");
              }}
            >
              <Icon name="plus" size={16} /> Create
            </button>
          )}
        </div>
      )}

      {!loading && !error && total === 0 && (
        <div className="empty">
          <span className="empty-icon">
            <Icon name="checkCircle" size={28} />
          </span>
          <h3>No tasks in this project yet</h3>
          <p className="muted">Create your first task to start filling the board.</p>
          <button className="btn btn-primary" onClick={() => openCreate({ projectId: id })}>
            Create task
          </button>
        </div>
      )}

      {openId && <IssueDetail taskId={openId} project={project} onClose={() => setOpenId(null)} />}
    </>
  );
}

export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectView />
    </Suspense>
  );
}
