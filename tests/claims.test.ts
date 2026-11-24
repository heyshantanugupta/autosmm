import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedSource, checkDraft, extractNumbers, unbackedNumbers, verifyClaims } from "../lib/claims.ts";
import { THEINTERVIEWS_EXAMPLE } from "../lib/presets.ts";

const source = allowedSource(THEINTERVIEWS_EXAMPLE);

test("extractNumbers normalizes currency, commas and plus signs", () => {
  assert.deepEqual(extractNumbers("$8,000 to $36,000 and 200+ interviews, 60%"), ["8000", "36000", "200", "60%"]);
});

test("verifyClaims accepts a claim copied from the facts", () => {
  const [r] = verifyClaims(["The free plan includes 2 practice interviews per week"], source);
  assert.equal(r.supported, true);
});

test("verifyClaims accepts a close paraphrase", () => {
  const [r] = verifyClaims(["Free plan gives 2 practice interviews each week, 30 minutes each"], source);
  assert.equal(r.supported, true);
});

test("verifyClaims rejects a claim with an invented number", () => {
  const [r] = verifyClaims(["We ran 200 interviews last month"], source);
  assert.equal(r.supported, false);
});

test("verifyClaims rejects a claim with no overlap with the facts", () => {
  const [r] = verifyClaims(["Recruiters hire 3x faster with our dashboard"], source);
  assert.equal(r.supported, false);
});

test("unbackedNumbers flags figures that are not in the inputs", () => {
  assert.deepEqual(unbackedNumbers("We ran 200+ interviews and saved 60% of screening time.", source).sort(), ["200+", "60%"].sort());
});

test("unbackedNumbers allows figures that are in the inputs", () => {
  assert.deepEqual(unbackedNumbers("Companies spend $8,000 to $36,000 per hire.", source), []);
});

test("unbackedNumbers ignores single digits and years", () => {
  assert.deepEqual(unbackedNumbers("3 mistakes people make in 2026", source), []);
});

test("checkDraft returns an ok result for a clean draft", () => {
  const checks = checkDraft(
    { body: "Try a 2 minute interview in your browser. No signup.", claimsUsed: ["A short AI interview runs in the browser with no signup, about 2 minutes."] },
    THEINTERVIEWS_EXAMPLE,
  );
  assert.equal(checks.length, 1);
  assert.equal(checks[0].level, "ok");
});

test("checkDraft warns on em dashes when the style rules ban them", () => {
  const checks = checkDraft({ body: "Proof — not claims.", claimsUsed: [] }, THEINTERVIEWS_EXAMPLE);
  assert.ok(checks.some((c) => c.level === "warn" && /em dash/i.test(c.message)));
});

test("checkDraft warns when a do-not-say phrase appears", () => {
  const checks = checkDraft({ body: "Practice is unlimited on the free plan.", claimsUsed: [] }, THEINTERVIEWS_EXAMPLE);
  assert.ok(checks.some((c) => c.level === "warn" && /do-not-say/i.test(c.message)));
});

test("checkDraft warns on unsupported claims and unbacked numbers together", () => {
  const checks = checkDraft(
    { body: "We ran 200+ interviews.", claimsUsed: ["We ran 200+ interviews last month"] },
    THEINTERVIEWS_EXAMPLE,
  );
  assert.ok(checks.filter((c) => c.level === "warn").length >= 2);
});
