"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearAuthError, login, signup } from "@/store/authSlice";
import Icon, { Logo } from "./Icon";
import AuthShowcase from "./AuthShowcase";
import PasswordInput, { PasswordStrength } from "./PasswordInput";
import { passwordIssues } from "@/lib/passwordPolicy";

function Form({ mode }: { mode: "login" | "signup" }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useSearchParams();
  const { submitting, error } = useAppSelector((s) => s.auth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const isLogin = mode === "login";

  useEffect(() => {
    dispatch(clearAuthError());
    setLocalError(null);
  }, [dispatch, mode]);

  // a validation message is stale as soon as the user edits the password fields
  useEffect(() => setLocalError(null), [password, confirm]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!isLogin) {
      const issues = passwordIssues(password);
      if (issues.length) return setLocalError(issues[0]);
      if (password !== confirm) return setLocalError("Passwords do not match");
    }
    const res = await dispatch(isLogin ? login({ email, password }) : signup({ name, email, password }));
    if (res.meta.requestStatus === "fulfilled") {
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    }
  }

  const shownError = localError ?? error;

  return (
    <div className="auth">
      <aside className="auth-showcase" aria-hidden="true">
        <AuthShowcase />
      </aside>
      <section className="auth-panel">
      <div className="auth-card">
        <div className="auth-logo">
          <Logo size={40} />
          <span className="auth-product">MiniPM</span>
        </div>
        <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-sub">{isLogin ? "Log in to pick up where you left off." : "Start planning your first project in under a minute."}</p>

        <form onSubmit={onSubmit} className="form" noValidate={false}>
          {!isLogin && (
            <label>
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Jane Doe" maxLength={80} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" />
          </label>
          <label>
            Password
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "Enter password" : "Create a password"}
            />
          </label>
          {!isLogin && <PasswordStrength password={password} />}
          {!isLogin && (
            <label>
              Confirm password
              <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" placeholder="Re-enter password" invalid={!!confirm && confirm !== password} />
              {confirm && confirm !== password && <span className="field-error">Passwords do not match</span>}
            </label>
          )}
          {shownError && (
            <div className="error" role="alert">
              <Icon name="alert" size={16} /> {shownError}
            </div>
          )}
          <button className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {submitting ? "Please wait…" : isLogin ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="auth-divider" />
        <p className="center small">
          {isLogin ? (
            <>
              Can&apos;t log in? <Link href="/signup">Create an account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link href="/login">Log in</Link>
            </>
          )}
        </p>
      </div>
      </section>
    </div>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  return (
    <Suspense>
      <Form mode={mode} />
    </Suspense>
  );
}
