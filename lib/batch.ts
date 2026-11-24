import type { Batch, Intake } from "./types";

export const EMPTY_BATCH: Batch = { tone: "", rules: "", feature: "" };

export function hasBatch(b?: Batch | null): boolean {
  return Boolean(b && (b.tone.trim() || b.rules.trim() || b.feature.trim()));
}

/**
 * Per-batch settings sit on top of the brief, so the user never has to edit the brief to change
 * the tone, add a rule or point a batch at one feature.
 *
 * - tone: the batch tone leads; the brief's tone stays as the standing style rules.
 * - rules: added to the do-not-say rules, so they are checked in every draft of the batch.
 * - feature: text the user typed for this batch is a source they provided, so it counts as a fact.
 *
 * Used for checks and demo output. The model prompt shows these as their own labelled section.
 */
export function applyBatch(intake: Intake, batch?: Batch | null): Intake {
  if (!batch || !hasBatch(batch)) return intake;
  const tone = batch.tone.trim();
  return {
    ...intake,
    tone: tone ? `${tone}. Standing style rules from the brief: ${intake.tone}` : intake.tone,
    doNotSay: [intake.doNotSay, batch.rules.trim()].filter(Boolean).join("\n"),
    facts: [batch.feature.trim(), intake.facts].filter(Boolean).join("\n"),
  };
}
