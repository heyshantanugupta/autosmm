import { toText, toTextList } from "./coerce";
import { verifyClaims } from "./claims";
import type { SiteText } from "./siteText";

export interface ImportedBrief {
  productName: string;
  oneLiner: string;
  website: string;
  audience: string;
  facts: string;
  proof: string;
  newUpdates: string;
  /** The site's own theme color, if it declares one. Empty otherwise. */
  brandColors: string;
  missing: string[];
  /** How many model-written facts were dropped because the page does not support them. */
  dropped: number;
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() : s);

/** Best guess at the product name from page metadata, without a model. */
export function guessName(s: SiteText, host: string): string {
  if (s.siteName) return cut(s.siteName, 100);
  const first = s.title.split(/\s[|\-:–—]\s/)[0].trim();
  return cut(first || host.replace(/^www\./, ""), 100);
}

/** What we can fill in with no model at all: names, description and the page's own headings. */
export function basicBrief(s: SiteText, url: string): ImportedBrief {
  const host = new URL(url).hostname;
  const facts = [s.description, ...s.headings.filter((h) => h.length >= 12 && h.length <= 140).slice(0, 6)].filter(Boolean);
  return {
    productName: guessName(s, host),
    oneLiner: cut(s.description, 500),
    website: url,
    audience: "",
    facts: facts.join("\n"),
    proof: "",
    newUpdates: "",
    brandColors: s.themeColor ? `site color ${s.themeColor}` : "",
    missing: ["Who the product is for", "Real proof such as press or numbers", "Pricing or plan details"],
    dropped: 0,
  };
}

/** Turn the model's answer into a brief, keeping only facts the page text actually supports. */
export function briefFromModel(raw: Record<string, unknown>, s: SiteText, url: string): ImportedBrief {
  const base = basicBrief(s, url);
  const pageText = [s.title, s.siteName, s.description, s.headings.join("\n"), s.text].join("\n");
  const keep = (items: string[]) => {
    const results = verifyClaims(items, pageText);
    return { kept: results.filter((r) => r.supported).map((r) => r.claim), dropped: results.filter((r) => !r.supported).length };
  };
  const facts = keep(toTextList(raw.facts));
  const proof = keep(toTextList(raw.proof));
  const updates = keep(toTextList(raw.newUpdates));
  const missing = toTextList(raw.missing).slice(0, 8);
  return {
    productName: cut(toText(raw.productName), 100) || base.productName,
    oneLiner: cut(toText(raw.oneLiner), 500) || base.oneLiner,
    website: url,
    audience: cut(toText(raw.audience), 1000),
    facts: cut(facts.kept.join("\n"), 4000) || base.facts,
    proof: cut(proof.kept.join("\n"), 4000),
    newUpdates: cut(updates.kept.join("\n"), 4000),
    brandColors: base.brandColors,
    missing: missing.length ? missing : base.missing,
    dropped: facts.dropped + proof.dropped + updates.dropped,
  };
}
