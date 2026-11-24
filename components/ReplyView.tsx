"use client";

import { useState } from "react";
import type { ReplyResult } from "@/lib/client";
import SubNav from "./SubNav";
import { copyText } from "@/lib/clipboard";
import { PLATFORMS, type Platform } from "@/lib/types";

interface Props {
  onReply: (message: string, platform: Platform | undefined, kind: "message" | "review") => Promise<ReplyResult>;
}

const KIND_LABEL = { question: "A question", praise: "Praise", complaint: "A complaint", other: "A comment" } as const;

export default function ReplyView({ onReply }: Props) {
  const [kind, setKind] = useState<"message" | "review">("message");
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReplyResult | null>(null);
  const [texts, setTexts] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await onReply(message, platform || undefined, kind);
      setResult(r);
      setTexts(r.replies.map((x) => x.text));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Could not write replies.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (i: number) => {
    await copyText(texts[i]);
    setCopied(i);
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1800);
  };

  return (
    <>
      <div>
        <h1>Reply</h1>
        <p className="lede">Paste a comment, message or review. You get three replies in your voice. Pick one, change it, and send it yourself. Nothing is sent for you.</p>
      </div>
      <SubNav
        label="What are you replying to"
        value={kind}
        options={[
          { id: "message", label: "Comment or message" },
          { id: "review", label: "Negative review" },
        ]}
        onChange={(k) => {
          setKind(k);
          setResult(null);
        }}
      />
      {kind === "review" && (
        <p className="notice">
          Replies stay calm, do not argue, do not admit fault or promise refunds, and move the details to a private message. Read the review twice before you answer.
        </p>
      )}
      <div className="section">
        <div className="field">
          <label htmlFor="reply-msg">{kind === "review" ? "The review" : "The comment or message"}</label>
          <textarea id="reply-msg" rows={4} maxLength={1500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Paste it here" />
        </div>
        <div className="field">
          <label htmlFor="reply-platform">Where did it come from? (optional)</label>
          <select id="reply-platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform | "")}>
            <option value="">Not sure</option>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={run} disabled={busy || !message.trim()}>
            {busy ? "Writing..." : "Write 3 replies"}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      {result && (
        <section aria-labelledby="replies-title">
          <h2 className="group-title" id="replies-title">
            {KIND_LABEL[result.category]}
          </h2>
          {result.needsHuman && (
            <p className="notice warn" role="status">
              {result.why || "Read this one carefully before you reply."} Check every word of the reply before you send it.
            </p>
          )}
          <div className="drafts-list">
            {result.replies.map((r, i) => (
              <article className="sheet reply-card" key={i} aria-label={`${r.label} reply`}>
                <h3 className="reply-label">{r.label}</h3>
                <textarea aria-label={`${r.label} reply text`} rows={4} value={texts[i] ?? ""} onChange={(e) => setTexts((cur) => cur.map((t, j) => (j === i ? e.target.value : t)))} />
                {r.warnings.map((w) => (
                  <p className="notice warn" key={w}>{w}</p>
                ))}
                <div className="row">
                  <button type="button" className="btn secondary small" onClick={() => copy(i)}>
                    {copied === i ? "Copied" : "Copy reply"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
