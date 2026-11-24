/**
 * The logo is kept only in this browser, one per project, as a small PNG. It is never sent to a server and
 * never part of the brief, so it is not in the Intake.
 */
const key = (projectId: string) => `ssa.logo.${projectId}`;
const PNG = "data:image/png;base64,";

export function loadLogo(projectId: string): string | null {
  if (typeof window === "undefined" || !projectId) return null;
  try {
    const v = window.localStorage.getItem(key(projectId));
    return v && v.startsWith(PNG) ? v : null;
  } catch {
    return null;
  }
}

export function saveLogo(projectId: string, dataUrl: string): boolean {
  if (typeof window === "undefined" || !projectId || !dataUrl.startsWith(PNG)) return false;
  try {
    window.localStorage.setItem(key(projectId), dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function removeLogo(projectId: string) {
  if (typeof window === "undefined" || !projectId) return;
  try {
    window.localStorage.removeItem(key(projectId));
  } catch {
    /* ignore */
  }
}

const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();

/**
 * The main colors of a picture, as hex codes. Skips transparent and near-white pixels (a logo's background),
 * groups similar shades, and drops colors that are too close to one already picked.
 */
export function pickColors(data: ArrayLike<number>, max = 3): string[] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    if (r >= 235 && g >= 235 && b >= 235) continue;
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(k, e);
  }
  const ranked = [...buckets.values()].sort((x, y) => y.n - x.n).map((e) => [e.r / e.n, e.g / e.n, e.b / e.n] as const);
  const chosen: (readonly [number, number, number])[] = [];
  for (const c of ranked) {
    if (chosen.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 70)) chosen.push(c);
    if (chosen.length === max) break;
  }
  return chosen.map(([r, g, b]) => `#${hex(r)}${hex(g)}${hex(b)}`);
}
