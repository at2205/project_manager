"use client";

import { FormEvent, useState } from "react";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { useAppDispatch } from "@/store";
import { createProject, updateProject } from "@/store/projectsSlice";
import { suggestKey } from "@/lib/projectKey";
import type { Project } from "@/types";

export default function ProjectForm({ project, onClose }: { project?: Project; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [key, setKey] = useState(project?.key ?? "");
  const [keyTouched, setKeyTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = project
      ? await dispatch(updateProject({ id: project._id, title, description }))
      : await dispatch(createProject({ title, description, key: key || undefined }));
    setSaving(false);
    if (res.meta.requestStatus === "fulfilled") {
      toast(project ? "Project updated" : "Project created");
      onClose();
    } else setError((res as { error: { message?: string } }).error.message ?? "Failed to save");
  }

  return (
    <Modal title={project ? "Edit project" : "Create project"} subtitle="Required fields are marked with an asterisk *" onClose={onClose}>
      <form onSubmit={onSubmit} className="form">
        <label>
          Name *
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!project && !keyTouched) setKey(e.target.value.trim() ? suggestKey(e.target.value) : "");
            }}
            required
            maxLength={120}
            autoFocus
            placeholder="e.g. Website redesign"
          />
        </label>
        <label>
          Key *
          <input
            value={key}
            onChange={(e) => {
              setKeyTouched(true);
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            }}
            disabled={!!project}
            maxLength={10}
            required={!project}
            placeholder="e.g. WEB"
          />
          <span className="hint">{project ? "The project key can't be changed." : "Used as a prefix for task keys, e.g. WEB-1."}</span>
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000} placeholder="What is this project about?" />
        </label>
        {error && <div className="error">{error}</div>}
        <div className="actions">
          <button type="button" className="btn btn-subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : project ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
