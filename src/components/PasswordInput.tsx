"use client";

import { useState } from "react";
import Icon from "./Icon";
import { PASSWORD_RULES, passwordStrength } from "@/lib/passwordPolicy";

export default function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder,
  id,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-field">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
      />
      <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} tabIndex={0}>
        <Icon name={show ? "eyeOff" : "eye"} size={18} />
      </button>
    </div>
  );
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"];

/** Strength bar + live checklist of the password rules enforced by the API. */
export function PasswordStrength({ password }: { password: string }) {
  const score = passwordStrength(password);
  return (
    <div className="pw-meter" aria-live="polite">
      <div className="pw-bars" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={i <= score ? `on s${score}` : ""} />
        ))}
      </div>
      <div className="pw-score small muted">{password ? `Password strength: ${LABELS[score]}` : "Use 8+ characters with letters and numbers"}</div>
      <ul className="pw-rules">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={ok ? "ok" : ""}>
              <Icon name={ok ? "checkCircle" : "clock"} size={14} /> {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
