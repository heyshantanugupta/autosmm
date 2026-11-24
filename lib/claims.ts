import type { Draft, DraftCheck, Intake } from "./types";

/**
 * Our own checks on model output. The model is told to use only the facts it was given,
 * but we do not trust that: we verify the claims it reports, and we separately look for
 * numbers in the post that never appeared in the input.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for", "with", "at", "by",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these", "those",
  "as", "from", "your", "you", "we", "our", "they", "their", "can", "will", "has", "have",
  "had", "not", "no", "so", "if", "than", "then", "into", "over", "per", "do", "does",
]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9$%][a-z0-9$%.,+]*/g) ?? [])
    .map((t) => t.replace(/[.,]+$/g, ""))
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

const NUMBER_RE = /\$?\d[\d,]*(?:\.\d+)?%?\+?/g;

function normalizeNumber(n: string): string {
  return n.replace(/[,+$]/g, "").replace(/\.0+$/, "");
}

export function extractNumbers(text: string): string[] {
  return (text.match(NUMBER_RE) ?? []).map(normalizeNumber).filter(Boolean);
}

/** All text the model is allowed to draw claims from. */
export function allowedSource(intake: Intake): string {
  return [
    intake.productName,
    intake.oneLiner,
    intake.audience,
    intake.facts,
    intake.proof,
    intake.newUpdates,
    intake.website,
  ].join("\n");
}

export interface ClaimResult {
  claim: string;
  supported: boolean;
}

/** A claim is supported when most of its content words, and all of its numbers, appear in the source. */
export function verifyClaims(claims: string[], source: string): ClaimResult[] {
  const sourceTokens = new Set(tokenize(source));
  const sourceNumbers = new Set(extractNumbers(source));
  const sourceLower = source.toLowerCase();

  return claims
    .map((c) => c.trim())
    .filter(Boolean)
    .map((claim) => {
      if (sourceLower.includes(claim.toLowerCase())) return { claim, supported: true };
      const numbers = extractNumbers(claim);
      if (numbers.some((n) => !sourceNumbers.has(n))) return { claim, supported: false };
      const tokens = tokenize(claim);
      if (tokens.length === 0) return { claim, supported: true };
      const hit = tokens.filter((t) => sourceTokens.has(t)).length;
      return { claim, supported: hit / tokens.length >= 0.7 };
    });
}

/** Numbers in the post that never appear in the source. Single digits are ignored (list counts). */
export function unbackedNumbers(body: string, source: string): string[] {
  const sourceNumbers = new Set(extractNumbers(source));
  const found = new Set<string>();
  for (const raw of body.match(NUMBER_RE) ?? []) {
    const n = normalizeNumber(raw);
    if (!n) continue;
    const isPlainSmallInt = /^\d$/.test(n) && !/[%$]/.test(raw);
    if (isPlainSmallInt) continue;
    if (/^20\d\d$/.test(n)) continue; // years
    if (!sourceNumbers.has(n)) found.add(raw.trim());
  }
  return [...found];
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Run every check against one draft and return human-readable results. */
export function checkDraft(draft: Pick<Draft, "body" | "claimsUsed">, intake: Intake): DraftCheck[] {
  const checks: DraftCheck[] = [];
  const source = allowedSource(intake);

  const claimResults = verifyClaims(draft.claimsUsed, source);
  const unsupported = claimResults.filter((r) => !r.supported);
  for (const u of unsupported) {
    checks.push({ level: "warn", message: `Claim not found in your facts: "${u.claim}"` });
  }

  const numbers = unbackedNumbers(draft.body, source);
  if (numbers.length > 0) {
    checks.push({
      level: "warn",
      message: `Number(s) in the post that are not in your inputs: ${numbers.join(", ")}. Confirm they are true or remove them.`,
    });
  }

  const bodyLower = draft.body.toLowerCase();
  for (const rule of lines(intake.doNotSay)) {
    // Only treat short rules as literal phrases to look for; long rules are instructions.
    const phrase = rule.replace(/^(never|don'?t|do not)( say| use| claim)?:?\s*/i, "").replace(/^["']|["']$/g, "");
    if (phrase.length >= 4 && phrase.length <= 40 && bodyLower.includes(phrase.toLowerCase())) {
      checks.push({ level: "warn", message: `Contains a phrase from your do-not-say list: "${phrase}"` });
    }
  }

  const styleText = `${intake.tone}\n${intake.doNotSay}`;
  if (/no\s+em[\s-]?dash/i.test(styleText) && draft.body.includes("—")) {
    checks.push({ level: "warn", message: "Contains an em dash, which your style rules ban." });
  }

  if (checks.length === 0) {
    checks.push({ level: "ok", message: "All reported claims match your inputs and no unbacked numbers were found." });
  }
  return checks;
}
