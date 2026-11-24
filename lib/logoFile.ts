import { pickColors } from "./logo";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 512;

/** Turns an uploaded logo into a small PNG and finds its main colors. Runs in the browser only. */
export async function readLogoFile(file: File): Promise<{ dataUrl: string; colors: string[] }> {
  if (!TYPES.includes(file.type)) throw new Error("Use a PNG, JPG, WebP or SVG file.");
  if (file.size > MAX_BYTES) throw new Error("That file is over 5 MB. Use a smaller version of the logo.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file could not be read as a picture."));
      i.src = url;
    });
    const nw = img.naturalWidth || MAX_SIDE;
    const nh = img.naturalHeight || MAX_SIDE;
    const scale = Math.min(1, MAX_SIDE / Math.max(nw, nh)) || 1;
    const w = Math.max(1, Math.round(nw * scale));
    const h = Math.max(1, Math.round(nh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot read the logo.");
    ctx.drawImage(img, 0, 0, w, h);
    const colors = pickColors(ctx.getImageData(0, 0, w, h).data);
    return { dataUrl: canvas.toDataURL("image/png"), colors };
  } finally {
    URL.revokeObjectURL(url);
  }
}
