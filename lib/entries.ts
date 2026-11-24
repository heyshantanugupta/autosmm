import { toText } from "./coerce";
import { isISODate } from "./dates";
import { PLATFORMS, type ResultEntry } from "./types";

const count = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000_000 ? n : 0;
};

/** Clean up results sent from the browser before anything uses them. */
export function parseEntries(raw: unknown): ResultEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 200).flatMap((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const platform = PLATFORMS.find((p) => p.id === o.platform)?.id;
    if (!platform || !isISODate(o.date)) return [];
    return [{
      id: typeof o.id === "string" ? o.id.slice(0, 60) : `r${i}`,
      date: o.date,
      platform,
      label: toText(o.label).slice(0, 120) || "Post",
      themeId: typeof o.themeId === "string" ? o.themeId.slice(0, 60) : undefined,
      postTypeId: typeof o.postTypeId === "string" ? o.postTypeId.slice(0, 60) : undefined,
      likes: count(o.likes),
      comments: count(o.comments),
      views: count(o.views),
    }];
  });
}
