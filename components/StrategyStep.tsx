"use client";

import { PLATFORM_INFO } from "@/lib/postTypes";
import { useState } from "react";
import { getDesktop } from "@/lib/desktop";
import { buildReport, reportFileName, reportToDocx, reportToHtml } from "@/lib/report";
import type { Intake, Strategy } from "@/lib/types";
import PlatformMark from "./PlatformMark";

interface Props {
  intake: Intake;
  strategy: Strategy;
  onNext: () => void;
  onEditBrief: () => void;
  onRegenerate: () => void;
  loading: boolean;
  error: string | null;
}

export default function StrategyStep({ intake, strategy, onNext, onEditBrief, onRegenerate, loading, error }: Props) {
  const [exportNote, setExportNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [docxBusy, setDocxBusy] = useState(false);

  const downloadDocx = async () => {
    setDocxBusy(true);
    try {
      const blob = await reportToDocx(buildReport(intake, strategy));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(intake, "docx");
      a.click();
      URL.revokeObjectURL(url);
      setExportNote({ ok: true, text: `Saved ${a.download}.` });
    } catch {
      setExportNote({ ok: false, text: "Could not create the Word file. Try the PDF option instead." });
    } finally {
      setDocxBusy(false);
    }
  };

  // Prints a clean copy of the report in a hidden frame, so the person can choose "Save as PDF".
  const downloadPdf = async () => {
    const desktop = getDesktop();
    if (desktop) {
      try {
        const result = await desktop.savePdf(reportToHtml(buildReport(intake, strategy)), reportFileName(intake, "pdf"));
        if (result.ok) setExportNote({ ok: true, text: `Saved the PDF to ${result.path}.` });
        else setExportNote(null);
      } catch {
        setExportNote({ ok: false, text: "Could not save the PDF. Try the Word option instead." });
      }
      return;
    }
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    frame.srcdoc = reportToHtml(buildReport(intake, strategy));
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    };
    document.body.appendChild(frame);
    setExportNote({ ok: true, text: "In the print window, choose Save as PDF as the destination." });
  };

  return (
    <>
      <div>
        <h1>Your strategy</h1>
        <p className="lede">{strategy.summary}</p>
      </div>

      <div className="strategy-grid">
      <div className="section positioning span-2">
        <h2>Positioning</h2>
        <p>{strategy.positioning}</p>
      </div>

      <div className="section span-2">
        <h2>Who you are talking to</h2>
        <div className="defs">
          {strategy.audiences.map((a, i) => (
            <div className="def" key={`${i}-${a.name}`}>
              <h3>{a.name}</h3>
              <p>
                <strong>Struggle:</strong> {a.pain}
              </p>
              <p>
                <strong>Say:</strong> {a.message}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="section span-2">
        <h2>Content themes</h2>
        <div className="defs">
          {strategy.themes.map((t, i) => (
            <div className="def" key={`${i}-${t.id}`}>
              <h3>{t.name}</h3>
              <p>{t.why}</p>
              <p>
                <strong>Example:</strong> {t.exampleAngle}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="section span-2">
        <h2>Where to post</h2>
        <div className="defs">
          {strategy.platforms.map((p, i) => (
            <div className="def" key={`${i}-${p.platform}`}>
              <h3 className="def-title">
                <PlatformMark platform={p.platform} small />
                {PLATFORM_INFO[p.platform].label} <span className={`badge ${p.fit}`}>{p.fit} fit</span>
              </h3>
              <p>
                <strong>Role:</strong> {p.role}
              </p>
              <p>
                <strong>Cadence:</strong> {p.cadence}
              </p>
              <p>{p.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Weekly rhythm</h2>
        <p>{strategy.weeklyRhythm}</p>
      </div>

      {strategy.measurement.length > 0 && (
      <div className="section tint-ok">
        <h2>What to measure</h2>
        <ul className="plain-list">
          {strategy.measurement.map((m, i) => (
            <li key={`${i}-${m}`}>{m}</li>
          ))}
        </ul>
      </div>
      )}

      {strategy.risks.length > 0 && (
      <div className="section tint-warn">
        <h2>Risks to avoid</h2>
        <ul className="plain-list">
          {strategy.risks.map((r, i) => (
            <li key={`${i}-${r}`}>{r}</li>
          ))}
        </ul>
      </div>
      )}

      {strategy.gaps.length > 0 && (
        <div className="section tint-info">
          <h2>Missing information</h2>
          <p className="hint">Add these to your brief and rebuild the strategy to sharpen it.</p>
          <ul className="plain-list">
            {strategy.gaps.map((g, i) => (
              <li key={`${i}-${g}`}>{g}</li>
            ))}
          </ul>
        </div>
      )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row">
        <button type="button" className="btn" onClick={onNext}>
          Plan my 30 days
        </button>
        <button type="button" className="btn secondary" onClick={onRegenerate} disabled={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Rebuilding" : "Rebuild strategy"}
        </button>
        <button type="button" className="btn quiet" onClick={onEditBrief}>
          Edit brief
        </button>
      </div>

      <div className="row export">
        <span className="export-label">Download this report</span>
        <button type="button" className="btn secondary small" onClick={downloadPdf}>
          PDF
        </button>
        <button type="button" className="btn secondary small" onClick={downloadDocx} disabled={docxBusy}>
          {docxBusy ? "Preparing" : "Word (.docx)"}
        </button>
      </div>
      {exportNote && (
        <p className={exportNote.ok ? "notice" : "error"} role={exportNote.ok ? "status" : "alert"}>
          {exportNote.text}
        </p>
      )}
    </>
  );
}
