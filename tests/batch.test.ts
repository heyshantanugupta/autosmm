import test from "node:test";
import assert from "node:assert/strict";
import { applyBatch, hasBatch, EMPTY_BATCH } from "../lib/batch.ts";
import { checkDraft } from "../lib/claims.ts";
import { SAMPLE_BRIEF as intake } from "./fixtures.ts";

test("an empty batch changes nothing", () => {
  assert.equal(hasBatch(EMPTY_BATCH), false);
  assert.equal(applyBatch(intake, EMPTY_BATCH), intake);
  assert.equal(applyBatch(intake, undefined), intake);
});

test("batch rules are added to the brief rules and enforced", () => {
  const eff = applyBatch(intake, { tone: "", rules: "Never say managers", feature: "" });
  assert.ok(eff.doNotSay.includes("Never say managers"));
  assert.ok(eff.doNotSay.includes(intake.doNotSay.split("\n")[0]));
  const checks = checkDraft({ body: "Great for managers everywhere.", claimsUsed: [] }, eff);
  assert.ok(checks.some((c) => /managers/.test(c.message)));
});

test("feature text counts as a fact, so claims about it are not flagged", () => {
  const feature = "Reports now show the history next to a 94 point score.";
  const eff = applyBatch(intake, { tone: "", rules: "", feature });
  const checks = checkDraft({ body: "Reports now show the history next to a 94 point score.", claimsUsed: [feature] }, eff);
  assert.equal(checks[0].level, "ok");
  // without the feature the same draft is flagged
  const bare = checkDraft({ body: "Reports now show the history next to a 94 point score.", claimsUsed: [feature] }, intake);
  assert.ok(bare.some((c) => c.level === "warn"));
});

test("batch tone leads but the brief's standing style rules stay in force", () => {
  const eff = applyBatch(intake, { tone: "Playful", rules: "", feature: "" });
  assert.ok(eff.tone.startsWith("Playful"));
  const checks = checkDraft({ body: "A line \u2014 with a dash.", claimsUsed: [] }, eff);
  assert.ok(checks.some((c) => /em dash/i.test(c.message)));
});
