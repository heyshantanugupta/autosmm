"use client";

import { useState } from "react";

export interface RepurposeTarget {
  id: string;
  label: string;
}

export const REPURPOSE_TARGETS: RepurposeTarget[] = [
  { id: "linkedin:text-post", label: "LinkedIn post" },
  { id: "x:thread", label: "X thread" },
  { id: "instagram:reel-script", label: "Reel script" },
  { id: "linkedin:carousel-outline", label: "Carousel outline" },
];

interface Props {
  loading: boolean;
  progress: string | null;
  error: string | null;
  onRepurpose: (text: string, targets: string[]) => Promise<void>;
}

export default function RepurposeView({ loading, progress, error, onRepurpose }: Props) {
  const [text, setText] = useState("");
  const [targets, setTargets] = useState<string[]>(REPURPOSE_TARGETS.map((t) => t.id));
  const toggle = (id: string) => setTargets((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <section aria-labelledby="repurpose-title">
      <h2 className="group-title" id="repurpose-title">
        Repurpose
      </h2>
      <p className="hint">Paste one idea, blog post or announcement. You get the same message in each format. The drafts appear below, ready to edit.</p>
      <div className="section">
        <div className="field">
          <label htmlFor="repurpose-text">The idea or text</label>
          <textarea id="repurpose-text" rows={7} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <fieldset className="field">
          <legend>Make</legend>
          <div className="chips">
            {REPURPOSE_TARGETS.map((t) => (
              <label key={t.id} className="chip">
                <input type="checkbox" checked={targets.includes(t.id)} onChange={() => toggle(t.id)} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <button type="button" className="btn" disabled={loading || !text.trim() || targets.length === 0} onClick={() => onRepurpose(text, targets)}>
            {loading && progress ? progress : "Repurpose it"}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
