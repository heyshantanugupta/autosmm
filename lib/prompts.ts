import { voiceBlock } from "./voice";
import { GOALS, type Batch, type Intake, type Platform, type Strategy } from "./types";
import { PLATFORM_INFO, getPostType } from "./postTypes";

export const GROUND_RULES = `Ground rules that apply to everything you write:
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
    voiceBlock(intake.voiceSamples ?? ""),
  ].filter(Boolean).join("\n");
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
- visualIdea: one concrete sentence on the picture that goes with the post: the subject, where it is, and what is in frame. Say "a real screenshot of <the actual screen>" only when the post shows a real product screen. No stock-photo ideas.
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

export const IMPORT_SYSTEM = `You read the text of a product's website and fill in the first draft of a social media brief for the owner.

Rules:
- Use ONLY what the page text says. Copy or closely paraphrase. Never invent numbers, customers, quotes, awards, pricing, features or results.
- If the page does not say something, leave that field empty and list it under "missing".
- "facts" are plain, checkable statements about the product, one per item, each one short.
- "proof" is only real proof stated on the page (press mentions, named customers, numbers with a source). If there is none, return an empty list.
- "audience" is who the page says the product is for.
- Write plain words. No hype.`;

export const IMPORT_TOOL = {
  name: "submit_brief",
  description: "Submit the first draft of the brief, built only from the page text.",
  schema: {
    type: "object",
    properties: {
      productName: { type: "string" },
      oneLiner: { type: "string", description: "One sentence on what it is and who it helps." },
      audience: { type: "string" },
      facts: { type: "array", items: { type: "string" }, description: "5 to 12 short, checkable facts from the page." },
      proof: { type: "array", items: { type: "string" } },
      newUpdates: { type: "array", items: { type: "string" }, description: "Only launches or news the page announces." },
      missing: { type: "array", items: { type: "string" }, description: "Useful things the page did not say, such as pricing or customer proof." },
    },
    required: ["productName", "oneLiner", "audience", "facts", "proof", "newUpdates", "missing"],
  },
} as const;

export function importUserPrompt(url: string, s: { title: string; siteName: string; description: string; headings: string[]; text: string }): string {
  return [
    `WEBSITE: ${url}`,
    `TITLE: ${s.title || "(none)"}`,
    `SITE NAME: ${s.siteName || "(none)"}`,
    `DESCRIPTION: ${s.description || "(none)"}`,
    `HEADINGS:\n${s.headings.map((h) => `- ${h}`).join("\n") || "- (none)"}`,
    `PAGE TEXT:\n${s.text}`,
  ].join("\n");
}

// ---------- 30-day plan topics ----------

export const CALENDAR_SYSTEM = `You choose what each planned social media post should be about. The dates, platforms, kinds of post and themes are already decided. You write one specific topic for each.

${GROUND_RULES}

Topic rules:
- A topic is an angle in one short line, not a finished post. Example: "Why a resume gap is not the problem people think it is".
- Make the topics for the same theme different from each other.
- Match the kind of post: teach = something useful, story = a real moment or lesson, proof = something real shown or explained, offer = what is new and how to try it.
- Never put numbers, results or customer claims in a topic unless they appear in the brief.`;

export const CALENDAR_TOOL = {
  name: "submit_topics",
  description: "Submit one topic for each planned post.",
  schema: {
    type: "object",
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string", description: "The id of the planned post." }, topic: { type: "string" } },
          required: ["id", "topic"],
        },
      },
    },
    required: ["topics"],
  },
} as const;

export function calendarUserPrompt(
  intake: Intake,
  strategy: Strategy,
  items: { id: string; date: string; platform: string; type: string; theme: string; kind: string; topic: string }[],
  review?: string,
): string {
  return [
    formatIntake(intake),
    `\nPOSITIONING: ${strategy.positioning}`,
    `\nTHEMES:\n${strategy.themes.map((t) => `- ${t.name}: ${t.why}`).join("\n")}`,
    review ? `\nWHAT THE LAST REVIEW SAID (lean on what worked):\n${review}` : "",
    `\nPLANNED POSTS (give each one a topic; the current topic is a placeholder):\n${items.map((i) => `- id=${i.id} | ${i.date} | ${i.platform} | ${i.type} | theme: ${i.theme} | kind: ${i.kind} | placeholder: ${i.topic}`).join("\n")}`,
  ].join("\n");
}

// ---------- reply helper ----------

export const REPLY_SYSTEM = `You write replies to comments and direct messages for the owner of a small brand. The owner reads, edits and sends the reply themselves.

${GROUND_RULES}

Write exactly three replies:
- "Short": one sentence.
- "Friendly": two or three warm sentences.
- "Helpful": answers fully, using only the facts provided.

