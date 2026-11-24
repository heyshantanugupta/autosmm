"use client";

import { useState } from "react";
import DraftsStep from "./DraftsStep";
import IdeasView from "./IdeasView";
import RepurposeView from "./RepurposeView";
import SubNav from "./SubNav";
import type { HashtagResult } from "@/lib/client";
import PlanRow from "./PlanRow";
import { weekAhead } from "@/lib/nextStep";
import type { Draft, Intake, Platform, PlanItem, Strategy } from "@/lib/types";

interface Props {
  intake: Intake;
  strategy: Strategy;
  plan: PlanItem[];
  drafts: Draft[];
  today: string;
  loading: boolean;
  progress: string | null;
  error: string | null;
  onWriteWeek: () => void;
  onWriteOne: (item: PlanItem) => void;
  onTogglePosted: (id: string, posted: boolean) => void;
  onLogResults: (id: string) => void;
  onChangeBody: (id: string, body: string) => void;
  onApproval: (id: string, key: "claims" | "link" | "tone" | "read", value: boolean) => void;
  onRemove: (id: string) => void;
  onRegenerate: (draft: Draft, instruction: string) => Promise<void>;
  onClear: () => void;
  onAddMore: () => void;
  onMakePlan: () => void;
  onRepurpose: (text: string, targets: string[]) => Promise<void>;
  onHooks: (topic: string) => Promise<string[]>;
  onHashtags: (topic: string, platforms: Platform[]) => Promise<HashtagResult[]>;
}

type Section = "week" | "repurpose" | "hooks" | "hashtags";

export default function WriteView(p: Props) {
  const [section, setSection] = useState<Section>("week");
  const [range, setRange] = useState<"week" | "all">("week");
  const week = weekAhead(p.plan, p.today);
  // After the 7 days run out, the whole plan is still reachable here.
  const shown = range === "all" || week.length === 0 ? p.plan : week;
  const wholePlan = shown === p.plan;
  const unwritten = week.filter((i) => !i.draftId);
  const themeName = (id: string) => p.strategy.themes.find((t) => t.id === id)?.name ?? "";

  return (
    <>
      <div>
        <h1>Write</h1>
        <p className="lede">
          {p.plan.length === 0
            ? "Make your 30-day plan first, and AutoSMM can write a week of posts in one go. Or write a single post below."
            : "Write from your 30-day plan, or write your own post any time. Edit each one and post it yourself. Nothing is posted for you."}
        </p>
      </div>

      <SubNav
        label="Writing tools"
        value={section}
        options={[
          { id: "week", label: "This week" },
          { id: "repurpose", label: "Repurpose" },
          { id: "hooks", label: "Hook lab" },
          { id: "hashtags", label: "Hashtags" },
        ]}
        onChange={setSection}
      />

      {section === "repurpose" && <RepurposeView loading={p.loading} progress={p.progress} error={p.error} onRepurpose={p.onRepurpose} />}
      {(section === "hooks" || section === "hashtags") && (
        <IdeasView mode={section} channels={p.intake.channels} onHooks={p.onHooks} onHashtags={p.onHashtags} />
      )}

      {section === "week" && (p.plan.length === 0 ? (
        <div className="row">
          <button type="button" className="btn" onClick={p.onMakePlan}>
            Make my 30-day plan
          </button>
          <button type="button" className="btn secondary" onClick={p.onAddMore}>
            Write one post now
          </button>
        </div>
      ) : (
        <section aria-labelledby="week-title">
          <h2 className="group-title" id="week-title">
            {wholePlan ? "Your whole plan" : "Next 7 days"}
          </h2>
          {week.length === 0 && <p className="notice">Nothing is planned for the next 7 days, so the whole plan is shown. You can make a new plan on the Plan tab.</p>}
          {
            <>
              <div className="row">
                <button type="button" className="btn" disabled={p.loading || unwritten.length === 0} onClick={p.onWriteWeek}>
                  {p.loading && p.progress ? p.progress : unwritten.length === 0 ? "All written" : `Write ${unwritten.length === week.length ? "this week" : `the other ${unwritten.length}`}`}
                </button>
                <button type="button" className="btn secondary" onClick={p.onAddMore} disabled={p.loading}>
                  Write my own post
                </button>
                {week.length > 0 && (
                  <button type="button" className="btn quiet" onClick={() => setRange(wholePlan ? "week" : "all")}>
                    {wholePlan ? "Show next 7 days" : `Show whole plan (${p.plan.length})`}
                  </button>
                )}
              </div>
              <ul className="plan-list">
                {shown.map((it) => (
                  <PlanRow
                    key={it.id}
                    item={it}
                    themeName={themeName(it.themeId)}
                    actions={
                      <span className="plan-actions">
                        {!it.draftId && (
                          <button type="button" className="icon-link" disabled={p.loading} onClick={() => p.onWriteOne(it)}>
                            Write this one
                          </button>
                        )}
                        {it.draftId && (
                          <a className="icon-link" href={`#draft-${it.draftId}`}>
                            Open draft
                          </a>
                        )}
                        {it.draftId && (
                          <label className="posted-box">
                            <input type="checkbox" checked={Boolean(it.posted)} onChange={(e) => p.onTogglePosted(it.id, e.target.checked)} />
                            I posted it
                          </label>
                        )}
                        {it.posted && (
                          <button type="button" className="icon-link" onClick={() => p.onLogResults(it.id)}>
                            Log results
                          </button>
                        )}
                      </span>
                    }
                  />
                ))}
              </ul>
            </>
          }
          {p.error && <p className="error" role="alert">{p.error}</p>}
        </section>
      ))}

      <DraftsStep
        intake={p.intake}
        strategy={p.strategy}
        drafts={p.drafts}
        onChangeBody={p.onChangeBody}
        onApproval={p.onApproval}
        onRemove={p.onRemove}
        onRegenerate={p.onRegenerate}
        onClear={p.onClear}
        onAddMore={p.onAddMore}
      />
    </>
  );
}
