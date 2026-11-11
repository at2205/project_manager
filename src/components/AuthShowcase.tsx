import Icon, { Logo } from "./Icon";

type Card = { t: string; k: string; due?: string; hot?: boolean; done?: boolean };
const COLS: { name: string; count: number; cards: Card[] }[] = [
  { name: "To do", count: 3, cards: [{ t: "Design onboarding flow", k: "WEB-12", due: "Nov 18" }, { t: "Write release notes", k: "WEB-15" }] },
  { name: "In progress", count: 2, cards: [{ t: "Build analytics dashboard", k: "WEB-9", due: "Nov 14", hot: true }, { t: "Fix login redirect", k: "WEB-11" }] },
  { name: "Done", count: 5, cards: [{ t: "Set up CI pipeline", k: "WEB-4", done: true }, { t: "Project key support", k: "WEB-7", done: true }] },
];

/** Decorative product preview for the auth pages (static, aria-hidden by the parent). */
export default function AuthShowcase() {
  return (
    <div className="show">
      <div className="show-glow show-glow-1" />
      <div className="show-glow show-glow-2" />

      <div className="show-brand">
        <Logo size={36} />
        <span>MiniPM</span>
      </div>

      <div className="show-copy">
        <h2>
          Ship projects,
          <br />
          not spreadsheets.
        </h2>
        <p>Plan work on a drag-and-drop board, track progress on a live dashboard and never miss a deadline.</p>
      </div>

      <div className="show-stage">
        <div className="show-window">
          <div className="show-bar">
            <i /> <i /> <i />
            <span className="show-url">minipm.app / Website Redesign</span>
          </div>
          <div className="show-body">
            <div className="show-side">
              <span className="show-pill on" />
              <span className="show-pill" />
              <span className="show-pill" />
              <span className="show-pill short" />
            </div>
            <div className="show-board">
              {COLS.map((c) => (
                <div key={c.name} className="show-col">
                  <div className="show-col-head">
                    {c.name} <b>{c.count}</b>
                  </div>
                  {c.cards.map((card) => (
                    <div key={card.k} className={`show-card ${card.hot ? "hot" : ""}`}>
                      <div className={`show-card-title ${card.done ? "struck" : ""}`}>{card.t}</div>
                      {card.due && <span className="show-chip">{card.due}</span>}
                      <div className="show-card-foot">
                        <span className="show-type" />
                        <span>{card.k}</span>
                        <span className="show-av" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="show-float show-float-ring">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="8" />
            <circle cx="32" cy="32" r="24" fill="none" stroke="#199e70" strokeWidth="8" strokeDasharray="108 151" strokeLinecap="round" transform="rotate(-90 32 32)" />
            <circle cx="32" cy="32" r="24" fill="none" stroke="#3987e5" strokeWidth="8" strokeDasharray="22 151" strokeDashoffset="-112" strokeLinecap="round" transform="rotate(-90 32 32)" />
          </svg>
          <div>
            <strong>72%</strong>
            <span>sprint complete</span>
          </div>
        </div>

        <div className="show-float show-float-toast">
          <span className="show-tick">
            <Icon name="check" size={14} />
          </span>
          <div>
            <strong>WEB-9 moved to Done</strong>
            <span>just now</span>
          </div>
        </div>
      </div>

      <ul className="show-points">
        <li>
          <Icon name="board" size={16} /> Drag &amp; drop boards
        </li>
        <li>
          <Icon name="trending" size={16} /> Live dashboard
        </li>
        <li>
          <Icon name="shield" size={16} /> Secure by design
        </li>
      </ul>
    </div>
  );
}
