"use client";

import PlanRow from "./PlanRow";
import { formatDay } from "@/lib/dates";
import { greeting } from "@/lib/greeting";
import { nextStep, weekAhead, type NextAction, type Snapshot } from "@/lib/nextStep";

interface Props {
  snapshot: Snapshot;
  loading: boolean;
  progress: string | null;
  error: string | null;
  onAct: (action: NextAction) => void;
  onGo: (tab: "reply" | "plan" | "results") => void;
}

export default function TodayView({ snapshot, loading, progress, error, onAct, onGo }: Props) {
  const step = nextStep(snapshot);
  const week = weekAhead(snapshot.plan, snapshot.today);
  const themeName = (id: string) => snapshot.strategy?.themes.find((t) => t.id === id)?.name ?? "";
  const first = snapshot.plan.length === 0;
  const hello = snapshot.today ? greeting(new Date().getHours()) : "Hello";
  const name = snapshot.intake.productName.trim();
  const tiles = [
    { n: week.length, label: "planned this week" },
    { n: week.filter((i) => i.draftId).length, label: "written" },
    { n: snapshot.plan.filter((i) => i.posted).length, label: "posted so far" },
    { n: snapshot.results.length, label: "results logged" },
  ];

  return (
    <>
      <div>
        <h1>{hello}.</h1>
        <p className="lede">
          {snapshot.today ? `${formatDay(snapshot.today)}. ` : ""}
          {name ? `Here is what is next for ${name}.` : "Let us get your social media moving."}
        </p>
      </div>

      <section className="next-card" aria-labelledby="next-title">
        <p className="next-kicker">{first ? "Start here" : "Your next step"}</p>
        <h2 id="next-title">{step.title}</h2>
        <p>{step.text}</p>
        <div className="row">
          <button type="button" className="btn" onClick={() => onAct(step.action)} disabled={loading}>
            {loading ? progress ?? "Working..." : step.button}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {snapshot.plan.length > 0 && (
        <dl className="tiles" aria-label="Your progress">
          {tiles.map((t) => (
            <div className="tile" key={t.label}>
              <dt>{t.label}</dt>
              <dd>{t.n}</dd>
            </div>
          ))}
        </dl>
      )}

      {week.length > 0 && (
        <section aria-labelledby="week-list-title">
          <h2 className="group-title" id="week-list-title">
            Coming up
          </h2>
          <ul className="plan-list">
            {week.map((it) => (
              <PlanRow key={it.id} item={it} themeName={themeName(it.themeId)} />
            ))}
          </ul>
        </section>
      )}

      {snapshot.strategy && (
        <div className="row quick-links">
          <button type="button" className="btn secondary small" onClick={() => onGo("reply")}>
            Reply to a comment
          </button>
          <button type="button" className="btn secondary small" onClick={() => onGo("results")}>
            Log results
          </button>
          <button type="button" className="btn quiet small" onClick={() => onGo("plan")}>
            See the whole plan
          </button>
        </div>
      )}
    </>
  );
}
