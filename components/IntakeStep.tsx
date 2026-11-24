"use client";

import { useRef, useState } from "react";
import LogoField from "@/components/LogoField";
import { briefFileName, parseBriefFile, serializeBrief } from "@/lib/briefFile";
import { briefStrength } from "@/lib/briefStrength";
import type { ImportedBrief } from "@/lib/importBrief";
import { GOALS, PLATFORMS, type Goal, type Intake, type Platform } from "@/lib/types";

type Level = "required" | "recommended" | "optional";

/** Tells the person at a glance whether a field must be filled in, helps a lot, or can be skipped. */
function Tag({ level, filled }: { level: Level; filled: boolean }) {
  if (level === "required") {
    return filled ? (
      <span className="tag tag-ok"><span aria-hidden="true">&#10003; </span>Done</span>
    ) : (
      <span className="tag tag-need"><span aria-hidden="true">! </span>Required</span>
    );
  }
  return <span className="tag">{level === "recommended" ? "Recommended" : "Optional"}</span>;
}

function FieldLabel({ htmlFor, level, filled, children }: { htmlFor: string; level: Level; filled: boolean; children: React.ReactNode }) {
  return (
    <div className="label-row">
      <label htmlFor={htmlFor}>{children}</label>
      <Tag level={level} filled={filled} />
    </div>
  );
}

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
      for (const key of ["productName", "oneLiner", "website", "audience", "facts", "proof", "newUpdates", "brandColors"] as const) {
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
  const [missingNote, setMissingNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const tryBuild = () => {
    if (loading) return;
    if (ready) {
      setMissingNote("");
      setShowErrors(false);
      onSubmit();
      return;
    }
    setShowErrors(true);
    const noName = intake.productName.trim().length === 0;
    setMissingNote(noName ? "Add your product name first. Then add at least one fact about it." : "Add at least one fact about your product, such as what it does or who it is for. The agent only writes from the facts you give it.");
    document.getElementById(noName ? "productName" : "facts")?.focus();
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        tryBuild();
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
            <FieldLabel htmlFor="productName" level="required" filled={Boolean(intake.productName.trim())}>Product name</FieldLabel>
            <p className="hint" id="productName-hint">What people call it.</p>
            <input
              id="productName"
              type="text"
              required
              aria-describedby="productName-hint"
              aria-invalid={showErrors && !intake.productName.trim()}
              className={showErrors && !intake.productName.trim() ? "invalid" : undefined}
              value={intake.productName}
              onChange={(e) => set("productName", e.target.value)}
            />
          </div>
          <div className="field">
            <FieldLabel htmlFor="website" level="optional" filled={Boolean(intake.website.trim())}>Website</FieldLabel>
            <p className="hint" id="website-hint">Your web address, if you have one.</p>
            <input
              id="website"
              type="url"
              placeholder="https://"
              aria-describedby="website-hint"
              value={intake.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <FieldLabel htmlFor="oneLiner" level="recommended" filled={Boolean(intake.oneLiner.trim())}>What it does, in one sentence</FieldLabel>
          <p className="hint" id="oneLiner-hint">Say it like you would to a friend. Example: a meal planner for busy parents.</p>
          <input id="oneLiner" type="text" aria-describedby="oneLiner-hint" value={intake.oneLiner} onChange={(e) => set("oneLiner", e.target.value)} />
        </div>
        <div className="field">
          <FieldLabel htmlFor="facts" level="required" filled={Boolean(intake.facts.trim())}>Facts the agent may use</FieldLabel>
          <p className="hint" id="facts-hint">
            Things that are true about it, one per line: what it does, how it works, prices, limits. Posts can only say what is listed here.
          </p>
          <textarea
            id="facts"
            required
            rows={7}
            aria-describedby="facts-hint"
            aria-invalid={showErrors && !intake.facts.trim()}
            className={showErrors && !intake.facts.trim() ? "invalid" : undefined}
            value={intake.facts}
            onChange={(e) => set("facts", e.target.value)}
          />
        </div>
        <div className="field">
          <FieldLabel htmlFor="newUpdates" level="optional" filled={Boolean(intake.newUpdates.trim())}>New features or news worth posting about</FieldLabel>
          <p className="hint" id="newUpdates-hint">Anything new you want to announce, one per line. Skip it if there is nothing new.</p>
          <textarea
            id="newUpdates"
            aria-describedby="newUpdates-hint"
            rows={3}
            value={intake.newUpdates}
            onChange={(e) => set("newUpdates", e.target.value)}
          />
        </div>
      </div>

      <div className="section">
        <h2>Who and why</h2>
        <div className="field">
          <FieldLabel htmlFor="audience" level="recommended" filled={Boolean(intake.audience.trim())}>Who you want to reach</FieldLabel>
          <p className="hint" id="audience-hint">Who would use it, and what they are trying to get done.</p>
          <textarea id="audience" aria-describedby="audience-hint" rows={3} value={intake.audience} onChange={(e) => set("audience", e.target.value)} />
        </div>
        <div className="field">
          <FieldLabel htmlFor="goal" level="recommended" filled>Main goal</FieldLabel>
          <p className="hint" id="goal-hint">The one thing you want the posts to do most.</p>
          <select id="goal" aria-describedby="goal-hint" value={intake.goal} onChange={(e) => set("goal", e.target.value as Goal)}>
            {GOALS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: "18px 0 0", minWidth: 0 }}>
          <legend className="label" style={{ fontWeight: 600, padding: 0, marginBottom: 4 }}>
            <span className="label-row">Channels you have <Tag level="recommended" filled={intake.channels.length > 0} /></span>
          </legend>
          <p className="hint">Tick the places you post, or want to start posting.</p>
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
          <FieldLabel htmlFor="currentState" level="optional" filled={Boolean(intake.currentState.trim())}>Where the accounts are today</FieldLabel>
          <p className="hint" id="currentState-hint">Follower counts, what has worked, what has not. Be honest: it shapes the channel advice.</p>
          <textarea
            id="currentState"
            aria-describedby="currentState-hint"
            rows={3}
            value={intake.currentState}
            onChange={(e) => set("currentState", e.target.value)}
          />
        </div>
      </div>

      <div className="section">
        <h2>Voice and guardrails</h2>
        <div className="field">
          <FieldLabel htmlFor="proof" level="optional" filled={Boolean(intake.proof.trim())}>Proof that it works</FieldLabel>
          <p className="hint" id="proof-hint">
            Anything real that backs you up, one per line: an article or review that mentions you, a number you can
            stand behind (like 500 users), or a customer quote you have permission to use. No proof yet? Leave it empty
            and the agent will not make any up.
          </p>
          <textarea id="proof" aria-describedby="proof-hint" rows={3} value={intake.proof} onChange={(e) => set("proof", e.target.value)} />
        </div>
        <div className="field">
          <FieldLabel htmlFor="doNotSay" level="optional" filled={Boolean(intake.doNotSay.trim())}>Never say or do</FieldLabel>
          <p className="hint" id="doNotSay-hint">Words, topics or claims the posts must avoid, one per line. Short phrases are also checked against every draft.</p>
          <textarea id="doNotSay" aria-describedby="doNotSay-hint" rows={4} value={intake.doNotSay} onChange={(e) => set("doNotSay", e.target.value)} />
        </div>
        <div className="field">
          <FieldLabel htmlFor="tone" level="optional" filled={Boolean(intake.tone.trim())}>Tone and style rules</FieldLabel>
          <p className="hint" id="tone-hint">How you want to sound, in a few words. Example: friendly, plain, a little funny.</p>
          <input id="tone" type="text" aria-describedby="tone-hint" value={intake.tone} onChange={(e) => set("tone", e.target.value)} />
        </div>
        <div className="field">
          <FieldLabel htmlFor="voiceSamples" level="optional" filled={Boolean(intake.voiceSamples.trim())}>Your voice</FieldLabel>
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

      <div className="section">
        <h2>Brand look <span className="tag">Optional</span></h2>
        <p className="hint">Used in the image prompts so pictures look like your brand. Image tools cannot read your website, so say it here.</p>
        <div className="field">
          <FieldLabel htmlFor="brandColors" level="optional" filled={Boolean(intake.brandColors.trim())}>Brand colors</FieldLabel>
          <p className="hint" id="brandColors-hint">Your main colors, in words or color codes. Example: deep teal, warm white, coral accent.</p>
          <input
            id="brandColors"
            type="text"
            aria-describedby="brandColors-hint"
            value={intake.brandColors}
            onChange={(e) => set("brandColors", e.target.value)}
          />
        </div>
        <div className="field">
          <FieldLabel htmlFor="visualStyle" level="optional" filled={Boolean(intake.visualStyle.trim())}>How your pictures should look</FieldLabel>
          <p className="hint" id="visualStyle-hint">The look you want. Example: clean and simple, lots of white space, real photos of people working.</p>
          <input
            id="visualStyle"
            type="text"
            aria-describedby="visualStyle-hint"
            value={intake.visualStyle}
            onChange={(e) => set("visualStyle", e.target.value)}
          />
        </div>
        <LogoField intake={intake} onChange={onChange} />
        <div className="field">
          <FieldLabel htmlFor="watermark" level="optional" filled={Boolean(intake.watermark.trim())}>Watermark</FieldLabel>
          <p className="hint" id="watermark-hint">Small text to put on your pictures, like your handle or web address.</p>
          <input
            id="watermark"
            type="text"
            aria-describedby="watermark-hint"
            value={intake.watermark}
            onChange={(e) => set("watermark", e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="error" role="alert" style={{ marginTop: 20 }}>
          {error}
        </p>
      )}

      <div className="row" style={{ marginTop: 24 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Building strategy" : "Build strategy"}
        </button>
        {missingNote && !ready ? (
          <span className="error" role="alert" style={{ margin: 0 }}>{missingNote}</span>
        ) : (
          !ready && <span className="hint" style={{ margin: 0 }}>Product name and at least one fact are required.</span>
        )}
      </div>
    </form>
  );
}
