import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedSource, checkDraft, extractNumbers, unbackedNumbers, verifyClaims } from "../lib/claims.ts";
import { SAMPLE_BRIEF } from "./fixtures.ts";

const source = allowedSource(SAMPLE_BRIEF);

test("extractNumbers normalizes currency, commas and plus signs", () => {
  assert.deepEqual(extractNumbers("$8,000 to $36,000 and 200+ sessions, 60%"), ["8000", "36000", "200", "60%"]);
});

test("verifyClaims accepts a claim copied from the facts", () => {
  const [r] = verifyClaims(["The free plan includes 2 habit plans per week"], source);
  assert.equal(r.supported, true);
});

test("verifyClaims accepts a close paraphrase", () => {
  const [r] = verifyClaims(["Free plan gives 2 habit plans each week, 30 minutes each"], source);
  assert.equal(r.supported, true);
});

test("verifyClaims rejects a claim with an invented number", () => {
  const [r] = verifyClaims(["We ran 200 sessions last month"], source);
  assert.equal(r.supported, false);
});

test("verifyClaims rejects a claim with no overlap with the facts", () => {
  const [r] = verifyClaims(["Managers get results 3x faster with our dashboard"], source);
  assert.equal(r.supported, false);
});

test("unbackedNumbers flags figures that are not in the inputs", () => {
  assert.deepEqual(unbackedNumbers("We ran 200+ sessions and saved 60% of planning time.", source).sort(), ["200+", "60%"].sort());
});

test("unbackedNumbers allows figures that are in the inputs", () => {
  assert.deepEqual(unbackedNumbers("Teams spend $8,000 to $36,000 per year on coaching.", source), []);
});

test("unbackedNumbers ignores single digits and years", () => {
  assert.deepEqual(unbackedNumbers("3 mistakes people make in 2026", source), []);
});

test("checkDraft returns an ok result for a clean draft", () => {
  const checks = checkDraft(
    { body: "Try a 2 minute setup in your browser. No signup.", claimsUsed: ["A short setup runs in the browser with no signup, about 2 minutes."] },
    SAMPLE_BRIEF,
  );
  assert.equal(checks.length, 1);
  assert.equal(checks[0].level, "ok");
});

test("checkDraft warns on em dashes when the style rules ban them", () => {
  const checks = checkDraft({ body: "Proof — not claims.", claimsUsed: [] }, SAMPLE_BRIEF);
  assert.ok(checks.some((c) => c.level === "warn" && /em dash/i.test(c.message)));
});

test("checkDraft warns when a do-not-say phrase appears", () => {
  const checks = checkDraft({ body: "Habit plans are unlimited on the free plan.", claimsUsed: [] }, SAMPLE_BRIEF);
  assert.ok(checks.some((c) => c.level === "warn" && /do-not-say/i.test(c.message)));
});

test("checkDraft warns on unsupported claims and unbacked numbers together", () => {
  const checks = checkDraft(
    { body: "We ran 200+ sessions.", claimsUsed: ["We ran 200+ sessions last month"] },
    SAMPLE_BRIEF,
  );
  assert.ok(checks.filter((c) => c.level === "warn").length >= 2);
});

import { echoesTopic, topicFrom } from "../lib/claims.ts";

test("topicFrom reads the topic line the app sends", () => {
  assert.equal(topicFrom("Topic for this post: Why plans fail by Wednesday\nThis is only the subject."), "Why plans fail by Wednesday");
  assert.equal(topicFrom("Rewrite shorter"), "");
});

test("an opening line that repeats the topic is flagged, a real hook is not", () => {
  const topic = "Why a resume gap is not the problem people think it is";
  assert.ok(echoesTopic("Why a resume gap is not the problem people think", topic));
  assert.ok(!echoesTopic("Marta sent 40 applications in March and heard back from none, then she changed one line.", topic));
  const flagged = checkDraft({ body: "Why a resume gap is not the problem people think it is.\nHere is more.", claimsUsed: [] }, SAMPLE_BRIEF, topic);
  assert.ok(flagged.some((c) => c.level === "warn" && /repeats your topic/.test(c.message)));
});
