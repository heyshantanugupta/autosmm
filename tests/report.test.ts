import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, reportFileName, reportToDocx, reportToHtml } from "../lib/report.ts";
import { SAMPLE_BRIEF } from "./fixtures.ts";

const strategy: any = {
  summary: "Sum", positioning: "Pos <b>", audiences: [{ name: "A", pain: "p", message: "m" }],
  themes: [{ id: "t", name: "T", why: "w", exampleAngle: "e" }],
  platforms: [{ platform: "linkedin", fit: "high", role: "r", cadence: "c", rationale: "x" }],
  weeklyRhythm: "wk", measurement: ["m1"], risks: ["r1"], gaps: [],
};

test("report has the main sections and skips empty ones", () => {
  const b = buildReport(SAMPLE_BRIEF, strategy, new Date("2026-11-23T12:00:00Z"));
  const h2 = b.filter((x) => x.t === "h2").map((x: any) => x.text);
  assert.deepEqual(h2, ["Summary", "The brief", "Positioning", "Who you are talking to", "Content themes", "Where to post", "Weekly rhythm", "What to measure", "Risks to avoid"]);
  assert.ok(!JSON.stringify(b).includes("—"));
});

test("printable page escapes model text", () => {
  const html = reportToHtml(buildReport(SAMPLE_BRIEF, strategy));
  assert.ok(html.includes("Pos &lt;b&gt;"));
  assert.ok(!html.includes("Pos <b>"));
  assert.match(html, /<title>Brightloop: social media strategy<\/title>/);
});

test("docx output is a real zip file", async () => {
  const blob = await reportToDocx(buildReport(SAMPLE_BRIEF, strategy));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), "PK");
  assert.ok(bytes.length > 1500);
});

test("file names are tidy", () => {
  assert.equal(reportFileName(SAMPLE_BRIEF, "pdf"), "brightloop-strategy.pdf");
});
