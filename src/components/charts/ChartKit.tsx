"use client";

import { useCallback, useState } from "react";

/** Status colours for charts (validated categorical slots 1-3, see globals.css .viz). */
export const STATUS_SERIES = [
  { key: "todo", label: "To do", cssVar: "var(--series-1)" },
  { key: "inProgress", label: "In progress", cssVar: "var(--series-2)" },
  { key: "done", label: "Done", cssVar: "var(--series-3)" },
] as const;

type Tip = { x: number; y: number; node: React.ReactNode } | null;

/** One shared tooltip per chart. Content is React nodes (text is escaped — never innerHTML). */
export function useTooltip() {
  const [tip, setTip] = useState<Tip>(null);
  const show = useCallback((e: { clientX: number; clientY: number }, node: React.ReactNode) => setTip({ x: e.clientX, y: e.clientY, node }), []);
  const showAtElement = useCallback((el: Element, node: React.ReactNode) => {
    const r = el.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top, node });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  const el = tip ? (
    <div className="viz-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.node}
    </div>
  ) : null;
  return { show, showAtElement, hide, el };
}

export function Legend({ items }: { items: { label: string; cssVar: string; value?: string }[] }) {
  return (
    <ul className="viz-legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className="swatch" style={{ background: i.cssVar }} />
          <span className="legend-label">{i.label}</span>
          {i.value !== undefined && <strong className="legend-value">{i.value}</strong>}
        </li>
      ))}
    </ul>
  );
}

export function TipRow({ color, label, value }: { color: string; label: string; value: React.ReactNode }) {
  return (
    <div className="tip-row">
      <span className="tip-key" style={{ background: color }} />
      <strong>{value}</strong>
      <span className="tip-label">{label}</span>
    </div>
  );
}

/** Card with a chart/table switch so every plotted value is reachable without colour or hover. */
export function ChartCard({
  title,
  subtitle,
  table,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  table: { head: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`card viz ${className}`} aria-label={title}>
      <header className="viz-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        <button className="btn btn-subtle btn-sm" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
          {asTable ? "Chart" : "Table"}
        </button>
      </header>
      {asTable ? (
        <div className="viz-table-wrap">
          <table className="viz-table">
            <thead>
              <tr>
                {table.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
