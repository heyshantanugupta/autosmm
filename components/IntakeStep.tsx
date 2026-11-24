"use client";

import { useRef, useState } from "react";
import { briefFileName, parseBriefFile, serializeBrief } from "@/lib/briefFile";
import { briefStrength } from "@/lib/briefStrength";
import type { ImportedBrief } from "@/lib/importBrief";
import { GOALS, PLATFORMS, type Goal, type Intake, type Platform } from "@/lib/types";

interface Props {
  intake: Intake;
  onChange: (next: Intake) => void;
  onSubmit: () => void;
  onStartBlank: () => void;
  onImport: (url: string) => Promise<{ brief: ImportedBrief; demo: boolean }>;
  loading: boolean;
  error: string | null;
}

export default function IntakeStep({ intake, onChange, onSubmit, onStartBlank, onImport, loading, error }: Props) {
  const set = <K extends keyof Intake>(key: K, value: Intake[K]) => onChange({ ...intake, [key]: value });

  const toggleChannel = (id: Platform) => {
    const has = intake.channels.includes(id);
    set("channels", has ? intake.channels.filter((c) => c !== id) : [...intake.channels, id]);
  };

  const strength = briefStrength(intake);
  const [siteUrl, setSiteUrl] = useState(intake.website);
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<{ ok: boolean; text: string; missing?: string[] } | null>(null);

  // Fill only the fields that are still empty, so nothing the user typed is overwritten.
  const importFromSite = async () => {
    setImporting(true);
    setImportNote(null);
    try {
      const { brief, demo } = await onImport(siteUrl);
      const next = { ...intake };
      let filled = 0;
      for (const key of ["productName", "oneLiner", "website", "audience", "facts", "proof", "newUpdates"] as const) {
        if (!next[key].trim() && brief[key]) {
          next[key] = brief[key];
          filled++;
        }
      }
      onChange(next);
      const parts = [`Filled ${filled} ${filled === 1 ? "field" : "fields"} from your website. Read each one and fix anything that is wrong before you continue.`];
      if (demo) parts.push("Demo mode only copies the page title, description and headings. Turn it off and add a key for a fuller brief.");
      if (brief.dropped > 0) parts.push(`${brief.dropped} ${brief.dropped === 1 ? "statement was" : "statements were"} left out because the page does not say them.`);
      setImportNote({ ok: true, text: parts.join(" "), missing: brief.missing });
    } catch (e) {
      setImportNote({ ok: false, text: e instanceof Error ? e.message : "Could not read that website." });
    } finally {
      setImporting(false);
    }
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
        <div className="strength" style={{ marginTop: 14 }}>
          <div className="strength-head">
            <span id="strength-label">Brief strength: {strength.label}</span>
            <span aria-hidden="true">{strength.score}%</span>
          </div>
          <div className="meter" role="meter" aria-labelledby="strength-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={strength.score}>
            <span style={{ width: `${strength.score}%` }} />
          </div>
          {strength.next && <p className="hint">{strength.next}</p>}
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="site-url">Start from your website</label>
          <p className="hint" id="site-url-hint">
            Paste your website address and the agent fills in a first draft of the brief from what the page says. It only
            reads the page, and nothing is saved.
          </p>
          <div className="row">
            <input
              id="site-url"
              type="text"
              inputMode="url"
              placeholder="yourproduct.com"
              aria-describedby="site-url-hint"
              autoComplete="off"
              spellCheck={false}
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (siteUrl.trim() && !importing) importFromSite();
                }
              }}
              style={{ flex: "1 1 240px" }}
            />
            <button type="button" className="btn" onClick={importFromSite} disabled={!siteUrl.trim() || importing}>
              {importing ? "Reading..." : "Fill in my brief"}
            </button>
          </div>
          {importNote && (
            <div className={importNote.ok ? "notice" : "error"} role={importNote.ok ? "status" : "alert"} style={{ marginTop: 8 }}>
              {importNote.text}
              {importNote.ok && importNote.missing && importNote.missing.length > 0 && (
                <>
                  {" "}Not on the page, so add these yourself if they apply: {importNote.missing.join(", ")}.
                </>
              )}
            </div>
          )}
        </div>
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
        <div className="field">
          <label htmlFor="voiceSamples">Your voice (optional)</label>
          <p className="hint">
            Paste 3 to 5 of your own past posts, separated by a blank line. Drafts will copy how you write. Facts in
            them are never reused.
          </p>
          <textarea
            id="voiceSamples"
            rows={5}
            value={intake.voiceSamples}
            onChange={(e) => set("voiceSamples", e.target.value)}
          />
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
