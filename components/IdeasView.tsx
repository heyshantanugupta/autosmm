"use client";

import { useState } from "react";
import type { HashtagResult } from "@/lib/client";
import { copyText } from "@/lib/clipboard";
import { PLATFORMS, type Platform } from "@/lib/types";

interface Props {
  mode: "hooks" | "hashtags";
  channels: Platform[];
  onHooks: (topic: string) => Promise<string[]>;
  onHashtags: (topic: string, platforms: Platform[]) => Promise<HashtagResult[]>;
}

export default function IdeasView({ mode, channels, onHooks, onHashtags }: Props) {
  const [topic, setTopic] = useState("");
  const [picked, setPicked] = useState<Platform[]>(channels.slice(0, 3));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hooks, setHooks] = useState<string[]>([]);
  const [sets, setSets] = useState<HashtagResult[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const toggle = (id: Platform) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const copy = async (key: string, text: string) => {
    await copyText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "hooks") setHooks(await onHooks(topic));
      else setSets(await onHashtags(topic, picked));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const isHooks = mode === "hooks";
  return (
    <section aria-labelledby={`${mode}-title`}>
      <h2 className="group-title" id={`${mode}-title`}>
        {isHooks ? "Hook lab" : "Hashtags and keywords"}
      </h2>
      <p className="hint">
        {isHooks
          ? "Ten opening lines for one post. Pick the strongest, or mix two."
          : "Tags and search words for one post, with the right amount for each platform."}
      </p>
      <div className="section">
        <div className="field">
          <label htmlFor={`${mode}-topic`}>{isHooks ? "What is the post about?" : "What is the post about, or paste it"}</label>
          <textarea id={`${mode}-topic`} rows={3} maxLength={3000} value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        {!isHooks && (
          <fieldset className="field">
            <legend>Platforms</legend>
            <div className="chips">
              {PLATFORMS.map((p) => (
                <label key={p.id} className="chip">
                  <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="row">
          <button type="button" className="btn" onClick={run} disabled={busy || !topic.trim() || (!isHooks && picked.length === 0)}>
            {busy ? "Working..." : isHooks ? "Write 10 hooks" : "Suggest tags"}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      {isHooks && hooks.length > 0 && (
        <ol className="hook-list" aria-label="Opening lines">
          {hooks.map((h, i) => (
            <li key={i}>
              <span>{h}</span>
              <button type="button" className="icon-link" onClick={() => copy(`h${i}`, h)}>
                {copied === `h${i}` ? "Copied" : "Copy"}
              </button>
            </li>
          ))}
        </ol>
      )}

      {!isHooks && sets.length > 0 && (
        <div className="drafts-list">
          {sets.map((s) => {
            const tags = s.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
            return (
              <article className="sheet reply-card" key={s.platform} aria-label={`${s.platform} tags`}>
                <h3 className="reply-label">{PLATFORMS.find((p) => p.id === s.platform)?.label ?? s.platform}</h3>
                {s.advice && <p className="hint">{s.advice}</p>}
                <dl className="meta">
                  <dt>Hashtags</dt>
                  <dd>{tags || "None for this platform"}</dd>
                  <dt>Keywords</dt>
                  <dd>{s.keywords.join(", ") || "None"}</dd>
                </dl>
                {tags && (
                  <div className="row">
                    <button type="button" className="btn secondary small" onClick={() => copy(s.platform, tags)}>
                      {copied === s.platform ? "Copied" : "Copy hashtags"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
