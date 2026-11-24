"use client";

import { useCallback, useEffect, useState } from "react";
import CalendarView from "@/components/CalendarView";
import IntakeStep from "@/components/IntakeStep";
import PlatformStep from "@/components/PlatformStep";
import ReplyView from "@/components/ReplyView";
import ResultsView from "@/components/ResultsView";
import SettingsPanel from "@/components/SettingsPanel";
import StrategyStep from "@/components/StrategyStep";
import SubNav from "@/components/SubNav";
import ThemeToggle from "@/components/ThemeToggle";
import TodayView from "@/components/TodayView";
import WriteView from "@/components/WriteView";
import { requestCalendar, requestDrafts, requestHashtags, requestHooks, requestImport, requestReply, requestReview, requestStrategy } from "@/lib/client";
import { todayISO } from "@/lib/dates";
import { weekAhead, type NextAction } from "@/lib/nextStep";
import { getProvider } from "@/lib/providers";
import { BLANK_INTAKE } from "@/lib/presets";
import {
  DEFAULT_SETTINGS,
  clearAllStoredData,
  loadSettings,
  loadWorkspace,
  saveSettings,
  saveWorkspace,
  type Settings,
} from "@/lib/storage";
import type { Batch, Draft, Intake, Platform, PlanItem, ResultEntry, Review, Strategy } from "@/lib/types";

type Tab = "today" | "plan" | "write" | "reply" | "results";
type PlanTab = "brief" | "strategy" | "calendar";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "today", label: "Today", hint: "What to do next" },
  { id: "plan", label: "Plan", hint: "Brief, strategy, 30 days" },
  { id: "write", label: "Write", hint: "This week's posts" },
  { id: "reply", label: "Reply", hint: "Answer comments" },
  { id: "results", label: "Results", hint: "What worked" },
];

const ICONS: Record<Tab, React.ReactNode> = {
  today: (
    <>
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.8v1.9M10 15.3v1.9M2.8 10h1.9M15.3 10h1.9M4.9 4.9l1.3 1.3M13.8 13.8l1.3 1.3M15.1 4.9l-1.3 1.3M6.2 13.8l-1.3 1.3" />
    </>
  ),
  plan: (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8.5h13M7 3v3M13 3v3" />
    </>
  ),
  write: <path d="M4 16l.8-3.4 8.8-8.8a1.6 1.6 0 0 1 2.3 0l.3.3a1.6 1.6 0 0 1 0 2.3L7.4 15.2zM12 5.5 14.5 8" />,
  reply: <path d="M4 5.5h12v7H9.5L6 16v-3.5H4z" />,
  results: <path d="M4.5 16V10M9 16V5M13.5 16v-4.5M3 16.5h14" />,
};

