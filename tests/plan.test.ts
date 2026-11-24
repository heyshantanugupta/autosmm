import test from "node:test";
import assert from "node:assert/strict";
import { buildSchedule, planToCsv, weeklyAllocation } from "../lib/calendar.ts";
import { addDays, daysBetween, isISODate } from "../lib/dates.ts";
import { nextStep } from "../lib/nextStep.ts";
import { briefStrength } from "../lib/briefStrength.ts";
import { greeting } from "../lib/greeting.ts";
import { classifyMessage, demoReplies } from "../lib/reply.ts";
import { basicReview, summarize } from "../lib/results.ts";
import { PLATFORM_INFO } from "../lib/postTypes.ts";
import { SAMPLE_BRIEF } from "./fixtures.ts";

const strategy: any = {
  summary: "s", positioning: "p", audiences: [], weeklyRhythm: "", measurement: [], risks: [], gaps: [],
  themes: [
    { id: "t1", name: "Proof over claims", why: "", exampleAngle: "Show a real score" },
    { id: "t2", name: "Practice habits", why: "", exampleAngle: "A tip" },
    { id: "t3", name: "Behind the build", why: "", exampleAngle: "A story" },
  ],
  platforms: [
    { platform: "linkedin", fit: "high", role: "", cadence: "", rationale: "" },
    { platform: "instagram", fit: "medium", role: "", cadence: "", rationale: "" },
    { platform: "x", fit: "low", role: "", cadence: "", rationale: "" },
    { platform: "reddit", fit: "low", role: "", cadence: "", rationale: "" },
  ],
};
const brief = { ...SAMPLE_BRIEF, channels: [] as any[], proof: "" };

test("date helpers add days across month and year ends and reject bad dates", () => {
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09");
  assert.equal(daysBetween("2026-11-23", "2026-12-23"), 30);
  assert.ok(isISODate("2026-02-28") && !isISODate("2026-02-30") && !isISODate("11/23/2026") && !isISODate(5));
});

test("allocation gives the strongest platform the most posts and never exceeds three platforms", () => {
  const a = weeklyAllocation(strategy, brief, 5, 3);
  assert.equal(a.reduce((n, x) => n + x.count, 0), 5);
  assert.equal(a[0].platform, "linkedin");
  assert.ok(a[0].count > a[1].count);
  assert.ok(a.length <= 3);
});

test("a 30 day plan is dated, in order, valid, and about five posts a week", () => {
  const plan = buildSchedule(strategy, brief, "2026-11-23");
  assert.ok(plan.length >= 20 && plan.length <= 24, String(plan.length));
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i - 1].date <= plan[i].date);
  assert.ok(plan[0].date >= "2026-11-23" && plan[plan.length - 1].date < addDays("2026-11-23", 30));
  for (const it of plan) {
    assert.ok(isISODate(it.date));
    assert.ok(PLATFORM_INFO[it.platform].postTypes.some((t) => t.id === it.postTypeId), `${it.platform}/${it.postTypeId}`);
    assert.ok(strategy.themes.some((t: any) => t.id === it.themeId));
  }
  assert.equal(new Set(plan.map((p) => p.id)).size, plan.length);
});

test("the plan is balanced: every theme and every kind of post appears, and low-fit platforms are left out", () => {
  const plan = buildSchedule(strategy, brief, "2026-11-23");
  assert.deepEqual(new Set(plan.map((p) => p.themeId)), new Set(["t1", "t2", "t3"]));
  assert.deepEqual(new Set(plan.map((p) => p.pillar)), new Set(["educate", "story", "proof", "offer"]));
  assert.ok(!plan.some((p) => p.platform === "x" || p.platform === "reddit"));
  const counts = ["t1", "t2", "t3"].map((t) => plan.filter((p) => p.themeId === t).length);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 2, counts.join());
});

test("post types that need real proof are only used when the brief has proof", () => {
  const without = buildSchedule(strategy, brief, "2026-11-23");
  assert.ok(!without.some((p) => ["customer-story", "data-insight"].includes(p.postTypeId)));
  const withProof = buildSchedule(strategy, { ...brief, proof: "Featured in a magazine" }, "2026-11-23");
  assert.ok(withProof.some((p) => ["customer-story", "data-insight"].includes(p.postTypeId)));
});

test("offer posts use the brief's updates as topics, and the same platform does not post two days running", () => {
  const plan = buildSchedule(strategy, { ...brief, newUpdates: "Invite links for teams" }, "2026-11-23");
  assert.ok(plan.filter((p) => p.pillar === "offer").every((p) => p.topic === "Invite links for teams"));
  const sameDayRun = plan.filter((p, i) => i > 0 && p.platform === plan[i - 1].platform && p.date === plan[i - 1].date);
  assert.equal(sameDayRun.length, 0);
});

