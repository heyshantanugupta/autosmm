import { PLATFORM_INFO, getPostType } from "./postTypes";
import type { Draft, Intake, Platform, Strategy } from "./types";
import type { DraftRequest } from "./prompts";

/**
 * Demo mode: template-built output so people can try the whole flow without an API key.
 * It reuses the user's own inputs and invents nothing, but it is not written by a model.
 */

const DEMO_NOTE = "Demo mode: assembled from a template, not written by a model. Add an API key in Settings for real drafts.";

function factLines(intake: Intake): string[] {
  const lines = intake.facts
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [intake.oneLiner || intake.productName];
}

export function demoStrategy(intake: Intake): Strategy {
  const channels: Platform[] = intake.channels.length > 0 ? intake.channels : ["linkedin"];
  return {
    summary: `Demo strategy for ${intake.productName}. Lead with one channel where your audience already is, post a few times a week, and let every post teach or show something real. Switch demo mode off and add an API key to get a strategy written for your actual brief.`,
    positioning: intake.oneLiner || `${intake.productName}: say what it does in one plain sentence.`,
    audiences: [
      {
        name: intake.audience || "Primary audience",
        pain: "Describe the problem in the words your audience uses.",
        message: `Show how ${intake.productName} removes that problem, using only facts you can back up.`,
      },
    ],
    themes: [
      { id: "problem-first", name: "Problem first", why: "Starts from what the audience already feels.", exampleAngle: "Name the problem in one line, then give one useful step." },
      { id: "show-the-product", name: "Show the product", why: "Real screens build more trust than claims.", exampleAngle: "One feature, one job, one screenshot." },
      { id: "honest-building", name: "Honest building", why: "People follow founders who share what is true, including limits.", exampleAngle: "A real update on what shipped and what is still weak." },
    ],
    platforms: channels.map((platform, i) => ({
      platform,
      fit: i === 0 ? "high" : i === 1 ? "medium" : "low",
      role: i === 0 ? "Main channel for regular posting." : "Support channel. Reuse and adapt, do not copy.",
      cadence: i === 0 ? "3 posts a week" : "1 to 2 posts a week",
      rationale: "Demo rating based on the order you listed your channels.",
    })),
    weeklyRhythm: "Mon: teach. Wed: show the product. Fri: honest update. Reply to every comment within a day.",
    measurement: ["Clicks on a tracked link per post", "Replies and saves, not just likes", "Signups, if your analytics can attribute them"],
    risks: ["Posting claims you cannot verify", "Posting identical copy on every platform"],
    gaps: ["Demo mode: sample output only. Real analysis needs an API key."],
  };
}

export function demoDrafts(intake: Intake, strategy: Strategy, req: DraftRequest): Omit<Draft, "id" | "checks">[] {
  const facts = factLines(intake);
  const out: Omit<Draft, "id" | "checks">[] = [];
  let n = 0;

  for (const typeId of req.postTypeIds) {
    const type = getPostType(req.platform, typeId);
    if (!type) continue;
    for (let i = 0; i < req.perType; i++) {
      const fact = facts[n % facts.length];
      const theme = strategy.themes[n % strategy.themes.length];
      const hook = fact.length > 110 ? `${fact.slice(0, 107).trimEnd()}...` : fact;
      const cta = intake.website ? `Try it: ${intake.website}` : "";
      const body = [hook, "", intake.oneLiner || `That is what ${intake.productName} is built for.`, cta ? "" : null, cta || null]
        .filter((l) => l !== null)
        .join("\n");
      out.push({
        postTypeId: typeId,
        postTypeLabel: type.label,
        platform: req.platform,
        themeId: theme.id,
        hook,
        body,
        cta,
        hashtags: [],
        linkSlug: `${req.platform.slice(0, 2)}-${typeId}-${i + 1}`,
        bestTime: "Weekday mornings in your audience's time zone, then check your own analytics.",
        visualIdea: "A real screenshot of the product.",
        claimsUsed: [fact],
        notes: DEMO_NOTE,
      });
      n++;
    }
  }
  void PLATFORM_INFO;
  return out;
}