function TabIcon({ name }: { name: Tab }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r${Date.now()}${Math.random().toString(36).slice(2, 7)}`);
const reviewHint = (r: Review | null) => (r ? [r.summary, ...r.doMore, ...r.changeOrStop].join(" ").slice(0, 800) : undefined);

export default function Home() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const [tab, setTab] = useState<Tab>("today");
  const [planTab, setPlanTab] = useState<PlanTab>("brief");
  const [customWrite, setCustomWrite] = useState(false);
  const [intake, setIntake] = useState<Intake>(BLANK_INTAKE);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [today, setToday] = useState("");
  const [prefillItem, setPrefillItem] = useState<string | undefined>();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved state once, in the browser only.
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setToday(todayISO());
    const w = loadWorkspace();
    if (w) {
      setIntake(w.intake ?? BLANK_INTAKE);
      setStrategy(w.strategy ?? null);
      setDrafts(w.drafts ?? []);
      setPlan(w.plan ?? []);
      setResults(w.results ?? []);
      setReview(w.review ?? null);
      if (w.strategy) setPlanTab(w.plan?.length ? "calendar" : "strategy");
    }
    if (!s.demo && getProvider(s.provider).needsKey && !s.apiKey) setShowSettings(true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isEmpty = !strategy && drafts.length === 0 && plan.length === 0 && results.length === 0 && JSON.stringify(intake) === JSON.stringify(BLANK_INTAKE);
    // Do not write an empty brief back to storage (this is what "Clear" relies on).
    if (!isEmpty) saveWorkspace({ intake, strategy, drafts, plan, results, review });
  }, [ready, intake, strategy, drafts, plan, results, review]);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    saveSettings(next);
  };

  const goTab = useCallback((next: Tab) => {
    setError(null);
    setTab(next);
    window.scrollTo({ top: 0 });
  }, []);

  const provider = getProvider(settings.provider);
  const hasAccess = settings.demo || !provider.needsKey || Boolean(settings.apiKey);
  const needsAccess = !hasAccess;

  const requireAccess = (): boolean => {
    if (!needsAccess) return true;
    setShowSettings(true);
    setError("Add an API key in Settings, or switch on demo mode.");
    return false;
  };

  const buildStrategy = async () => {
    if (!requireAccess()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requestStrategy(intake, settings);
      setStrategy(res.strategy);
      setPlanTab("strategy");
      goTab("plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the strategy.");
    } finally {
      setLoading(false);
    }
  };

  const makePlan = async (opts?: { perWeek?: number; startDate?: string }) => {
    if (!strategy || !requireAccess()) return;
    setLoading(true);
    setProgress("Planning your 30 days...");
    setError(null);
    try {
      const res = await requestCalendar({ intake, strategy, startDate: opts?.startDate || today, perWeek: opts?.perWeek, review: reviewHint(review) }, settings);
      setPlan(res.plan);
      setPlanTab("calendar");
      goTab("plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the plan.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const generateDrafts = async (args: { platform: Platform; postTypeIds: string[]; perType: number; instruction: string; batch: Batch }) => {
    if (!strategy || !requireAccess()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requestDrafts(
        {
          intake,
          strategy,
          platform: args.platform,
          postTypeIds: args.postTypeIds,
          perType: args.perType,
          instruction: args.instruction || undefined,
          ...args.batch,
        },
        settings,
      );
      setDrafts((cur) => [...cur, ...res.drafts]);
      setCustomWrite(false);
      goTab("write");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write drafts.");
    } finally {
      setLoading(false);
    }
  };

  /** Write the draft for one planned post and attach it to that slot. */
  const writeForItem = async (item: PlanItem) => {
    if (!strategy) return;
    const res = await requestDrafts(
      { intake, strategy, platform: item.platform, postTypeIds: [item.postTypeId], perType: 1, instruction: `Topic for this post: ${item.topic}` },
      settings,
    );
    const draft = res.drafts[0];
    if (!draft) throw new Error("No draft came back. Try again.");
    const attached: Draft = { ...draft, themeId: item.themeId };
    setDrafts((cur) => [...cur, attached]);
    setPlan((cur) => cur.map((p) => (p.id === item.id ? { ...p, draftId: attached.id } : p)));
  };

  const writeWeek = async () => {
    if (!strategy || !requireAccess()) return;
    const todo = weekAhead(plan, today).filter((i) => !i.draftId);
    if (todo.length === 0) return;
    setLoading(true);
    setError(null);
    let done = 0;
    try {
      for (const item of todo) {
        setProgress(`Writing post ${done + 1} of ${todo.length}...`);
        await writeForItem(item);
        done++;
      }
      goTab("write");
    } catch (e) {
      const why = e instanceof Error ? e.message : "Something went wrong.";
      setError(`Wrote ${done} of ${todo.length}. ${why} Press the button again to write the rest.`);
      goTab("write");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  /** One idea or blog post becomes a post in each chosen format. The user's text counts as the source of facts. */
  const repurpose = async (text: string, targets: string[]) => {
    if (!strategy || !requireAccess()) return;
    setLoading(true);
    setError(null);
    let done = 0;
    try {
      for (const t of targets) {
        const [platform, postTypeId] = t.split(":") as [Platform, string];
        setProgress(`Writing ${done + 1} of ${targets.length}...`);
        const res = await requestDrafts(
          {
            intake,
            strategy,
            platform,
            postTypeIds: [postTypeId],
            perType: 1,
            feature: text,
            instruction: "Rewrite the pasted text for this format. Keep its message and facts. Do not add claims that are not in it.",
          },
          settings,
        );
        setDrafts((cur) => [...cur, ...res.drafts]);
        done++;
      }
    } catch (e) {
      setError(`Made ${done} of ${targets.length}. ${e instanceof Error ? e.message : "Something went wrong."}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const writeOne = async (item: PlanItem) => {
    if (!requireAccess()) return;
    setLoading(true);
    setProgress("Writing...");
    setError(null);
    try {
      await writeForItem(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write that post.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const regenerate = async (draft: Draft, instruction: string) => {
    if (!strategy) return;
    if (needsAccess) throw new Error("Add an API key in Settings, or switch on demo mode.");
    const res = await requestDrafts(
      {
        intake,
        strategy,
        platform: draft.platform,
        postTypeIds: [draft.postTypeId],
        perType: 1,
        instruction: instruction || undefined,
        ...(draft.batch ?? {}),
      },
      settings,
    );
    const fresh = res.drafts[0];
    if (!fresh) throw new Error("No draft came back. Try again.");
    setDrafts((cur) => cur.map((d) => (d.id === draft.id ? fresh : d)));
    setPlan((cur) => cur.map((p) => (p.draftId === draft.id ? { ...p, draftId: fresh.id } : p)));
  };

  const removeDraft = (id: string) => {
    setDrafts((cur) => cur.filter((d) => d.id !== id));
    setPlan((cur) => cur.map((p) => (p.draftId === id ? { ...p, draftId: undefined, posted: false } : p)));
  };

  const clearDrafts = () => {
    setDrafts([]);
    setPlan((cur) => cur.map((p) => ({ ...p, draftId: undefined, posted: false })));
  };

  const runReview = async () => {
    if (!strategy || !requireAccess()) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      const res = await requestReview({ intake, strategy, entries: results }, settings);
      setReview(res.review);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Could not review the results.");
    } finally {
      setReviewBusy(false);
    }
  };

  const clearEverything = () => {
    clearAllStoredData();
    setSettings(DEFAULT_SETTINGS);
    setIntake(BLANK_INTAKE);
    setStrategy(null);
    setDrafts([]);
    setPlan([]);
    setResults([]);
    setReview(null);
    setTab("today");
    setPlanTab("brief");
    setError(null);
  };

  const act = (action: NextAction) => {
    switch (action) {
      case "brief":
        setPlanTab("brief");
        return goTab("plan");
      case "strategy":
        return buildStrategy();
      case "plan":
      case "replan":
        return makePlan();
      case "write-week":
        return writeWeek();
      case "post-today": {
        const item = plan.find((p) => p.date === today && !p.posted);
        goTab("write");
        if (item?.draftId) setTimeout(() => document.getElementById(`draft-${item.draftId}`)?.scrollIntoView({ block: "start" }), 50);
        return;
      }
      case "log-results":
        return goTab("results");
      case "rest":
        return goTab("reply");
    }
  };

  const snapshot = { intake, strategy, plan, results, today };
  const doneTabs: Record<Tab, boolean> = {
    today: false,
    plan: plan.length > 0,
    write: plan.length > 0 && weekAhead(plan, today).every((i) => i.draftId) && weekAhead(plan, today).length > 0,
    reply: false,
    results: results.length > 0,
  };

  return (
    <div className="app" data-step={tab}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3M5 5l2 2M13 13l2 2M15 5l-2 2M7 13l-2 2" />
            </svg>
          </span>
          <span>
            AutoSMM
            <small>Your Social Media Marketing Solution</small>
          </span>
        </div>
        <div className="row">
          {ready && (
            <span className={`mode-pill ${settings.demo ? "demo" : hasAccess ? "live" : ""}`}>
              {settings.demo ? "Demo mode" : hasAccess ? `Using ${provider.label}` : "No API key yet"}
            </span>
          )}
          <button type="button" className="btn secondary small" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
            Settings
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="shell">
        <nav className="rail tabs" aria-label="Sections">
          <ol>
            {TABS.map((t) => (
              <li key={t.id} className={`step-${t.id}${doneTabs[t.id] ? " is-done" : ""}`}>
                <button type="button" aria-current={tab === t.id ? "page" : undefined} onClick={() => goTab(t.id)}>
                  <span className="node">
                    <TabIcon name={t.id} />
                  </span>
                  <span className="step-text">
                    <span className="step-label">{t.label}</span>
                    <span className="step-hint">{t.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="stage">
          {showSettings && (
            <SettingsPanel
              settings={settings}
              onChange={updateSettings}
              onClose={() => setShowSettings(false)}
              onClearData={clearEverything}
            />
          )}

          {tab === "today" && (
            <TodayView
              snapshot={snapshot}
              loading={loading}
              progress={progress}
              error={error}
              onAct={act}
              onGo={(t) => goTab(t)}
            />
          )}

          {tab === "plan" && (
            <>
              <SubNav
                label="Plan sections"
                value={planTab}
                onChange={(v) => {
                  setError(null);
                  setPlanTab(v);
                }}
                options={[
                  { id: "brief", label: "Brief" },
                  { id: "strategy", label: "Strategy", disabled: !strategy },
                  { id: "calendar", label: "30 days", disabled: !strategy },
                ]}
              />
              {planTab === "brief" && (
                <IntakeStep
                  intake={intake}
                  onChange={setIntake}
                  onSubmit={buildStrategy}
                  onStartBlank={() => setIntake(BLANK_INTAKE)}
                  onImport={(url) => requestImport(url, settings)}
                  loading={loading}
                  error={error}
                />
              )}
              {planTab === "strategy" && strategy && (
                <StrategyStep
                  intake={intake}
                  strategy={strategy}
                  onNext={() => (plan.length ? setPlanTab("calendar") : makePlan())}
                  onEditBrief={() => setPlanTab("brief")}
                  onRegenerate={buildStrategy}
                  loading={loading}
                  error={error}
                />
              )}
              {planTab === "calendar" && strategy && (
                <CalendarView
                  plan={plan}
                  strategy={strategy}
                  today={today}
                  loading={loading}
                  error={error}
                  onMake={(o) => makePlan(o)}
                  onRemove={(id) => setPlan((cur) => cur.filter((p) => p.id !== id))}
                />
              )}
            </>
          )}

          {tab === "write" && !strategy && (
            <section className="next-card">
              <h2>Build your strategy first</h2>
              <p>AutoSMM writes from your strategy, so it needs one before it can write posts.</p>
              <div className="row">
                <button type="button" className="btn" onClick={() => act("brief")}>
                  Go to your brief
                </button>
              </div>
            </section>
          )}
          {tab === "write" && strategy && customWrite && (
            <PlatformStep
              intake={intake}
              strategy={strategy}
              loading={loading}
              error={error}
              onGenerate={generateDrafts}
              onBack={() => setCustomWrite(false)}
              hasDrafts={drafts.length > 0}
              onViewDrafts={() => setCustomWrite(false)}
            />
          )}
          {tab === "write" && strategy && !customWrite && (
            <WriteView
              intake={intake}
              strategy={strategy}
              plan={plan}
              drafts={drafts}
              today={today}
              loading={loading}
              progress={progress}
              error={error}
              onWriteWeek={writeWeek}
              onWriteOne={writeOne}
              onTogglePosted={(id, posted) => setPlan((cur) => cur.map((p) => (p.id === id ? { ...p, posted } : p)))}
              onLogResults={(id) => {
                setPrefillItem(id);
                goTab("results");
              }}
              onChangeBody={(id, body) => setDrafts((cur) => cur.map((d) => (d.id === id ? { ...d, body } : d)))}
              onApproval={(id, key, value) =>
                setDrafts((cur) => cur.map((d) => (d.id === id ? { ...d, approval: { ...d.approval, [key]: value } } : d)))
              }
              onRemove={removeDraft}
              onRegenerate={regenerate}
              onClear={clearDrafts}
              onAddMore={() => setCustomWrite(true)}
              onMakePlan={() => makePlan()}
              onRepurpose={repurpose}
              onHooks={async (topic) => {
                if (needsAccess) {
                  setShowSettings(true);
                  throw new Error("Add an API key in Settings, or switch on demo mode.");
                }
                return (await requestHooks({ intake, topic }, settings)).hooks;
              }}
              onHashtags={async (topic, platforms) => {
                if (needsAccess) {
                  setShowSettings(true);
                  throw new Error("Add an API key in Settings, or switch on demo mode.");
                }
                return (await requestHashtags({ intake, topic, platforms }, settings)).sets;
              }}
            />
          )}

          {tab === "reply" && (
            <ReplyView
              onReply={async (message, platform, kind) => {
                if (needsAccess) {
                  setShowSettings(true);
                  throw new Error("Add an API key in Settings, or switch on demo mode.");
                }
                return requestReply({ intake, message, platform, kind }, settings);
              }}
            />
          )}

          {tab === "results" && (
            <ResultsView
              strategy={strategy}
              plan={plan}
              results={results}
              review={review}
              today={today}
              prefillItemId={prefillItem}
              reviewBusy={reviewBusy}
              reviewError={reviewError}
              onAdd={(e) => setResults((cur) => [...cur, { ...e, id: newId() }])}
              onRemove={(id) => setResults((cur) => cur.filter((r) => r.id !== id))}
              onReview={runReview}
            />
          )}
        </main>
      </div>
      <footer className="footer">
        <p>
          <strong>AutoSMM</strong> was designed and built by Shantanu Gupta.
        </p>
        <p className="footer-fine">
          &copy; 2026 Shantanu Gupta. Open source under the MIT license.{" "}
          <a href="https://github.com/heyshantanugupta" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>{" "}
          <a href="https://www.linkedin.com/in/heyshantanu" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </p>
      </footer>
    </div>
  );
}
