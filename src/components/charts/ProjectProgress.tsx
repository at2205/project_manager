"use client";

import Link from "next/link";
import { ChartCard, Legend, STATUS_SERIES, TipRow, useTooltip } from "./ChartKit";
import type { DashboardData } from "@/types";

/** One thin segmented bar per project: the whole is the project's tasks, split by status. */
export default function ProjectProgress({ projects }: { projects: DashboardData["byProject"] }) {
  const tip = useTooltip();
  return (
    <ChartCard
      title="Project progress"
      subtitle="Tasks by status in each project"
      table={{
        head: ["Project", "To do", "In progress", "Done", "Total"],
        rows: projects.map((p) => [`${p.title}${p.key ? ` (${p.key})` : ""}`, p.todo, p.inProgress, p.done, p.total]),
      }}
      className="span-2"
    >
      <Legend items={STATUS_SERIES.map((s) => ({ label: s.label, cssVar: s.cssVar }))} />
      <ul className="proj-rows">
        {projects.map((p) => {
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <li key={p._id} className="proj-row">
              <div className="proj-meta">
                <Link href={`/projects/${p._id}`} className="proj-name">
                  {p.title}
                </Link>
                <span className="muted small">
                  {p.key ? `${p.key} · ` : ""}
                  {p.done}/{p.total} done · {pct}%
                </span>
              </div>
              <div
                className="seg-track"
                role="img"
                aria-label={`${p.title}: ${p.todo} to do, ${p.inProgress} in progress, ${p.done} done`}
              >
                {p.total === 0 ? (
                  <span className="seg empty-seg">
                    <i />
                  </span>
                ) : (
                  STATUS_SERIES.map(
                    (s) =>
                      p[s.key] > 0 && (
                        <span
                          key={s.key}
                          className="seg"
                          style={{ flexGrow: p[s.key] }}
                          tabIndex={0}
                          onPointerMove={(e) => tip.show(e, <TipRow color={s.cssVar} label={`${s.label} · ${Math.round((p[s.key] / p.total) * 100)}%`} value={p[s.key]} />)}
                          onPointerLeave={tip.hide}
                          onFocus={(e) => tip.showAtElement(e.currentTarget, <TipRow color={s.cssVar} label={`${s.label} · ${Math.round((p[s.key] / p.total) * 100)}%`} value={p[s.key]} />)}
                          onBlur={tip.hide}
                        >
                          <i style={{ background: s.cssVar }} />
                        </span>
                      )
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {tip.el}
    </ChartCard>
  );
}
