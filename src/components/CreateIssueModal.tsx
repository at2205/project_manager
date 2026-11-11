"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { useAppDispatch, useAppSelector } from "@/store";
import { createTask } from "@/store/tasksSlice";
import { STATUSES, STATUS_LABEL } from "@/lib/status";
import { taskKey } from "@/lib/utils";
import type { TaskStatus } from "@/types";

/** Jira-style "Create issue" dialog (project, summary, description, status, due date). */
export default function CreateIssueModal({ projectId: initialProject, status: initialStatus = "todo", onClose }: { projectId?: string; status?: TaskStatus; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const projects = useAppSelector((s) => s.projects.items);
  const [projectId, setProjectId] = useState(initialProject ?? projects[0]?._id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [dueDate, setDueDate] = useState("");
  const [another, setAnother] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await dispatch(createTask({ projectId, data: { title, description, status, dueDate: dueDate || null } }));
    setSaving(false);
    if (res.meta.requestStatus !== "fulfilled") {
      return setError((res as { error: { message?: string } }).error.message ?? "Failed to create task");
    }
    const task = (res as { payload: { number?: number; _id: string } }).payload;
    toast(`${taskKey(projects.find((p) => p._id === projectId), task)} created`);
    const here = pathname === `/projects/${projectId}`;
    if (another && here) {
      setTitle("");
      setDescription("");
      return;
    }
    onClose();
    if (!here) router.push(`/projects/${projectId}`);
  }

  return (
    <Modal title="Create task" subtitle="Required fields are marked with an asterisk *" onClose={onClose} size="lg">
      <form onSubmit={onSubmit} className="form">
        <div className="row">
          <label>
            Project *
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} ({p.key ?? "—"})
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Summary *
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} autoFocus placeholder="What needs to be done?" />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} placeholder="Add more detail…" />
        </label>
        <label className="narrow">
          Due date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <div className="actions spread">
          <label className="check-inline">
            <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} /> Create another
          </label>
          <div className="actions">
            <button type="button" className="btn btn-subtle" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={saving || !projectId}>
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
