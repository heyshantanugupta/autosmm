"use client";

import { useEffect, useMemo, useState } from "react";
import { PLATFORM_INFO } from "@/lib/postTypes";
import PlatformMark from "./PlatformMark";
import { PLATFORMS, type Batch, type Intake, type Platform, type Strategy } from "@/lib/types";

interface Props {
  intake: Intake;
  strategy: Strategy;
  loading: boolean;
  error: string | null;
  onGenerate: (args: { platform: Platform; postTypeIds: string[]; perType: number; instruction: string; batch: Batch }) => void;
  onBack: () => void;
  hasDrafts: boolean;
  onViewDrafts: () => void;
}

const TONES = ["Plain-spoken", "Friendly", "Professional", "Bold", "Playful", "Technical", "Empathetic"];

export default function PlatformStep({ intake, strategy, loading, error, onGenerate, onBack, hasDrafts, onViewDrafts }: Props) {
  const fitOrder = { high: 0, medium: 1, low: 2 } as const;

  const ordered = useMemo(() => {
    const fitOf = new Map(strategy.platforms.map((p) => [p.platform, p.fit]));
    return [...PLATFORMS]
      .map((p) => ({ ...p, fit: fitOf.get(p.id) }))
      .sort((a, b) => (a.fit ? fitOrder[a.fit] : 3) - (b.fit ? fitOrder[b.fit] : 3));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy]);

  const [platform, setPlatform] = useState<Platform>(ordered[0]?.id ?? "linkedin");
  const [selected, setSelected] = useState<string[]>([]);
  const [perType, setPerType] = useState(1);
  const [instruction, setInstruction] = useState("");
  // Tone, rules and feature are chosen per batch, so they never require editing the brief.
  const [tone, setTone] = useState("");
  const [rules, setRules] = useState("");
  const [feature, setFeature] = useState("");

  // Ideas for the feature box: new updates first, then facts from the brief.
  const featureIdeas = useMemo(() => {
    const split = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);
    return [...split(intake.newUpdates), ...split(intake.facts)].slice(0, 6);
  }, [intake.newUpdates, intake.facts]);

  // Changing platform clears the post-type picks, because the options differ per platform.
  useEffect(() => setSelected([]), [platform]);

  const info = PLATFORM_INFO[platform];
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const noProof = intake.proof.trim().length === 0;
  const total = selected.length * perType;

  return (
    <>
      <div>
        <h1>Pick a platform and post types</h1>
        <p className="lede">The drafts follow your strategy themes and the platform&apos;s norms.</p>
      </div>

      <fieldset className="section plain-fieldset">
        <legend>Platform</legend>
        <div className="tiles">
          {ordered.map((p) => (
            <label className="tile" key={p.id} data-p={p.id}>
              <input type="radio" name="platform" checked={platform === p.id} onChange={() => setPlatform(p.id)} />
              <PlatformMark platform={p.id} />
              <span className="tile-text">
                <span className="title">{p.label}</span>
                {p.fit && <span className={`badge ${p.fit}`}>{p.fit} fit</span>}
                <span className="desc">
                  {strategy.platforms.find((s) => s.platform === p.id)?.role ?? "Not in your strategy. You can still draft for it."}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="section plain-fieldset">
        <legend>Post types for {info.label}</legend>
        <p className="hint">{info.norms}</p>
        <ul className="pick-list">
          {info.postTypes.map((t) => (
            <li key={t.id}>
              <label className="pick">
                <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
                <span>
                  <span className="title">{t.label}</span>
                  <span className="desc" style={{ display: "block" }}>
                    {t.description}
                  </span>
                  {t.needsRealProof && noProof && (
                    <span className="desc" style={{ display: "block", color: "var(--warn)" }}>
                      You added no proof points, so this will be written without any.
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="section batch">
        <div>
          <h2>Tone, rules and focus for this batch</h2>
          <p className="hint" style={{ marginTop: 6 }}>
            These apply only to the drafts you write now and sit on top of your brief. Change them for every batch.
          </p>
        </div>

        <div className="field">
          <label htmlFor="tone">Tone</label>
          <input
            id="tone"
            type="text"
            maxLength={200}
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder={intake.tone ? `Leave empty to use the brief: ${intake.tone}` : "For example: friendly and direct"}
          />
          <div className="qchips" role="group" aria-label="Tone suggestions">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                className="qchip"
                aria-pressed={tone === t}
                onClick={() => setTone(tone === t ? "" : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="rules">Rules for this batch</label>
          <p className="hint">One per line. They add to the brief&apos;s rules and are checked in every draft.</p>
          <textarea
            id="rules"
            rows={3}
            maxLength={1000}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder={"Never mention pricing\nKeep it under 120 words\nEnd with a question"}
          />
        </div>

        <div className="field">
          <label htmlFor="feature">Feature or update to outline</label>
          <p className="hint">Describe it in your own words. Drafts may use anything you write here as a fact.</p>
          <textarea
            id="feature"
            rows={3}
            maxLength={1000}
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            placeholder={`For example: what ${intake.productName.trim() || "your product"} can do now, or the update you want to talk about.`}
          />
          {featureIdeas.length > 0 && (
            <div className="qchips" role="group" aria-label="Pick from your brief">
              {featureIdeas.map((f) => (
                <button key={f} type="button" className="qchip" title={f} aria-pressed={feature === f} onClick={() => setFeature(feature === f ? "" : f)}>
                  {f.length > 64 ? `${f.slice(0, 61).trimEnd()}...` : f}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="perType">Drafts per post type</label>
            <select id="perType" value={perType} onChange={(e) => setPerType(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="instruction">Anything else for this batch? (optional)</label>
          <input
            id="instruction"
            type="text"
            maxLength={500}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={intake.audience.trim() ? `For example: write for ${intake.audience.trim().split(/[.\n]/)[0].slice(0, 60)} only` : "For example: keep it shorter and lead with the main benefit"}
          />
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={selected.length === 0 || loading}
          onClick={() => onGenerate({ platform, postTypeIds: selected, perType, instruction, batch: { tone: tone.trim(), rules: rules.trim(), feature: feature.trim() } })}
        >
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Writing drafts" : `Write ${total || ""} draft${total === 1 ? "" : "s"}`.replace("  ", " ")}
        </button>
        {hasDrafts && (
          <button type="button" className="btn secondary" onClick={onViewDrafts}>
            Back to my drafts
          </button>
        )}
        <button type="button" className="btn quiet" onClick={onBack}>
          Back to this week
        </button>
      </div>
    </>
  );
}
