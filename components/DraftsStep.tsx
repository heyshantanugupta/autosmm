"use client";

import PlatformMark from "./PlatformMark";
import { useMemo, useState } from "react";
import { applyBatch } from "@/lib/batch";
import { checkDraft } from "@/lib/claims";
import { PLATFORM_INFO, getPostType } from "@/lib/postTypes";
import { composeTarget } from "@/lib/compose";
import { IMAGE_TOOLS, buildImagePrompt } from "@/lib/imagePrompt";
import { LINK_PLACEMENT, cleanSlug, trackedUrl } from "@/lib/tracking";
import type { Draft, Intake, Strategy } from "@/lib/types";

type ApprovalKey = "claims" | "link" | "tone" | "read";
const APPROVAL_ITEMS: { key: ApprovalKey; label: string }[] = [
  { key: "claims", label: "Claims and numbers are true" },
  { key: "link", label: "Link works (or there is no link)" },
  { key: "tone", label: "Sounds like me" },
  { key: "read", label: "I read it out loud once" },
];

interface Props {
  intake: Intake;
  strategy: Strategy;
  drafts: Draft[];
  onChangeBody: (id: string, body: string) => void;
  onApproval: (id: string, key: ApprovalKey, value: boolean) => void;
  onRemove: (id: string) => void;
  onRegenerate: (draft: Draft, instruction: string) => Promise<void>;
  onClear: () => void;
  onAddMore: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

function DraftSheet({
  draft,
  intake,
  themeName,
  onChangeBody,
  onApproval,
  onRemove,
  onRegenerate,
}: {
  draft: Draft;
  intake: Intake;
  themeName: string;
  onChangeBody: (id: string, body: string) => void;
  onApproval: (id: string, key: ApprovalKey, value: boolean) => void;
  onRemove: (id: string) => void;
  onRegenerate: (draft: Draft, instruction: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevise, setShowRevise] = useState(false);
  const [instruction, setInstruction] = useState("");

  const info = PLATFORM_INFO[draft.platform];
  const type = getPostType(draft.platform, draft.postTypeId);
  const limit = type && !type.multiPart ? info.limit : undefined;
  const length = draft.body.length;
  const over = limit !== undefined && length > limit;

  // Checks re-run on every edit, so the margin notes always describe the text on the page.
  const checks = useMemo(
    () => checkDraft({ body: draft.body, claimsUsed: draft.claimsUsed }, applyBatch(intake, draft.batch)),
    [draft.body, draft.claimsUsed, draft.batch, intake],
  );

  const hasWarnings = checks.some((c) => c.level === "warn");
  const doneCount = APPROVAL_ITEMS.filter((it) => draft.approval?.[it.key] || (it.key === "claims" && !hasWarnings)).length;
  const ready = doneCount === APPROVAL_ITEMS.length;

  const copy = async () => {
    const ok = await copyText(draft.body);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  };

  const [wantsImage, setWantsImage] = useState<boolean | null>(null);
  const [imgNote, setImgNote] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const imagePrompt = useMemo(() => buildImagePrompt(draft, intake), [draft, intake]);
  const copyPrompt = async () => {
    const ok = await copyText(imagePrompt);
    setPromptCopied(ok);
    if (ok) setTimeout(() => setPromptCopied(false), 1800);
  };
  const openImageTool = async (tool: (typeof IMAGE_TOOLS)[number]) => {
    const ok = await copyText(imagePrompt);
    window.open(tool.url(imagePrompt), "_blank", "noopener,noreferrer");
    setImgNote(
      tool.prefills && ok
        ? `Opened ${tool.label} with the prompt filled in. The prompt is also copied.`
        : ok
          ? `Prompt copied and ${tool.label} opened. Paste it into the chat with Ctrl+V (Cmd+V on Mac).`
          : `${tool.label} opened, but the prompt could not be copied. Use Copy prompt below.`,
    );
  };

  const [posted, setPosted] = useState<string | null>(null);
  // Copies the post first, then opens the platform. The person still presses Post themselves.
  const openPlatform = async () => {
    const target = composeTarget(draft.platform, draft.body);
    const copiedOk = await copyText(draft.body);
    window.open(target.url, "_blank", "noopener,noreferrer");
    const name = PLATFORM_INFO[draft.platform].label;
    setPosted(
      target.prefilled
        ? `Opened ${name} with your text filled in. Check it, then press Post there.`
        : copiedOk
          ? `Post copied and ${name} opened. If the box is empty, paste with Ctrl+V (Cmd+V on Mac), then press Post.`
          : `${name} opened, but the post could not be copied. Use Copy post, then paste it there.`,
    );
  };

  const regenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      await onRegenerate(draft, instruction);
      setShowRevise(false);
      setInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rewrite this draft.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="sheet" id={`draft-${draft.id}`} data-p={draft.platform} aria-label={`${draft.postTypeLabel} draft`}>
      <aside className="margin" aria-label="Checks">
        <div>
          <h4>Checks</h4>
          {checks.map((c, i) => (
            <p className={`note ${c.level}`} key={i}>
              <span className="mark" aria-hidden="true">
                {c.level === "ok" ? "✓" : "!"}
              </span>
              <span>
                <span className="sr-only">{c.level === "ok" ? "Passed: " : "Check this: "}</span>
                {c.message}
              </span>
            </p>
          ))}
        </div>
        {draft.claimsUsed.length > 0 && (
          <div>
            <h4>Facts this draft relies on</h4>
            <ul className="plain-list">
              {draft.claimsUsed.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {draft.notes && (
          <div>
            <h4>Before you post</h4>
            <p>{draft.notes}</p>
          </div>
        )}
      </aside>

      <div className="paper">
        <div className="paper-head">
          <div className="ph-title">
            <PlatformMark platform={draft.platform} small />
            <div>
              <h3>{draft.postTypeLabel}</h3>
              {themeName && <span className="hint">Theme: {themeName}</span>}
            </div>
          </div>
          <span className={`counter${over ? " over" : ""}`} aria-live="polite">
            {limit !== undefined ? `${length} / ${limit}` : `${length} characters`}
            {over ? " (over the limit)" : ""}
          </span>
        </div>

        <label className="sr-only" htmlFor={`body-${draft.id}`}>
          Post text
        </label>
        <textarea
          id={`body-${draft.id}`}
          value={draft.body}
          rows={Math.min(22, Math.max(8, draft.body.split("\n").length + 2))}
          onChange={(e) => onChangeBody(draft.id, e.target.value)}
        />

        <dl className="meta">
          {draft.batch?.tone.trim() && (
            <>
              <dt>Tone</dt>
              <dd>{draft.batch.tone.trim()}</dd>
            </>
          )}
          {draft.batch?.feature.trim() && (
            <>
              <dt>Feature</dt>
              <dd>{draft.batch.feature.trim()}</dd>
            </>
          )}
          {draft.batch?.rules.trim() && (
            <>
              <dt>Rules</dt>
              <dd>{draft.batch.rules.trim().split("\n").filter(Boolean).join("; ")}</dd>
            </>
          )}
          {draft.hashtags.length > 0 && (
            <>
              <dt>Hashtags</dt>
              <dd>{draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</dd>
            </>
          )}
          {draft.linkSlug && (
            <>
              <dt>Tracked link</dt>
              <dd>
                Create a link with the slug <span className="slug">{draft.linkSlug}</span> to see clicks for this post.
              </dd>
            </>
          )}
          {draft.bestTime && (
            <>
              <dt>Timing</dt>
              <dd>{draft.bestTime}</dd>
            </>
          )}
          {draft.visualIdea && (
            <>
              <dt>Visual</dt>
              <dd>{draft.visualIdea}</dd>
            </>
          )}
        </dl>

        {draft.linkSlug && (
          <TrackedLinkHelp
            draft={draft}
            website={intake.website}
            onAppend={(url) => onChangeBody(draft.id, `${draft.body.trimEnd()}\n\n${url}`)}
          />
        )}

        {showRevise && (
          <div className="field">
            <label htmlFor={`rev-${draft.id}`}>What should change? (optional)</label>
            <input
              id={`rev-${draft.id}`}
              type="text"
              maxLength={500}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="For example: shorter, and lead with the free plan"
            />
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="imgq">
          <p className="imgq-q" id={`img-${draft.id}`}>Do you want to generate an image for this post?</p>
          <div className="seg" role="group" aria-labelledby={`img-${draft.id}`}>
            <button type="button" className={`seg-btn${wantsImage === true ? " on" : ""}`} aria-pressed={wantsImage === true} onClick={() => setWantsImage(true)}>
              Yes
            </button>
            <button type="button" className={`seg-btn${wantsImage === false ? " on" : ""}`} aria-pressed={wantsImage === false} onClick={() => { setWantsImage(false); setImgNote(null); }}>
              No
            </button>
          </div>
          {wantsImage && (
            <div className="imgbox">
              <div className="actions">
                {IMAGE_TOOLS.map((t) => (
                  <button key={t.id} type="button" className="btn small" onClick={() => openImageTool(t)}>
                    Generate with {t.label}
                  </button>
                ))}
              </div>
              {imgNote && <p className="notice" role="status">{imgNote}</p>}
              <label className="imgq-label" htmlFor={`prompt-${draft.id}`}>Or copy this prompt into any AI chat</label>
              <textarea id={`prompt-${draft.id}`} className="imgprompt" readOnly rows={8} value={imagePrompt} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="btn secondary small" onClick={copyPrompt}>
                {promptCopied ? "Copied" : "Copy prompt"}
              </button>
            </div>
          )}
        </div>

        <fieldset className="approval">
          <legend>Approve this post</legend>
          {APPROVAL_ITEMS.map((it) => {
            const auto = it.key === "claims" && !hasWarnings;
            const on = Boolean(draft.approval?.[it.key]) || auto;
            return (
              <label key={it.key} className="approval-item">
                <input type="checkbox" checked={on} disabled={auto} onChange={(e) => onApproval(draft.id, it.key, e.target.checked)} />
                <span>{it.label}</span>
              </label>
            );
          })}
          <p className={`approval-state${ready ? " ready" : ""}`} role="status">
            {ready ? "Ready to post" : `${APPROVAL_ITEMS.length - doneCount} to check`}
          </p>
        </fieldset>

        <div className="actions">
          <button type="button" className="btn small" onClick={copy}>
            {copied ? "Copied" : "Copy post"}
          </button>
          <button type="button" className="btn small post" onClick={openPlatform}>
            Post on {PLATFORM_INFO[draft.platform].label}
          </button>
          {showRevise ? (
            <>
              <button type="button" className="btn secondary small" onClick={regenerate} disabled={busy}>
                {busy && <span className="spinner" aria-hidden="true" />}
                {busy ? "Rewriting" : "Rewrite"}
              </button>
              <button type="button" className="btn quiet small" onClick={() => setShowRevise(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn secondary small" onClick={() => setShowRevise(true)}>
              Rewrite this draft
            </button>
          )}
          <button type="button" className="btn quiet small" onClick={() => onRemove(draft.id)}>
            Remove
          </button>
        </div>
        {posted && (
          <p className="notice" role="status">
            {posted}
          </p>
        )}
      </div>
    </article>
  );
}

function TrackedLinkHelp({
  draft,
  website,
  onAppend,
}: {
  draft: Draft;
  website: string;
  onAppend: (url: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = trackedUrl(website, draft.platform, draft.linkSlug);
  const slug = cleanSlug(draft.linkSlug);
  const inPost = url ? draft.body.includes(url) : false;

  const copyLink = async () => {
    if (!url) return;
    const ok = await copyText(url);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  };

  return (
    <details className="track">
      <summary>How to set up this tracked link</summary>
      <div className="track-body">
        <p>
          A tracked link is your website address with a label added, so your analytics can tell which post brought each
          visit. Use this one for this post only.
        </p>
        {url ? (
          <>
            <p className="track-url">{url}</p>
            <div className="actions">
              <button type="button" className="btn small" onClick={copyLink}>
                {copied ? "Copied" : "Copy tracked link"}
              </button>
              <button type="button" className="btn secondary small" onClick={() => onAppend(url)} disabled={inPost}>
                {inPost ? "Link is in the post" : "Add link to end of post"}
              </button>
            </div>
          </>
        ) : (
          <p className="notice">Add your website in the brief to get a ready-made link. The label for this post is {slug || "not set"}.</p>
        )}
        <ol>
          <li>Copy the link above. It already carries this post&apos;s label ({slug || "none"}).</li>
          <li>{LINK_PLACEMENT[draft.platform]}</li>
          <li>Open the link once yourself and check that the page loads normally.</li>
          <li>
            Later, in Google Analytics, open Reports, then Acquisition, then Traffic acquisition. Switch the first column
            to Session campaign and look for {slug || "the label"}. If your site uses a different analytics tool, any tool
            that reads UTM tags will show the same label.
          </li>
          <li>Never reuse one tracked link on two posts, or you cannot tell them apart.</li>
        </ol>
      </div>
    </details>
  );
}

function toMarkdown(drafts: Draft[], intake: Intake): string {
  const parts: string[] = [`# ${intake.productName}: social drafts`, ""];
  for (const d of drafts) {
    parts.push(`## ${PLATFORM_INFO[d.platform].label}: ${d.postTypeLabel}`, "", d.body.trim(), "");
    if (d.hashtags.length) parts.push(`Hashtags: ${d.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`, "");
    if (d.linkSlug) parts.push(`Tracked link slug: ${d.linkSlug}`, "");
    if (d.visualIdea) parts.push(`Visual: ${d.visualIdea}`, "");
    if (d.bestTime) parts.push(`Timing: ${d.bestTime}`, "");
    parts.push("---", "");
  }
  return parts.join("\n");
}

export default function DraftsStep({ intake, strategy, drafts, onChangeBody, onApproval, onRemove, onRegenerate, onClear, onAddMore }: Props) {
  const themeName = (id: string) => strategy.themes.find((t) => t.id === id)?.name ?? "";

  const groups = useMemo(() => {
    const map = new Map<string, Draft[]>();
    for (const d of drafts) map.set(d.platform, [...(map.get(d.platform) ?? []), d]);
    return [...map.entries()];
  }, [drafts]);

  const download = () => {
    const blob = new Blob([toMarkdown(drafts, intake)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "social-drafts.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div>
        <h1>Your drafts</h1>
        <p className="lede">
          Edit anything, then copy it into the platform and post it yourself. Nothing here posts for you. The checks in
          the margin re-run as you type.
        </p>
      </div>

      <div className="row">
        <button type="button" className="btn" onClick={onAddMore}>
          Write more drafts
        </button>
        <button type="button" className="btn secondary" onClick={download} disabled={drafts.length === 0}>
          Download all as Markdown
        </button>
        <button type="button" className="btn quiet" onClick={onClear} disabled={drafts.length === 0}>
          Clear all drafts
        </button>
      </div>

      {drafts.length === 0 && <p className="notice">No drafts yet. Choose a platform and post types to write some.</p>}

      {groups.map(([platform, list]) => (
        <section key={platform}>
          <h2 className="group-title">
            <PlatformMark platform={platform as Draft["platform"]} small />
            {PLATFORM_INFO[platform as Draft["platform"]].label}
          </h2>
          <div className="drafts-list">
            {list.map((d) => (
              <DraftSheet
                key={d.id}
                draft={d}
                intake={intake}
                themeName={themeName(d.themeId)}
                onChangeBody={onChangeBody}
                onApproval={onApproval}
                onRemove={onRemove}
                onRegenerate={onRegenerate}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
