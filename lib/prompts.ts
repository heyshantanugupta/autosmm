import { GOALS, type Batch, type Intake, type Platform, type Strategy } from "./types";
import { PLATFORM_INFO, getPostType } from "./postTypes";

const GROUND_RULES = `Ground rules that apply to everything you write:
- Use ONLY the facts, proof points and updates the user provided. Do not invent statistics, customer names, testimonials, quotes, awards, features, pricing or results. If something would help but was not provided, leave it out and mention the gap.
- Never promise or imply anything listed in the user's "do not say" rules.
- Write like a specific, thoughtful person, not a brand. Plain words. No hype words, no filler openers, no empty claims. Short sentences beat long ones.
- Match the platform's norms. Never suggest automating likes, follows, connection requests, comments or DMs, or posting from fake or undisclosed accounts.
- If the tone notes contain style rules (for example, no em dashes), follow them exactly.
- You prepare drafts for a human to edit and publish. You never publish anything.`;

export function formatIntake(intake: Intake): string {
  const goal = GOALS.find((g) => g.id === intake.goal)?.label ?? intake.goal;
  const lines = (text: string) =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => `- ${l}`)
      .join("\n") || "- (none provided)";

  return [
    `PRODUCT: ${intake.productName}`,
    `ONE-LINER: ${intake.oneLiner || "(none)"}`,
    `WEBSITE: ${intake.website || "(none)"}`,
    `TARGET AUDIENCE: ${intake.audience || "(none)"}`,
    `GOAL: ${goal}`,
    `CHANNELS THE USER HAS: ${intake.channels.map((c) => PLATFORM_INFO[c].label).join(", ") || "(none selected)"}`,
    `TONE: ${intake.tone || "(none)"}`,
    `\nFACTS YOU MAY USE (the only claims allowed):\n${lines(intake.facts)}`,
    `\nPROOF POINTS (real, usable):\n${lines(intake.proof)}`,
    `\nNEW FEATURES / NEWS:\n${lines(intake.newUpdates)}`,
    `\nDO NOT SAY / DO NOT DO:\n${lines(intake.doNotSay)}`,
    `\nCURRENT STATE OF THE SOCIAL ACCOUNTS:\n${intake.currentState || "(none provided)"}`,
  ].join("\n");
}

export const STRATEGY_SYSTEM = `You are a social media strategist for early-stage products. You turn a short product brief into a realistic, specific strategy that a small team can actually run.

${GROUND_RULES}

How to build the strategy:
- Be honest about fit. Rank platforms for THIS product and goal using the account state provided. Rate small, dormant channels as low or medium and say why. Do not recommend every platform.
- Themes should be 3 to 5 content angles, each tied to a real audience pain or a real fact from the brief. Give each a short slug id (like "proof-over-claims").
- Cadence must be sustainable for a small team (for example 3 posts a week on the main channel, not daily on all of them).
- Measurement must use signals the team can actually see. If the brief shows tracking is limited, say what to track instead.
- List risks specific to this product and its claims.
- List gaps: missing information that would improve the strategy (for example real customer quotes, data, or screenshots).`;

export const STRATEGY_TOOL = {
  name: "submit_strategy",
  description: "Submit the finished social media strategy.",
  schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "3 to 4 sentences: who to reach, with what, through which channels." },
      positioning: { type: "string", description: "One sentence the whole content plan can be traced back to." },
      audiences: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            pain: { type: "string", description: "What this audience struggles with, in their words." },
            message: { type: "string", description: "What to say to them." },
          },
          required: ["name", "pain", "message"],
        },
      },
      themes: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Short lowercase slug with hyphens." },
            name: { type: "string" },
            why: { type: "string" },
            exampleAngle: { type: "string", description: "One example post angle for this theme." },
          },
          required: ["id", "name", "why", "exampleAngle"],
        },
      },
      platforms: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            platform: { type: "string", enum: ["linkedin", "instagram", "x", "facebook", "youtube", "tiktok", "reddit"] },
            fit: { type: "string", enum: ["high", "medium", "low"] },
            role: { type: "string", description: "What this channel is for." },
            cadence: { type: "string" },
            rationale: { type: "string" },
          },
          required: ["platform", "fit", "role", "cadence", "rationale"],
        },
      },
      weeklyRhythm: { type: "string", description: "A simple weekly posting and engagement rhythm." },
      measurement: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      gaps: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "positioning", "audiences", "themes", "platforms", "weeklyRhythm", "measurement", "risks", "gaps"],
  },
} as const;

export function strategyUserPrompt(intake: Intake): string {
  return `Here is the product brief. Build the strategy.\n\n${formatIntake(intake)}`;
}

