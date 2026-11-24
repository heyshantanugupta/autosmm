/** Numbers read off a screenshot of a post. A value is null when the screenshot does not show it. */
export interface ReadMetrics {
  likes: number | null;
  comments: number | null;
  views: number | null;
  /** Anything the reader should double check, in one short sentence. */
  note: string;
}

/** About 4 MB of image. The browser shrinks screenshots well below this before sending. */
export const MAX_IMAGE_CHARS = 5_600_000;

const IMAGE_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

/** Splits a data URL into its type and base64 body, or returns null when it is not a small PNG, JPEG or WebP. */
export function parseImageDataUrl(value: unknown): { mime: string; data: string } | null {
  if (typeof value !== "string" || value.length > MAX_IMAGE_CHARS) return null;
  const m = IMAGE_URL.exec(value);
  return m ? { mime: m[1], data: m[2] } : null;
}

/** A whole, non-negative count, or null for anything else (text, negatives, absurd sizes). */
export function cleanCount(v: unknown): number | null {
  const n = typeof v === "string" && /^[\d,]+$/.test(v.trim()) ? Number(v.replace(/,/g, "")) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 10_000_000_000) return null;
  return Math.round(n);
}

export function cleanMetrics(raw: Record<string, unknown>): ReadMetrics {
  return {
    likes: cleanCount(raw.likes),
    comments: cleanCount(raw.comments),
    views: cleanCount(raw.views),
    note: typeof raw.note === "string" ? raw.note.trim().slice(0, 300) : "",
  };
}
