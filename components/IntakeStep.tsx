"use client";

import { useRef, useState } from "react";
import { briefFileName, parseBriefFile, serializeBrief } from "@/lib/briefFile";
import { GOALS, PLATFORMS, type Goal, type Intake, type Platform } from "@/lib/types";

interface Props {
  intake: Intake;
  onChange: (next: Intake) => void;
  onSubmit: () => void;
  onStartBlank: () => void;
  loading: boolean;
  error: string | null;
}

export default function IntakeStep({ intake, onChange, onSubmit, onStartBlank, loading, error }: Props) {
  const set = <K extends keyof Intake>(key: K, value: Intake[K]) => onChange({ ...intake, [key]: value });

  const toggleChannel = (id: Platform) => {
    const has = intake.channels.includes(id);
    set("channels", has ? intake.channels.filter((c) => c !== id) : [...intake.channels, id]);
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileNote, setFileNote] = useState<{ ok: boolean; text: string } | null>(null);

  const saveBrief = () => {
    const url = URL.createObjectURL(new Blob([serializeBrief(intake)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = briefFileName(intake);
    a.click();
    URL.revokeObjectURL(url);
    setFileNote({ ok: true, text: `Saved as ${a.download}. Keep it somewhere safe and load it any time.` });
  };

  const loadBrief = async (file: File | undefined) => {
    if (!file) return;
    const result = parseBriefFile(await file.text());
    if (result.ok) {
      onChange(result.intake);
      setFileNote({ ok: true, text: `Loaded ${file.name}.` });
    } else {
      setFileNote({ ok: false, text: result.error });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const ready = intake.productName.trim().length > 0 && intake.facts.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !loading) onSubmit();
      }}
    >
      <div>
        <h1>Tell the agent about your product</h1>
        <p className="lede">
          The agent writes only from what you enter here. The more specific your facts, the better the strategy and the
          safer the drafts.
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          <button type="button" className="btn quiet small" onClick={onStartBlank}>
            Clear the form
          </button>
          <button type="button" className="btn secondary small" onClick={() => fileRef.current?.click()}>
            Load a saved brief
          </button>
          <button type="button" className="btn secondary small" onClick={saveBrief} disabled={!intake.productName.trim()}>
            Save brief
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Choose a saved brief file"
            onChange={(e) => loadBrief(e.target.files?.[0])}
          />
        </div>
        {fileNote && (
          <p className={fileNote.ok ? "notice" : "error"} role={fileNote.ok ? "status" : "alert"}>
            {fileNote.text}
          </p>
        )}
      </div>

      <div className="section" style={{ marginTop: 28 }}>
        <h2>The product</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="productName">Product name</label>
            <input
              id="productName"
              type="text"
              required
              value={intake.productName}
              onChange={(e) => set("productName", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="url"
              placeholder="https://"
              value={intake.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="oneLiner">What it does, in one sentence</label>
          <input id="oneLiner" type="text" value={intake.oneLiner} onChange={(e) => set("oneLiner", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="facts">Facts the agent may use</label>
          <p className="hint">
            One per line. Features, limits, how it works, prices. Drafts can only make claims that appear here.
          </p>
          <textarea
            id="facts"
            required
            rows={7}
            value={intake.facts}
            onChange={(e) => set("facts", e.target.value)}
            placeholder={"Free plan: 2 practice sessions per week\nResults come with a full transcript"}
          />
        </div>
        <div className="field">
          <label htmlFor="newUpdates">New features or news worth posting about</label>
          <textarea
            id="newUpdates"
            rows={3}
            value={intake.newUpdates}
            onChange={(e) => set("newUpdates", e.target.value)}
          />
        </div>
      </div>

      <div className="section">
        <h2>Who and why</h2>
        <div className="field">
          <label htmlFor="audience">Who you want to reach</label>
          <textarea id="audience" rows={3} value={intake.audience} onChange={(e) => set("audience", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="goal">Main goal</label>
          <select id="goal" value={intake.goal} onChange={(e) => set("goal", e.target.value as Goal)}>
            {GOALS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: "18px 0 0", minWidth: 0 }}>
          <legend className="label" style={{ fontWeight: 600, padding: 0, marginBottom: 8 }}>
            Channels you have
          </legend>
          <div className="chips">
            {PLATFORMS.map((p) => (
              <label className="chip" key={p.id} data-p={p.id}>
                <input type="checkbox" checked={intake.channels.includes(p.id)} onChange={() => toggleChannel(p.id)} />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="currentState">Where the accounts are today</label>
          <p className="hint">Follower counts, what has worked, what has not. Be honest: it shapes the channel advice.</p>
          <textarea
            id="currentState"
            rows={3}
            value={intake.currentState}
            onChange={(e) => set("currentState", e.target.value)}
          />
        </div>
      </div>

      <div className="section">
        <h2>Voice and guardrails</h2>
        <div className="field">
          <label htmlFor="proof">Real proof you can use</label>
          <p className="hint">
            Press mentions, real numbers, real quotes with permission. One per line. Leave empty if you have none: the
            agent will not make any up.
          </p>
          <textarea id="proof" rows={3} value={intake.proof} onChange={(e) => set("proof", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="doNotSay">Never say or do</label>
          <p className="hint">One rule per line. Short phrases are also checked against every draft.</p>
          <textarea id="doNotSay" rows={4} value={intake.doNotSay} onChange={(e) => set("doNotSay", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tone">Tone and style rules</label>
          <input id="tone" type="text" value={intake.tone} onChange={(e) => set("tone", e.target.value)} />
        </div>
      </div>

      {error && (
        <p className="error" role="alert" style={{ marginTop: 20 }}>
          {error}
        </p>
      )}

      <div className="row" style={{ marginTop: 24 }}>
        <button className="btn" type="submit" disabled={!ready || loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Building strategy" : "Build strategy"}
        </button>
        {!ready && <span className="hint" style={{ margin: 0 }}>Product name and at least one fact are required.</span>}
      </div>
    </form>
  );
}
