"use client";

import { useState } from "react";
import { ChartCard, Legend, TipRow, useTooltip } from "./ChartKit";
import type { DashboardData } from "@/types";

const W = 640;
const H = 230;
const M = { top: 22, right: 8, bottom: 26, left: 30 };
const BAR = 14; // <= 24px per the mark spec
const SERIES = [
  { key: "created", label: "Created", cssVar: "var(--series-1)" },
  { key: "completed", label: "Completed", cssVar: "var(--series-3)" },
] as const;

const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

/** Column with a 4px rounded data-end and a square baseline. */
function columnPath(x: number, base: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${base} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`;
}

export default function ActivityChart({ activity }: { activity: DashboardData["activity"] }) {
  const tip = useTooltip();
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...activity.flatMap((d) => [d.created, d.completed]));
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * 4;
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const band = innerW / activity.length;
  const y = (v: number) => M.top + innerH - (v / top) * innerH;
  const base = M.top + innerH;

  const totalCreated = activity.reduce((n, d) => n + d.created, 0);
  const totalCompleted = activity.reduce((n, d) => n + d.completed, 0);
  // label only the peak of each series (selective direct labels)
  const peak = (k: "created" | "completed") => {
    const m = Math.max(...activity.map((d) => d[k]));
    return m > 0 ? activity.findIndex((d) => d[k] === m) : -1;
  };
  const peaks = { created: peak("created"), completed: peak("completed") };

  const tipFor = (d: DashboardData["activity"][number]) => (
    <>
      <div className="tip-title">{fmt(d.date)}</div>
      <TipRow color={SERIES[0].cssVar} label="Created" value={d.created} />
      <TipRow color={SERIES[1].cssVar} label="Completed" value={d.completed} />
    </>
  );

  return (
    <ChartCard
      title="Activity"
      subtitle={`${totalCreated} created · ${totalCompleted} completed in the last ${activity.length} days`}
      table={{ head: ["Date", "Created", "Completed"], rows: activity.map((d) => [fmt(d.date), d.created, d.completed]) }}
      className="span-2"
    >
      <Legend items={SERIES.map((s) => ({ label: s.label, cssVar: s.cssVar }))} />
      <svg viewBox={`0 0 ${W} ${H}`} className="activity" role="img" aria-label={`Tasks created and completed per day, last ${activity.length} days`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = i * step;
          return (
            <g key={i}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className={i === 0 ? "axis-base" : "axis-grid"} />
              <text x={M.left - 8} y={y(v) + 4} textAnchor="end" className="axis-text">
                {v}
              </text>
            </g>
          );
        })}

        {activity.map((d, i) => {
          const gx = M.left + i * band + band / 2 - BAR - 1; // two columns + 2px gap, centred in the band
          return (
            <g key={d.date}>
              {hover === i && <rect x={M.left + i * band + 1} y={M.top - 6} width={band - 2} height={innerH + 6} className="hover-wash" />}
              {d.created > 0 && <path d={columnPath(gx, base, BAR, base - y(d.created))} fill={SERIES[0].cssVar} />}
              {d.completed > 0 && <path d={columnPath(gx + BAR + 2, base, BAR, base - y(d.completed))} fill={SERIES[1].cssVar} />}
              {peaks.created === i && (
                <text x={gx + BAR / 2} y={y(d.created) - 5} textAnchor="middle" className="value-label">
                  {d.created}
                </text>
              )}
              {peaks.completed === i && (
                <text x={gx + BAR + 2 + BAR / 2} y={y(d.completed) - 5} textAnchor="middle" className="value-label">
                  {d.completed}
                </text>
              )}
              {(activity.length - 1 - i) % 2 === 0 && (
                <text x={M.left + i * band + band / 2} y={H - 6} textAnchor="middle" className="axis-text">
                  {fmt(d.date)}
                </text>
              )}
              {/* hit target = the whole day band, bigger than the marks */}
              <rect
                x={M.left + i * band}
                y={M.top - 6}
                width={band}
                height={innerH + 6 + M.bottom}
                fill="transparent"
                tabIndex={0}
                aria-label={`${fmt(d.date)}: ${d.created} created, ${d.completed} completed`}
                style={{ outline: "none" }}
                onPointerMove={(e) => {
                  setHover(i);
                  tip.show(e, tipFor(d));
                }}
                onPointerLeave={() => {
                  setHover(null);
                  tip.hide();
                }}
                onFocus={(e) => {
                  setHover(i);
                  tip.showAtElement(e.currentTarget, tipFor(d));
                }}
                onBlur={() => {
                  setHover(null);
                  tip.hide();
                }}
              />
            </g>
          );
        })}
      </svg>
      {tip.el}
    </ChartCard>
  );
}
