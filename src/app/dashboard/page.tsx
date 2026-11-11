"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchDashboard } from "@/store/dashboardSlice";
import { fetchProjects } from "@/store/projectsSlice";
import Icon, { IconName } from "@/components/Icon";
import { useUI } from "@/components/AppShell";
import ProjectForm from "@/components/ProjectForm";
import StatusDonut from "@/components/charts/StatusDonut";
import ActivityChart from "@/components/charts/ActivityChart";
import ProjectProgress from "@/components/charts/ProjectProgress";
import { STATUS_LABEL } from "@/lib/status";
import { formatDue, relativeTime } from "@/lib/utils";
import type { DashboardTask } from "@/types";

function Stat({ icon, label, value, hint, tone }: { icon: IconName; label: string; value: number; hint: string; tone: string }) {
  return (
    <div className="card stat">
      <span className={`stat-icon tone-${tone}`}>
        <Icon name={icon} size={20} />
      </span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-hint small muted">{hint}</div>
      </div>
    </div>
  );
}

const keyOf = (t: DashboardTask) => `${t.projectKey ?? "TASK"}-${t.number ?? t._id.slice(-4).toUpperCase()}`;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { openCreate } = useUI();
  const user = useAppSelector((s) => s.auth.user);
  const { data, loading, error } = useAppSelector((s) => s.dashboard);
  const [newProject, setNewProject] = useState(false);

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchProjects());
  }, [dispatch]);

  const first = user?.name?.split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className={loading && data ? "refetching" : ""}>
      <div className="dash-hero">
        <div>
          <p className="dash-date">{today}</p>
          <h1>
            {greeting()}
            {first ? `, ${first}` : ""}
          </h1>
          <p className="muted">Here&apos;s what&apos;s happening across your projects.</p>
        </div>
        <div className="dash-actions">
          <button className="btn btn-subtle" onClick={() => setNewProject(true)}>
            <Icon name="folder" size={16} /> New project
          </button>
          <button className="btn btn-primary" onClick={() => (data?.totals.projects ? openCreate() : setNewProject(true))}>
            <Icon name="plus" size={16} /> Create task
          </button>
        </div>
      </div>

      {error && !data && (
        <div className="error">
          <Icon name="alert" size={16} /> {error}
        </div>
      )}

      {!data && !error && (
        <div className="stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card stat">
              <span className="skeleton" style={{ width: 44, height: 44 }} />
              <span className="skeleton" style={{ width: "50%", height: 28 }} />
            </div>
          ))}
        </div>
      )}

      {data && data.totals.projects === 0 && (
        <div className="card onboarding">
          <span className="empty-icon">
            <Icon name="zap" size={28} />
          </span>
          <h2>Welcome to MiniPM</h2>
          <p className="muted">Your dashboard fills up as soon as you start working. Three quick steps:</p>
          <ol className="steps">
            <li>
              <span>1</span> Create a project
            </li>
            <li>
              <span>2</span> Add tasks to it
            </li>
            <li>
              <span>3</span> Drag them across the board as you progress
            </li>
          </ol>
          <button className="btn btn-primary btn-lg" onClick={() => setNewProject(true)}>
            <Icon name="plus" size={16} /> Create your first project
          </button>
        </div>
      )}

      {data && data.totals.projects > 0 && (
        <>
          <div className="stats">
            <Stat icon="folder" label="Projects" value={data.totals.projects} hint={`${data.totals.tasks} tasks in total`} tone="blue" />
            <Stat icon="clock" label="Open tasks" value={data.totals.todo + data.totals.inProgress} hint={`${data.totals.inProgress} in progress`} tone="orange" />
            <Stat icon="checkCircle" label="Completed" value={data.totals.done} hint={data.totals.tasks ? `${Math.round((data.totals.done / data.totals.tasks) * 100)}% of all tasks` : "No tasks yet"} tone="teal" />
            <Stat icon="alert" label="Overdue" value={data.totals.overdue} hint={data.totals.overdue ? "Needs attention" : "You're all caught up"} tone={data.totals.overdue ? "red" : "grey"} />
          </div>

          <div className="dash-cols">
            <div className="dash-col">
            <ActivityChart activity={data.activity} />
            <ProjectProgress projects={data.byProject} />
              <section className="card list-card" aria-label="Recently updated">
                <header className="viz-head">
                  <div>
                    <h2>Recently updated</h2>
                    <p className="muted small">Your latest task activity</p>
                  </div>
                </header>
                <ul className="dash-list">
                  {data.recent.slice(0, 6).map((t) => (
                    <li key={t._id}>
                      <Link href={`/projects/${t.projectId}`} className="dash-item">
                        <span className={`avatar-dot st-${t.status}`} aria-hidden="true" />
                        <span className="dash-item-main">
                          <span className="dash-item-title">{t.title}</span>
                          <span className="muted small">
                            {keyOf(t)} · {STATUS_LABEL[t.status]} · {relativeTime(t.updatedAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
              </div>
            <div className="dash-col">
            <StatusDonut totals={data.totals} />

            <section className="card list-card" aria-label="Upcoming deadlines">
              <header className="viz-head">
                <div>
                  <h2>Upcoming deadlines</h2>
                  <p className="muted small">Overdue and due in the next 7 days</p>
                </div>
              </header>
              {data.upcoming.length === 0 ? (
                <div className="list-empty muted">
                  <Icon name="checkCircle" size={22} />
                  <span>Nothing due soon. Nice!</span>
                </div>
              ) : (
                <ul className="dash-list">
                  {data.upcoming.map((t) => {
                    const overdue = !!t.dueDate && t.dueDate.slice(0, 10) < data.today;
                    return (
                      <li key={t._id}>
                        <Link href={`/projects/${t.projectId}`} className="dash-item">
                          <span className="type-icon">
                            <Icon name="task" size={12} />
                          </span>
                          <span className="dash-item-main">
                            <span className="dash-item-title">{t.title}</span>
                            <span className="muted small">
                              {keyOf(t)} · {t.projectTitle}
                            </span>
                          </span>
                          <span className={`due-chip ${overdue ? "overdue" : ""}`}>
                            <Icon name={overdue ? "alert" : "calendar"} size={12} /> {t.dueDate ? formatDue(t.dueDate) : ""}
                            {overdue && " · Overdue"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            </div>
          </div>
        </>
      )}

      {newProject && <ProjectForm onClose={() => { setNewProject(false); dispatch(fetchDashboard()); }} />}
    </div>
  );
}
