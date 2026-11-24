"use client";

import { useCallback, useEffect, useState } from "react";
import DraftsStep from "@/components/DraftsStep";
import IntakeStep from "@/components/IntakeStep";
import PlatformStep from "@/components/PlatformStep";
import SettingsPanel from "@/components/SettingsPanel";
import StrategyStep from "@/components/StrategyStep";
import { requestDrafts, requestStrategy } from "@/lib/client";
import { getProvider } from "@/lib/providers";
import { BLANK_INTAKE, THEINTERVIEWS_EXAMPLE } from "@/lib/presets";
import {
  DEFAULT_SETTINGS,
  clearAllStoredData,
  loadSettings,
  loadWorkspace,
  saveSettings,
  saveWorkspace,
  type Settings,
} from "@/lib/storage";
import type { Batch, Draft, Intake, Platform, Strategy } from "@/lib/types";

type Step = "intake" | "strategy" | "platform" | "drafts";

const STEPS: { id: Step; label: string; hint: string }[] = [
  { id: "intake", label: "Brief", hint: "Describe your product" },
  { id: "strategy", label: "Strategy", hint: "Review the plan" },
  { id: "platform", label: "Platform", hint: "Pick channel and posts" },
  { id: "drafts", label: "Drafts", hint: "Edit and copy" },
];

const ICONS: Record<Step | "check", React.ReactNode> = {
  intake: (
    <>
      <path d="M6 3h6l4 4v10H6z" />
      <path d="M12 3v4h4M8.5 11h5M8.5 14h5" />
    </>
  ),
  strategy: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M12.8 7.2 11 11l-3.8 1.8L9 9z" />
    </>
  ),
  platform: (
    <>
      <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="11" y="3.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="3.5" y="11" width="5.5" height="5.5" rx="1.5" />
      <rect x="11" y="11" width="5.5" height="5.5" rx="1.5" />
    </>
  ),
  drafts: <path d="M4 16l.8-3.4 8.8-8.8a1.6 1.6 0 0 1 2.3 0l.3.3a1.6 1.6 0 0 1 0 2.3L7.4 15.2zM12 5.5 14.5 8" />,
  check: <path d="M5 10.5l3.2 3.2L15 6.8" />,
};

function StepIcon({ name }: { name: Step | "check" }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const [step, setStep] = useState<Step>("intake");
  const [intake, setIntake] = useState<Intake>(BLANK_INTAKE);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved state once, in the browser only.
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    const w = loadWorkspace();
    if (w) {
      setIntake(w.intake ?? BLANK_INTAKE);
      setStrategy(w.strategy ?? null);
      setDrafts(w.drafts ?? []);
      setStep(w.drafts?.length ? "drafts" : w.strategy ? "strategy" : "intake");
    }
    if (!s.demo && getProvider(s.provider).needsKey && !s.apiKey) setShowSettings(true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isEmpty = !strategy && drafts.length === 0 && JSON.stringify(intake) === JSON.stringify(BLANK_INTAKE);
    // Do not write an empty brief back to storage (this is what "Clear" relies on).
    if (!isEmpty) saveWorkspace({ intake, strategy, drafts });
  }, [ready, intake, strategy, drafts]);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    saveSettings(next);
  };

  const goTo = useCallback((next: Step) => {
    setError(null);
    setStep(next);
    window.scrollTo({ top: 0 });
  }, []);

  const provider = getProvider(settings.provider);
  const hasAccess = settings.demo || !provider.needsKey || Boolean(settings.apiKey);
  const needsAccess = !hasAccess;

  const buildStrategy = async () => {
    if (needsAccess) {
      setShowSettings(true);
      setError("Add an API key in Settings, or switch on demo mode.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await requestStrategy(intake, settings);
      setStrategy(res.strategy);
      goTo("strategy");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the strategy.");
    } finally {
      setLoading(false);
    }
  };

  const generateDrafts = async (args: { platform: Platform; postTypeIds: string[]; perType: number; instruction: string; batch: Batch }) => {
    if (!strategy) return;
    if (needsAccess) {
      setShowSettings(true);
      setError("Add an API key in Settings, or switch on demo mode.");
      return;
    }
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
      goTo("drafts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write drafts.");
    } finally {
      setLoading(false);
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
  };

  const clearEverything = () => {
    clearAllStoredData();
    setSettings(DEFAULT_SETTINGS);
    setIntake(BLANK_INTAKE);
    setStrategy(null);
    setDrafts([]);
    setStep("intake");
    setError(null);
  };

  const hasStrategy = strategy !== null;
  const reached: Record<Step, boolean> = { intake: true, strategy: hasStrategy, platform: hasStrategy, drafts: hasStrategy };
  const doneSteps: Record<Step, boolean> = {
    intake: hasStrategy,
    strategy: hasStrategy && (step === "platform" || step === "drafts"),
    platform: drafts.length > 0,
    drafts: false,
  };

  return (
    <div className="app" data-step={step}>
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
              {settings.demo ? "Demo mode" : hasAccess ? `Using ${provider.label.replace(/ \(.*\)$/, "")}` : "No API key yet"}
            </span>
          )}
          <button type="button" className="btn secondary small" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
            Settings
          </button>
        </div>
      </header>

      <div className="shell">
        <nav className="rail" aria-label="Steps">
          <ol>
            {STEPS.map((s) => (
              <li key={s.id} className={`step-${s.id}${doneSteps[s.id] ? " is-done" : ""}`}>
                <button
                  type="button"
                  disabled={!reached[s.id]}
                  aria-current={step === s.id ? "step" : undefined}
                  onClick={() => goTo(s.id)}
                >
                  <span className="node">
                    <StepIcon name={doneSteps[s.id] && step !== s.id ? "check" : s.id} />
                  </span>
                  <span className="step-text">
                    <span className="step-label">
                      {s.label}
                      {doneSteps[s.id] && <span className="sr-only"> (done)</span>}
                    </span>
                    <span className="step-hint">{s.hint}</span>
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

          {step === "intake" && (
            <IntakeStep
              intake={intake}
              onChange={setIntake}
              onSubmit={buildStrategy}
              onLoadExample={() => setIntake(THEINTERVIEWS_EXAMPLE)}
              onStartBlank={() => setIntake(BLANK_INTAKE)}
              loading={loading}
              error={error}
            />
          )}

          {step === "strategy" && strategy && (
            <StrategyStep
              intake={intake}
              strategy={strategy}
              onNext={() => goTo("platform")}
              onEditBrief={() => goTo("intake")}
              onRegenerate={buildStrategy}
              loading={loading}
              error={error}
            />
          )}

          {step === "platform" && strategy && (
            <PlatformStep
              intake={intake}
              strategy={strategy}
              loading={loading}
              error={error}
              onGenerate={generateDrafts}
              onBack={() => goTo("strategy")}
              hasDrafts={drafts.length > 0}
              onViewDrafts={() => goTo("drafts")}
            />
          )}

          {step === "drafts" && strategy && (
            <DraftsStep
              intake={intake}
              strategy={strategy}
              drafts={drafts}
              onChangeBody={(id, body) => setDrafts((cur) => cur.map((d) => (d.id === id ? { ...d, body } : d)))}
              onRemove={(id) => setDrafts((cur) => cur.filter((d) => d.id !== id))}
              onRegenerate={regenerate}
              onClear={() => setDrafts([])}
              onAddMore={() => goTo("platform")}
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