Rules:
- If the answer is not in the facts, say you will check and come back. Never guess prices, dates, features or policies.
- For a complaint: thank them for telling you, acknowledge how it felt, do not argue, do not admit fault or promise refunds or compensation unless the facts say so, and move the conversation to a direct message.
- For praise: thank them in a specific way. Do not overdo it.
- For spam, abuse or a threat: set needsHuman to true and keep replies short and neutral, or suggest not replying.
- Sound like a person. Match the tone notes. Reply in the language of the message.`;

export const REPLY_TOOL = {
  name: "submit_replies",
  description: "Submit the kind of message and three possible replies.",
  schema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["question", "praise", "complaint", "other"] },
      needsHuman: { type: "boolean", description: "True when the owner should read the message carefully before replying." },
      why: { type: "string", description: "One short sentence on why a person should check it, or empty." },
      replies: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } }, required: ["label", "text"] },
      },
    },
    required: ["category", "needsHuman", "why", "replies"],
  },
} as const;

export const REVIEW_REPLY_RULES = `This message is a public negative review or complaint. Set category to "complaint" and needsHuman to true. Write the three replies as a public response that other readers will see:
- Stay calm and polite. Do not argue, blame the reviewer or get defensive.
- Thank them, acknowledge how it felt, and say you want to put it right.
- Do NOT admit legal fault, and do NOT promise refunds, credits or fixes unless the facts say so.
- Do not repeat details from the review that could identify the person.
- Move the details to a direct message or email in the last sentence.
- Keep each reply under 70 words. No hype, no sales pitch, no emojis.`;

export function replyUserPrompt(intake: Intake, message: string, platform: string, review = false): string {
  return [formatIntake(intake), review ? `\n${REVIEW_REPLY_RULES}` : "", `\nPLATFORM: ${platform || "(not said)"}`, `\nMESSAGE TO REPLY TO:\n"""\n${message}\n"""`].join("\n");
}

// ---------- weekly review ----------

export const REVIEW_SYSTEM = `You review how a small brand's social posts did and tell the owner what to do next.

${GROUND_RULES}

Rules:
- Use ONLY the numbers in the results table. Do not invent figures, reasons or audience facts.
- Say what the numbers show, then what to do. "Do more" and "Change or stop" must each point to something in the table.
- If fewer than 5 posts are logged, say plainly that it is too early to be sure.
- Likes, comments and views from a handful of posts are noisy. Do not call a small difference a trend.
- Short, plain sentences. No hype.`;

export const REVIEW_TOOL = {
  name: "submit_review",
  description: "Submit the review.",
  schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Two or three sentences on how the posts did." },
      doMore: { type: "array", items: { type: "string" }, maxItems: 4 },
      changeOrStop: { type: "array", items: { type: "string" }, maxItems: 4 },
      tryNext: { type: "array", items: { type: "string" }, maxItems: 3, description: "Small experiments for next week." },
    },
    required: ["summary", "doMore", "changeOrStop", "tryNext"],
  },
} as const;

export function reviewUserPrompt(intake: Intake, strategy: Strategy, table: string): string {
  return [
    formatIntake(intake),
    `\nTHEMES IN THE PLAN:\n${strategy.themes.map((t) => `- ${t.name}`).join("\n")}`,
    `\nRESULTS TABLE (the only numbers you may use):\n${table}`,
  ].join("\n");
}


// ---------- hook lab and hashtags ----------

export const HOOKS_SYSTEM = `You write opening lines for social posts for the owner of a small brand.

${GROUND_RULES}

Write exactly 10 different opening lines for the topic. Each one is one sentence, under 20 words.
- Vary the style: a question, a bold claim the facts support, a number only if it is in the facts, a short story start, a mistake to avoid, a plain statement.
- No clickbait, no fake urgency, no invented statistics, no emojis.
- Match the tone notes and the owner's own voice if samples are given.`;

export const HOOKS_TOOL = {
  name: "submit_hooks",
  description: "Submit ten opening lines.",
  schema: {
    type: "object",
    properties: { hooks: { type: "array", minItems: 10, maxItems: 10, items: { type: "string" } } },
    required: ["hooks"],
  },
} as const;

export const HASHTAG_SYSTEM = `You suggest hashtags and search keywords for a social post.

${GROUND_RULES}

For each platform given, return:
- hashtags: the recommended number for that platform, mixing one or two broad tags with narrower ones. No banned or spammy tags. Reddit gets none.
- keywords: 3 to 6 plain words or phrases people search for, to use in the caption or title (search is how LinkedIn, YouTube, TikTok and Instagram are found).
- advice: one short sentence on how to use them on that platform.
Only suggest tags that fit the topic and the brand. Do not invent brand names or trending events.`;

export const HASHTAG_TOOL = {
  name: "submit_hashtags",
  description: "Submit hashtags and keywords per platform.",
  schema: {
    type: "object",
    properties: {
      sets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platform: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            keywords: { type: "array", items: { type: "string" } },
            advice: { type: "string" },
          },
          required: ["platform", "hashtags", "keywords", "advice"],
        },
      },
    },
    required: ["sets"],
  },
} as const;

export function ideasUserPrompt(intake: Intake, topic: string, platforms: string[]): string {
  return [formatIntake(intake), `\nTOPIC OR POST TEXT:\n"""\n${topic}\n"""`, platforms.length ? `\nPLATFORMS: ${platforms.join(", ")}` : ""].filter(Boolean).join("\n");
}