test("an empty strategy or a short plan still works", () => {
  assert.deepEqual(buildSchedule({ ...strategy, platforms: [] }, brief, "2026-11-23"), []);
  assert.ok(buildSchedule(strategy, brief, "2026-11-23", { days: 7 }).length <= 6);
});

test("calendar exports as CSV with quotes escaped", () => {
  const plan = buildSchedule(strategy, brief, "2026-11-23", { days: 7 });
  plan[0].topic = 'Say "hello", then go';
  const csv = planToCsv(plan, (id) => id);
  assert.ok(csv.startsWith("Date,Platform,Post type,Theme,Kind,Topic,Status"));
  assert.ok(csv.includes('"Say ""hello"", then go"'));
});

test("next step walks a beginner through, one thing at a time", () => {
  const base = { intake: brief, strategy: null as any, plan: [] as any[], results: [] as any[], today: "2026-11-23" };
  assert.equal(nextStep({ ...base, intake: { ...brief, productName: "" } }).action, "brief");
  assert.equal(nextStep(base).action, "strategy");
  assert.equal(nextStep({ ...base, strategy }).action, "plan");
  const plan = buildSchedule(strategy, brief, "2026-11-23");
  assert.equal(nextStep({ ...base, strategy, plan }).action, "write-week");
  const written = plan.map((p) => ({ ...p, draftId: "d" }));
  assert.equal(nextStep({ ...base, strategy, plan: written }).action, "post-today");
  const posted = written.map((p) => (p.date <= "2026-11-24" ? { ...p, posted: true } : p));
  assert.equal(nextStep({ ...base, strategy, plan: posted, today: "2026-11-24" }).action, "log-results");
  assert.equal(nextStep({ ...base, strategy, plan: written, today: "2027-02-01" }).action, "replan");
});

test("messages are sorted into complaint, question, praise or other", () => {
  assert.equal(classifyMessage("This is a scam, I want a refund"), "complaint");
  assert.equal(classifyMessage("How much does the paid plan cost?"), "question");
  assert.equal(classifyMessage("Love this, thanks!"), "praise");
  assert.equal(classifyMessage("first"), "other");
  assert.equal(demoReplies("complaint", brief).length, 3);
});

test("results are grouped, ranked, and a small sample is called a hint", () => {
  const e = (id: string, platform: any, themeId: string, likes: number, comments: number, views: number) => ({ id, date: "2026-11-24", platform, label: id, themeId, postTypeId: "how-to", likes, comments, views });
  const entries = [e("a", "linkedin", "t1", 40, 10, 900), e("b", "linkedin", "t1", 30, 4, 700), e("c", "instagram", "t2", 3, 0, 200)];
  const s = summarize(entries, (id) => id);
  assert.equal(s.byTheme[0].key, "t1");
  assert.equal(s.byTheme[0].avgEngagement, 42);
  assert.equal(s.best?.id, "a");
  assert.equal(s.enough, false);
  assert.match(basicReview(s).summary, /first hint/);
  assert.equal(basicReview(summarize([], (x) => x)).doMore.length, 0);
});

test("greeting follows the hour", () => {
  assert.deepEqual([6, 13, 19, 23, 2].map(greeting), ["Good morning", "Good afternoon", "Good evening", "Hello", "Hello"]);
});

test("brief strength grows as the brief fills in and names what to add next", () => {
  const empty = briefStrength({ ...SAMPLE_BRIEF, productName: "", oneLiner: "", audience: "", facts: "", proof: "", tone: "", doNotSay: "" });
  assert.equal(empty.score, 0);
  assert.equal(empty.label, "Just started");
  assert.match(empty.next, /product name/i);
  const partial = briefStrength({ ...SAMPLE_BRIEF, facts: "one\ntwo", proof: "", tone: "" });
  assert.ok(partial.score > 40 && partial.score < 90);
  assert.match(partial.next, /facts/i);
  const full = briefStrength({ ...SAMPLE_BRIEF, facts: "1\n2\n3\n4\n5", proof: "x", tone: "plain", doNotSay: "never lie" });
  assert.equal(full.score, 100);
  assert.equal(full.label, "Strong");
  assert.equal(full.next, "");
});

import { demoHashtags, demoHooks } from "../lib/ideas.ts";
import { demoReviewReplies } from "../lib/reply.ts";
import { voiceBlock } from "../lib/voice.ts";

test("hook lab gives ten different lines", () => {
  const h = demoHooks("onboarding emails", SAMPLE_BRIEF);
  assert.equal(h.length, 10);
  assert.equal(new Set(h).size, 10);
});