export const DRAFTS_SYSTEM = `You are a social media writer who drafts posts for a human to edit and publish. You write in the user's voice, grounded entirely in the facts they provided.

${GROUND_RULES}

How to write the drafts:
- Open with a hook that works on its own in the first line. No "In today's fast-paced world", no "Excited to announce".
- One idea per post. Be concrete: a specific situation, a specific number FROM THE FACTS, a specific step.
- Post types marked "needs real proof" may only use proof points the user provided. If none fit, write the post without invented proof and say so in notes.
- Give every draft a different angle. Spread the drafts across the strategy themes.
- In "claimsUsed", list every factual claim the post relies on, copied closely from the user's facts so it can be verified. If the post makes no factual claims, return an empty list.
- linkSlug: a short lowercase slug the team can use for a tracked link (for example "li-founder-story"). Platform prefix first.
- bestTime: a practical suggestion and the reason, kept to one short line. It is a suggestion, not a guarantee.
- visualIdea: what image, screenshot or video would go with the post. Real product screens only. No stock-photo ideas.
- For multi-part formats (threads, carousels, scripts, story sequences) put the whole structure in "body", with clear labels such as "Slide 1:" or "Post 2/6:".
- If the post type is a Reddit post, do not put a link in the body.`;

export const DRAFTS_TOOL = {
  name: "submit_drafts",
  description: "Submit the finished post drafts.",
  schema: {
    type: "object",
    properties: {
      drafts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            postTypeId: { type: "string", description: "The id of the post type this draft is for." },
            themeId: { type: "string", description: "The id of the strategy theme this draft serves." },
            hook: { type: "string", description: "The first line, repeated on its own." },
            body: { type: "string", description: "The full post, ready to edit and publish." },
            cta: { type: "string", description: "The call to action in the post, or an empty string." },
            hashtags: { type: "array", items: { type: "string" } },
            linkSlug: { type: "string" },
            bestTime: { type: "string" },
            visualIdea: { type: "string" },
            claimsUsed: { type: "array", items: { type: "string" } },
            notes: { type: "string", description: "Anything the human should know before posting." },
          },
          required: ["postTypeId", "themeId", "hook", "body", "cta", "hashtags", "linkSlug", "bestTime", "visualIdea", "claimsUsed", "notes"],
        },
      },
    },
    required: ["drafts"],
  },
} as const;

export interface DraftRequest {
  platform: Platform;
  postTypeIds: string[];
  perType: number;
  /** Optional extra direction from the user, for example when regenerating one draft. */
  instruction?: string;
  /** Tone, rules and feature chosen for this batch. */
  batch?: Batch;
}

function batchSection(batch?: Batch): string {
  if (!batch) return "";
  const parts: string[] = [];
  if (batch.tone.trim()) {
    parts.push(
      `TONE FOR THIS BATCH: ${batch.tone.trim()}\n(This leads over the brief's tone. Style rules in the brief, such as "no em dashes", still apply.)`,
    );
  }
  if (batch.rules.trim()) {
    const rules = batch.rules
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => `- ${l}`)
      .join("\n");
    parts.push(`EXTRA RULES FOR THIS BATCH (follow these as strictly as the brief's do-not-say rules):\n${rules}`);
  }
  if (batch.feature.trim()) {
    parts.push(
      `FEATURE TO OUTLINE IN THESE POSTS (facts the user provided for this batch; you may use them, and every draft in the batch should be about this):\n${batch.feature.trim()}`,
    );
  }
  return parts.length ? `\n${parts.join("\n\n")}\n` : "";
}

function variety(req: DraftRequest): string {
  if (req.postTypeIds.length * req.perType < 2) return "";
  return `\nVARIETY: Each draft in this batch must take a different angle and open differently. Do not reuse the same statistic, hook or example across drafts unless the user asked for one feature, and even then vary how you introduce it.\n`;
}

export function draftsUserPrompt(intake: Intake, strategy: Strategy, req: DraftRequest): string {
  const info = PLATFORM_INFO[req.platform];
  const types = req.postTypeIds
    .map((id) => getPostType(req.platform, id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map(
      (t) =>
        `- id "${t.id}": ${t.label}. ${t.description}${t.needsRealProof ? " (needs real proof: use only provided proof points)" : ""}${t.multiPart ? " (multi-part format)" : ""}`,
    )
    .join("\n");

  const themes = strategy.themes.map((t) => `- id "${t.id}": ${t.name}. ${t.why}`).join("\n");

  return `Write drafts for ${info.label}.

PLATFORM NORMS: ${info.norms}${info.limit ? `\nSINGLE POST CHARACTER LIMIT: ${info.limit} (applies to single posts, not multi-part formats)` : ""}

POST TYPES TO WRITE (write ${req.perType} draft${req.perType === 1 ? "" : "s"} for each type):
${types}

STRATEGY POSITIONING: ${strategy.positioning}

STRATEGY THEMES (assign each draft one themeId):
${themes}
${batchSection(req.batch)}${req.instruction ? `\nEXTRA DIRECTION FROM THE USER (follow it, but the ground rules still apply):\n${req.instruction}\n` : ""}${variety(req)}
PRODUCT BRIEF:
${formatIntake(intake)}`;
}
