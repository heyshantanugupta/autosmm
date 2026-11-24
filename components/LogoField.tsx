"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { ProjectIdContext } from "@/components/ProjectContext";
import { IMAGE_TOOLS, buildLogoPrompt } from "@/lib/imagePrompt";
import { loadLogo, removeLogo, saveLogo } from "@/lib/logo";
import { readLogoFile } from "@/lib/logoFile";
import type { Intake } from "@/lib/types";

interface Props {
  intake: Intake;
  onChange: (next: Intake) => void;
}

/** Upload the logo (kept in this browser only), or get a prompt to make one if there is none yet. */
export default function LogoField({ intake, onChange }: Props) {
  const projectId = useContext(ProjectIdContext);
  const [logo, setLogo] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogo(loadLogo(projectId));
  }, [projectId]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { dataUrl, colors } = await readLogoFile(file);
      if (!saveLogo(projectId, dataUrl)) throw new Error("The logo could not be saved in this browser.");
      setLogo(dataUrl);
      const next = { ...intake };
      let colorNote = "";
      if (!next.brandColors.trim() && colors.length) {
        next.brandColors = `from my logo: ${colors.join(", ")}`;
        colorNote = " Brand colors were filled in from it. Fix them if they look wrong.";
      }
      onChange(next);
      setNote({ ok: true, text: `Logo saved in this browser only.${colorNote}` });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "That logo could not be used." });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = () => {
    removeLogo(projectId);
    setLogo(null);
    setNote(null);
  };

  const logoPrompt = buildLogoPrompt(intake);
  const copyLogoPrompt = async () => {
    try {
      await navigator.clipboard.writeText(logoPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setNote({ ok: false, text: "Could not copy. Select the prompt and copy it yourself." });
    }
  };

  return (
    <div className="field logo-field">
      <label htmlFor="logoFile">Logo</label>
      <p className="hint">
        Upload it once. It stays in this browser only and is never sent anywhere. Image tools cannot draw your logo
        correctly, so on each post you add it to the picture afterwards.
      </p>
      <div className="logo-row">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="logo-preview" src={logo} alt="Your logo" />
        ) : null}
        <input
          ref={fileRef}
          id="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={!projectId}
          onChange={(e) => upload(e.target.files?.[0])}
        />
        {logo && (
          <button type="button" className="btn secondary small" onClick={remove}>
            Remove logo
          </button>
        )}
      </div>
      {note && (
        <p className={note.ok ? "notice" : "error"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
      <label htmlFor="logoNote" className="logo-note-label">Where it goes, and what it looks like</label>
      <input
        id="logoNote"
        type="text"
        placeholder="bottom-right, white wordmark with a round teal icon"
        value={intake.logoNote}
        onChange={(e) => onChange({ ...intake, logoNote: e.target.value })}
      />

      {!logo && (
        <details className="logo-make">
          <summary>No logo yet? Get a prompt to make one</summary>
          <p className="hint">
            Uses your product name, what it does, your audience, brand colors and style. Image tools often misspell
            names in logos. If that happens, keep the symbol and type the name yourself in a free tool such as Canva.
          </p>
          <textarea className="imgprompt" readOnly rows={9} value={logoPrompt} onFocus={(e) => e.currentTarget.select()} />
          <div className="actions">
            {IMAGE_TOOLS.map((t) => (
              <a
                key={t.id}
                className="btn small"
                href={t.url(logoPrompt)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={copyLogoPrompt}
              >
                Open {t.label}
              </a>
            ))}
            <button type="button" className="btn secondary small" onClick={copyLogoPrompt}>
              {copied ? "Copied" : "Copy prompt"}
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