test("hashtags: none for reddit, one set per platform", () => {
  const s = demoHashtags("habit tracking app", ["reddit", "linkedin"], SAMPLE_BRIEF);
  assert.equal(s.length, 2);
  assert.deepEqual(s[0].hashtags, []);
  assert.ok(s[1].hashtags.length > 0);
});

test("review replies never promise refunds", () => {
  for (const r of demoReviewReplies(SAMPLE_BRIEF)) assert.ok(!/refund|compensat|credit/i.test(r.text));
});

test("voice samples go into the prompt as style only", () => {
  const p = voiceBlock("Short. Plain. Done.");
  assert.ok(p.includes("Short. Plain. Done.") && /never take facts/i.test(p));
  assert.equal(voiceBlock("  "), "");
});

import { addProject, cleanIndex, makeMeta, removeProject, renameProject, syncAutoName, uniqueName } from "../lib/projects.ts";
import { parseProjectFile, projectFileName, serializeProject } from "../lib/projectFile.ts";
import { cleanWorkspace } from "../lib/workspaceClean.ts";

test("project names stay unique", () => {
  assert.equal(uniqueName("Brightloop", []), "Brightloop");
  assert.equal(uniqueName("brightloop", ["Brightloop"]), "brightloop 2");
  assert.equal(uniqueName("Brightloop", ["Brightloop", "Brightloop 2"]), "Brightloop 3");
  assert.equal(uniqueName("   ", []), "New project");
});

test("auto names follow the product until renamed", () => {
  const a = makeMeta("New project", true);
  let idx = { activeId: a.id, projects: [a] };
  idx = syncAutoName(idx, a.id, "Brightloop");
  assert.equal(idx.projects[0].name, "Brightloop");
  assert.equal(syncAutoName(idx, a.id, "Brightloop"), idx);
  idx = renameProject(idx, a.id, "Habit app");
  idx = syncAutoName(idx, a.id, "Other");
  assert.equal(idx.projects[0].name, "Habit app");
});

test("adding and removing projects keeps a valid active one", () => {
  const a = makeMeta("A", true);
  let idx = { activeId: a.id, projects: [a] };
  const b = makeMeta("B", true, idx);
  idx = addProject(idx, b);
  assert.equal(idx.activeId, b.id);
  idx = removeProject(idx, b.id);
  assert.equal(idx.activeId, a.id);
  idx = removeProject(idx, a.id);
  assert.equal(idx.projects.length, 0);
});

test("a damaged project list is repaired or rejected", () => {
  assert.equal(cleanIndex(null), null);
  assert.equal(cleanIndex({ projects: [] }), null);
  const i = cleanIndex({ activeId: "gone", projects: [{ id: "p1", name: "One" }, { id: "p1", name: "Dup" }, { id: "../x", name: "Bad" }] });
  assert.equal(i?.projects.length, 1);
  assert.equal(i?.activeId, "p1");
});

test("old saved work without newer fields loads cleanly", () => {
  const w = cleanWorkspace({ intake: { productName: "Old", tone: "" }, strategy: null, drafts: [] });
  assert.equal(w.intake.voiceSamples, "");
  assert.deepEqual(w.plan, []);
  assert.equal(w.review, null);
});

test("project file round trip, and bad files are refused", () => {
  const ws = cleanWorkspace({ intake: SAMPLE_BRIEF, plan: [{ id: "a", date: "2026-11-24", platform: "linkedin", topic: "t", postTypeId: "x", themeId: "y", pillar: "educate" }] });
  const text = serializeProject("Brightloop", ws);
  assert.ok(!/api.?key/i.test(text));
  const back = parseProjectFile(text);
  assert.ok(back.ok && back.name === "Brightloop" && back.workspace.plan?.length === 1 && back.workspace.intake.productName === SAMPLE_BRIEF.productName);
  assert.equal(parseProjectFile("{not json").ok, false);
  assert.equal(parseProjectFile(JSON.stringify({ app: "autosmm", kind: "brief" })).ok, false);
  assert.equal(projectFileName("Habit App!"), "habit-app-project.json");
});

test("imported junk cannot break the app", () => {
  const w = cleanWorkspace({ intake: { productName: 5, channels: ["linkedin", "nope"] }, drafts: [{ id: 1 }, { id: "d", body: "b", platform: "x" }], plan: "no", results: [null] });
  assert.equal(w.intake.productName, "");
  assert.deepEqual(w.intake.channels, ["linkedin"]);
  assert.equal(w.drafts.length, 1);
  assert.deepEqual(w.plan, []);
});
