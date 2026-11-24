import type { Intake } from "./types";

const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean).length;

export interface Strength {
  /** 0 to 100 */
  score: number;
  label: "Just started" | "Getting there" | "Good" | "Strong";
  /** The single most useful thing to add next, or empty when nothing is missing. */
  next: string;
}

/** How complete a brief is. Facts count most, because drafts can only say what the brief says. */
export function briefStrength(i: Intake): Strength {
  const facts = lines(i.facts);
  const checks: { points: number; got: number; ask: string }[] = [
    { points: 10, got: i.productName.trim() ? 10 : 0, ask: "Add your product name." },
    { points: 15, got: i.oneLiner.trim() ? 15 : 0, ask: "Add one sentence on what it does." },
    { points: 15, got: i.audience.trim() ? 15 : 0, ask: "Say who it is for." },
    { points: 30, got: Math.min(facts, 5) * 6, ask: facts === 0 ? "Add a few facts about your product." : "Add more facts. Five or more makes the posts much more specific." },
    { points: 10, got: i.proof.trim() ? 10 : 0, ask: "Add any real proof, like press or a number you can stand behind." },
    { points: 10, got: i.tone.trim() || (i.voiceSamples ?? "").trim() ? 10 : 0, ask: "Describe how you want to sound, or paste a few of your own posts." },
    { points: 10, got: i.doNotSay.trim() ? 10 : 0, ask: "List anything the posts must never say." },
  ];
  const score = checks.reduce((n, c) => n + c.got, 0);
  const missing = checks.find((c) => c.got < c.points);
  return {
    score,
    label: score >= 85 ? "Strong" : score >= 60 ? "Good" : score >= 30 ? "Getting there" : "Just started",
    next: missing?.ask ?? "",
  };
}
