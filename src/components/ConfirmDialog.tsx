"use client";

import { useState } from "react";
import Modal from "./Modal";
import Icon from "./Icon";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown> | unknown;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  }

  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="confirm">
        <span className="confirm-icon">
          <Icon name="alert" size={22} />
        </span>
        <p>{message}</p>
      </div>
      <div className="actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-danger-solid" onClick={run} disabled={busy} autoFocus>
          {busy ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
