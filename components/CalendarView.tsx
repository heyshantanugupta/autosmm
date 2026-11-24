"use client";

import { useState } from "react";
import PlanRow from "./PlanRow";
import { planToCsv } from "@/lib/calendar";
import { addDays, daysBetween, formatDay } from "@/lib/dates";
import type { PlanItem, Strategy } from "@/lib/types";

interface Props {
  plan: PlanItem[];
  strategy: Strategy;
  today: string;
  loading: boolean;
  error: string | null;
  onMake: (opts: { perWeek: number; startDate: string }) => void;
  onRemove: (id: string) => void;
}

const PACES = [
  { value: 3, label: "Light: 3 posts a week" },
  { value: 5, label: "Steady: 5 posts a week" },
  { value: 7, label: "Busy: 7 posts a week" },
];

export default function CalendarView({ plan, strategy, today, loading, error, onMake, onRemove }: Props) {
  const [perWeek, setPerWeek] = useState(5);
  const [start, setStart] = useState(today);
  const [confirming, setConfirming] = useState(false);
  const themeName = (id: string) => strategy.themes.find((t) => t.id === id)?.name ?? "";

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([planToCsv(plan, themeName)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "content-calendar.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const form = (
    <div className="section">
      <div className="field">
        <label htmlFor="pace">How often can you post?</label>
        <p className="hint">Pick a pace you can keep up. A steady 3 a week beats 7 for one week.</p>
        <select id="pace" value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))}>
          {PACES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="start">Start on</label>
        <input id="start" type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="row">
        <button type="button" className="btn" disabled={loading || !start} onClick={() => { setConfirming(false); onMake({ perWeek, startDate: start }); }}>
          {loading ? "Planning..." : plan.length ? "Replace my plan" : "Make my 30 days"}
        </button>
        {plan.length > 0 && (
          <button type="button" className="btn quiet" onClick={() => setConfirming(false)}>
            Keep the current plan
          </button>
        )}
      </div>
    </div>
  );

  if (plan.length === 0) {
    return (
      <>
        <div>
          <h1>Your 30-day plan</h1>
          <p className="lede">A post for each posting day, mixing teaching, stories, proof and offers, spread across your best platforms.</p>
        </div>
        {form}
        {error && <p className="error" role="alert">{error}</p>}
      </>
    );
  }

  const first = plan[0].date;
  const weeks = new Map<number, PlanItem[]>();
  for (const it of plan) {
    const w = Math.floor(daysBetween(first, it.date) / 7);
    weeks.set(w, [...(weeks.get(w) ?? []), it]);
  }

  return (
    <>
      <div>
        <h1>Your 30-day plan</h1>
        <p className="lede">
          {plan.length} posts from {formatDay(first)} to {formatDay(plan[plan.length - 1].date)}. Write them a week at a time on the Write tab.
        </p>
      </div>
      <div className="row">
        <button type="button" className="btn secondary" onClick={exportCsv}>
          Download as CSV
        </button>
        <button type="button" className="btn quiet" onClick={() => setConfirming((v) => !v)} aria-expanded={confirming}>
          Make a new plan
        </button>
      </div>
      {confirming && (
        <div className="notice">
          A new plan replaces this one. Drafts you already wrote are kept.
          {form}
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {[...weeks.entries()].map(([w, items]) => (
        <section key={w}>
          <h2 className="group-title">
            Week {w + 1}: {formatDay(addDays(first, w * 7))} to {formatDay(addDays(first, w * 7 + 6))}
          </h2>
          <ul className="plan-list">
            {items.map((it) => (
              <PlanRow
                key={it.id}
                item={it}
                themeName={themeName(it.themeId)}
                actions={
                  !it.draftId && (
                    <button type="button" className="icon-link" onClick={() => onRemove(it.id)} aria-label={`Remove ${it.topic} from the plan`}>
                      Remove
                    </button>
                  )
                }
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
