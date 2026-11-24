export interface SiteText {
  title: string;
  siteName: string;
  description: string;
  headings: string[];
  text: string;
  /** The page's own theme color as a hex value, when it declares one. */
  themeColor?: string;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "-", mdash: "-", hellip: "..." };

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

const clean = (s: string) => decode(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

function meta(html: string, key: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = /(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (name !== key) continue;
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    return decode((content?.[1] ?? content?.[2] ?? "").trim());
  }
  return "";
}

/** Pull the readable parts out of a page: title, description, headings and body text. */
export function extractSiteText(html: string, maxChars = 7000): SiteText {
  const title = clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ");
  const headings: string[] = [];
  for (const m of body.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const t = clean(m[2]);
    if (t && !headings.includes(t)) headings.push(t);
    if (headings.length >= 30) break;
  }
  const text = clean(body.replace(/<\/(p|div|li|section|h[1-6]|br|tr)>/gi, " . ")).replace(/(\s\.)+\s/g, ". ").slice(0, maxChars);
  const description = meta(html, "description") || meta(html, "og:description") || meta(html, "twitter:description");
  let fallback = "";
  if (text.length < 200) {
    // Sites built with JavaScript often keep their words in structured data or the page's data script.
    const parts: string[] = [];
    for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      for (const s of m[1].matchAll(/"(?:name|description|headline|slogan)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) parts.push(decode(s[1].replace(/\\"/g, '"')));
    }
    for (const m of html.matchAll(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      for (const s of m[1].matchAll(/"((?:[^"\\]|\\.){25,300})"/g)) if (/\s/.test(s[1]) && !/^https?:|[{}<>]/.test(s[1])) parts.push(decode(s[1]));
    }
    fallback = [...new Set(parts)].join(". ").slice(0, maxChars);
  }
  const themeRaw = meta(html, "theme-color");
  const themeColor = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(themeRaw) ? themeRaw.toUpperCase() : undefined;
  return {
    themeColor,
    title: title || meta(html, "og:title"),
    siteName: meta(html, "og:site_name"),
    description,
    headings,
    text: text.length >= 200 ? text : [text, fallback].filter(Boolean).join(". "),
  };
}
