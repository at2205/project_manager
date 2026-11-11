"use client";

import { useState } from "react";
import { ChartCard, Legend, STATUS_SERIES, TipRow, useTooltip } from "./ChartKit";
import type { DashboardData } from "@/types";

const R = 70;
const C = 2 * Math.PI * R;
const GAP = 2; // surface gap between segments

export default function StatusDonut({ totals }: { totals: DashboardData["totals"] }) {
  const tip = useTooltip();
  const [hover, setHover] = useState<string | null>(null);
  const total = totals.todo + totals.inProgress + totals.done;
  const pct = total ? Math.round((totals.done / total) * 100) : 0;
  const share = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");

  let offset = 0;
  const arcs = STATUS_SERIES.map((s) => {
    const value = totals[s.key];
    const len = total ? (value / total) * C : 0;
    const arc = { ...s, value, len, start: offset };
    offset += len;
    return arc;
  });

  return (
    <ChartCard
      title="Task status"
      subtitle={`${total} task${total === 1 ? "" : "s"} across all projects`}
      table={{ head: ["Status", "Tasks", "Share"], rows: STATUS_SERIES.map((s) => [s.label, totals[s.key], share(totals[s.key])]) }}
    >
      <div className="donut-wrap">
        <svg viewBox="0 0 200 200" className="donut" role="img" aria-label={`${pct}% of tasks are done`}>
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--viz-track)" strokeWidth="22" />
          {arcs.map(
            (a) =>
              a.value > 0 && (
                <circle
                  key={a.key}
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke={a.cssVar}
                  strokeWidth={hover === a.key ? 28 : 22}
                  strokeDasharray={`${Math.max(a.len - (arcs.filter((x) => x.value > 0).length > 1 ? GAP : 0), 0.5)} ${C}`}
                  strokeDashoffset={-a.start}
                  transform="rotate(-90 100 100)"
                  tabIndex={0}
                  aria-label={`${a.label}: ${a.value} (${share(a.value)})`}
                  style={{ transition: "stroke-width .12s", cursor: "pointer", outline: "none" }}
                  onPointerMove={(e) => {
                    setHover(a.key);
                    tip.show(e, <TipRow color={a.cssVar} label={`${a.label} · ${share(a.value)}`} value={a.value} />);
                  }}
                  onPointerLeave={() => {
                    setHover(null);
                    tip.hide();
                  }}
                  onFocus={(e) => {
                    setHover(a.key);
                    tip.showAtElement(e.currentTarget, <TipRow color={a.cssVar} label={`${a.label} · ${share(a.value)}`} value={a.value} />);
                  }}
                  onBlur={() => {
                    setHover(null);
                    tip.hide();
                  }}
                />
              )
          )}
          <text x="100" y="98" textAnchor="middle" className="donut-value">
            {pct}%
          </text>
          <text x="100" y="120" textAnchor="middle" className="donut-caption">
            complete
          </text>
        </svg>
        <Legend items={STATUS_SERIES.map((s) => ({ label: s.label, cssVar: s.cssVar, value: `${totals[s.key]} · ${share(totals[s.key])}` }))} />
      </div>
      {tip.el}
    </ChartCard>
  );
}
