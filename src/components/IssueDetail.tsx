"use client";

import { useState } from "react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import Icon from "./Icon";
import { useToast } from "./Toast";
import { useAppDispatch, useAppSelector } from "@/store";
import { deleteTask, fetchTasks, updateTask } from "@/store/tasksSlice";
import { STATUSES, STATUS_LABEL } from "@/lib/status";
import { formatDateTime, initials, isOverdue, taskKey } from "@/lib/utils";
import type { Project, TaskInput, TaskStatus } from "@/types";

/** Jira-style issue view: editable summary & description on the left, details on the right. */
export default function IssueDetail({ taskId, project, onClose }: { taskId: string; project: Project | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const task = useAppSelector((s) => s.tasks.items.find((t) => t._id === taskId));
  const user = useAppSelector((s) => s.auth.user);
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!task) return null; // e.g. filtered out after a change — nothing to show

  async function save(data: Partial<TaskInput>) {
    const r = await dispatch(updateTask({ id: taskId, data }));
    if (r.meta.requestStatus !== "fulfilled") toast((r as { error: { message?: string } }).error.message ?? "Could not save", "error");
    return r.meta.requestStatus === "fulfilled";
  }

  const key = taskKey(project, task);
  const overdue = isOverdue(task);

  return (
    <>
      <Modal title={key} onClose={onClose} size="lg">
        <div className="issue">
          <div className="issue-main">
            {editTitle === null ? (
              <h1 className="issue-title" tabIndex={0} onClick={() => setEditTitle(task.title)} onKeyDown={(e) => e.key === "Enter" && setEditTitle(task.title)} title="Click to edit">
                {task.title}
              </h1>
            ) : (
              <input
                className="issue-title-input"
                value={editTitle}
                autoFocus
                maxLength={160}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={async () => {
                  const v = editTitle.trim();
                  if (v && v !== task.title) await save({ title: v });
                  setEditTitle(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setEditTitle(null);
                  }
                }}
              />
            )}

            <h3 className="issue-label">Description</h3>
            {editDesc === null ? (
              <div className={`issue-desc ${task.description ? "" : "empty-desc"}`} tabIndex={0} onClick={() => setEditDesc(task.description)} onKeyDown={(e) => e.key === "Enter" && setEditDesc(task.description)}>
                {task.description || "Add a description…"}
              </div>
            ) : (
              <div>
                <textarea value={editDesc} rows={6} autoFocus maxLength={2000} onChange={(e) => setEditDesc(e.target.value)} />
                <div className="actions left">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={async () => {
                      if (await save({ description: editDesc })) setEditDesc(null);
                    }}
                  >
                    Save
                  </button>
                  <button className="btn btn-subtle btn-sm" onClick={() => setEditDesc(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="issue-side">
            <label className="issue-field">
              <span className="issue-label">Status</span>
              <select className={`lozenge-select ${task.status}`} value={task.status} onChange={(e) => save({ status: e.target.value as TaskStatus })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s].toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <div className="details">
              <h3>Details</h3>
              <dl>
                <dt>Assignee</dt>
                <dd>
                  <span className="avatar xs">{initials(user?.name)}</span> {user?.name ?? "—"}
                </dd>
                <dt>Reporter</dt>
                <dd>
                  <span className="avatar xs">{initials(user?.name)}</span> {user?.name ?? "—"}
                </dd>
                <dt>Due date</dt>
                <dd>
                  <input
                    type="date"
                    className={`date-input ${overdue ? "overdue" : ""}`}
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                    onChange={(e) => save({ dueDate: e.target.value || null })}
                  />
                  {overdue && <span className="overdue-note">Overdue</span>}
                </dd>
                <dt>Project</dt>
                <dd>{project?.title ?? "—"}</dd>
              </dl>
            </div>
            <div className="issue-dates small muted">
              <div>Created {formatDateTime(task.createdAt)}</div>
              {task.updatedAt && <div>Updated {formatDateTime(task.updatedAt)}</div>}
            </div>
            <button className="btn btn-subtle-danger btn-sm" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={15} /> Delete task
            </button>
          </aside>
        </div>
      </Modal>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${key}?`}
          message="You're about to permanently delete this task. This can't be undone."
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            const r = await dispatch(deleteTask(taskId));
            if (r.meta.requestStatus === "fulfilled") {
              toast(`${key} deleted`);
              dispatch(fetchTasks(task.project));
              onClose();
            } else toast("Could not delete task", "error");
          }}
        />
      )}
    </>
  );
}
