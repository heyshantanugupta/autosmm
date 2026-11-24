"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { ProjectIdContext } from "@/components/ProjectContext";
import { parseCorner } from "@/lib/imagePrompt";
import { loadLogo } from "@/lib/logo";
import { stampLayout } from "@/lib/stamp";
import type { Intake } from "@/lib/types";

const MAX_SIDE = 4096;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("That file could not be read as a picture."));
    i.src = src;
  });

/** Adds the owner's real logo and watermark to a picture made by an image tool, and downloads it. All in the browser. */
export default function StampTool({ intake }: { intake: Intake }) {
  const projectId = useContext(ProjectIdContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [picture, setPicture] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mark = intake.watermark.trim();

  useEffect(() => {
    setLogo(loadLogo(projectId));
  }, [projectId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!picture || !canvas) return;
    let cancelled = false;
    (async () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(picture.naturalWidth, picture.naturalHeight));
      const w = Math.round(picture.naturalWidth * scale);
      const h = Math.round(picture.naturalHeight * scale);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(picture, 0, 0, w, h);
      const logoImg = logo ? await loadImage(logo).catch(() => null) : null;
      if (cancelled) return;
      const layout = stampLayout(
        { w, h },
        logoImg ? { w: logoImg.naturalWidth, h: logoImg.naturalHeight } : null,
        parseCorner(intake.logoNote),
        Boolean(mark),
      );
      if (logoImg && layout.logo) ctx.drawImage(logoImg, layout.logo.x, layout.logo.y, layout.logo.w, layout.logo.h);
      if (mark && layout.watermark) {
        ctx.font = `600 ${layout.watermark.size}px system-ui, sans-serif`;
        ctx.textAlign = layout.watermark.align;
        ctx.textBaseline = "alphabetic";
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = Math.round(layout.watermark.size / 3);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText(mark, layout.watermark.x, layout.watermark.y);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [picture, logo, mark, intake.logoNote]);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Choose a picture file.");
    const url = URL.createObjectURL(file);
    try {
      setPicture(await loadImage(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be used.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "post-picture.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  };

  if (!logo && !mark) {
    return (
      <p className="hint">
        After you make the picture, you can add your logo and watermark here. Add them in the Brand look section of your brief first.
      </p>
    );
  }
  return (
    <div className="stamp">
      <label className="imgq-label" htmlFor="stampFile">Got the picture? Add your logo and watermark</label>
      <input id="stampFile" type="file" accept="image/*" onChange={(e) => choose(e.target.files?.[0])} />
      {error && <p className="error" role="alert">{error}</p>}
      {picture && (
        <>
          <canvas ref={canvasRef} className="stamp-canvas" aria-label="Your picture with the logo and watermark added" />
          <button type="button" className="btn small" onClick={download}>
            Download picture
          </button>
        </>
      )}
    </div>
  );
}
