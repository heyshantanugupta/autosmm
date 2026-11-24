export type Platform =
  | "linkedin"
  | "instagram"
  | "x"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "reddit";

export type Goal = "signups" | "awareness" | "leads" | "community" | "launch";

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "reddit", label: "Reddit" },
];

export const GOALS: { id: Goal; label: string }[] = [
  { id: "signups", label: "Get more signups" },
  { id: "awareness", label: "Build awareness" },
  { id: "leads", label: "Generate leads / partnerships" },
  { id: "community", label: "Grow a community" },
  { id: "launch", label: "Launch a feature or product" },
];

export interface Intake {
  productName: string;
  oneLiner: string;
  website: string;
  audience: string;
  goal: Goal;
  channels: Platform[];
  /** One fact per line. The only claims drafts may rely on. */
  facts: string;
  /** One real proof point per line (press, numbers, real quotes). Optional. */
  proof: string;
  /** New features, launches, or news worth posting about. */
  newUpdates: string;
  /** One rule per line: things the drafts must never say or do. */
  doNotSay: string;
  tone: string;
  /** Where the social accounts are today: followers, what works, what does not. */
  currentState: string;
  /** A few of the user's own past posts, so drafts can match their voice. Style only, never a source of facts. */
  voiceSamples: string;
  /** Brand colors in plain words or hex, for example "deep teal #0F766E, warm white, one coral accent". Used in image prompts. */
  brandColors: string;
  /** How the brand's pictures should look, for example "clean, editorial, lots of white space". */
  visualStyle: string;
  /** What the logo looks like and where it goes, for example "white wordmark, bottom-right". Never drawn by the image tool. */
  logoNote: string;
  /** Watermark text such as a handle or web address, added to the picture afterwards. */
  watermark: string;
}

export interface StrategyAudience {
  name: string;
  pain: string;
  message: string;
}

export interface StrategyTheme {
  id: string;
  name: string;
  why: string;
  exampleAngle: string;
}

export interface StrategyPlatform {
  platform: Platform;
  fit: "high" | "medium" | "low";
  role: string;
  cadence: string;
  rationale: string;
}

export interface Strategy {
  summary: string;
  positioning: string;
  audiences: StrategyAudience[];
  themes: StrategyTheme[];
  platforms: StrategyPlatform[];
  weeklyRhythm: string;
  measurement: string[];
  risks: string[];
  /** Missing information that would make the strategy better. */
  gaps: string[];
}

/** Settings chosen for one batch of drafts. They sit on top of the brief. */
export interface Batch {
  /** Tone for this batch. Empty means use the brief's tone. */
  tone: string;
  /** Extra rules for this batch, one per line. Added to the brief's do-not-say rules. */
  rules: string;
  /** A feature or update to outline in these posts. Counts as facts the user provided. */
  feature: string;
}

export interface Draft {
  id: string;
  postTypeId: string;
  postTypeLabel: string;
  platform: Platform;
  themeId: string;
  hook: string;
  /** The full text of the post, ready to edit and publish. */
  body: string;
  cta: string;
  hashtags: string[];
  linkSlug: string;
  bestTime: string;
  visualIdea: string;
  /** A detailed, drawable scene for the image generator, written with the post. Empty on older drafts. */
  imageScene?: string;
  /** Facts from the intake that this draft relies on, as claimed by the model. */
  claimsUsed: string[];
  notes: string;
  /** The checklist the user ticks before posting. */
  approval?: Partial<Record<"claims" | "link" | "tone" | "read", boolean>>;
  /** The batch settings this draft was written with, so rewrites and checks use the same ones. */
  batch?: Batch;
  /** Filled in by our own checks after generation. */
  checks: DraftCheck[];
}

export interface DraftCheck {
  level: "ok" | "warn";
  message: string;
}

/** The four kinds of post a balanced plan mixes. */
export type Pillar = "educate" | "proof" | "story" | "offer";

export const PILLARS: { id: Pillar; label: string; hint: string }[] = [
  { id: "educate", label: "Teach", hint: "Help people with something useful" },
  { id: "story", label: "Story", hint: "Share what happened and why" },
  { id: "proof", label: "Proof", hint: "Show real results or how it works" },
  { id: "offer", label: "Offer", hint: "Tell people what is new and how to try it" },
];

/** One planned post: a day, a platform and what to write about. */
export interface PlanItem {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  platform: Platform;
  postTypeId: string;
  themeId: string;
  pillar: Pillar;
  topic: string;
  /** The draft written for this slot, once it exists. */
  draftId?: string;
  posted?: boolean;
}

/** Numbers typed in by the user after a post has been live for a while. */
export interface ResultEntry {
  id: string;
  date: string;
  platform: Platform;
  /** Short name for the post, so the list is readable. */
  label: string;
  themeId?: string;
  postTypeId?: string;
  planItemId?: string;
  likes: number;
  comments: number;
  views: number;
}

export interface Review {
  createdAt: string;
  summary: string;
  doMore: string[];
  changeOrStop: string[];
  tryNext: string[];
}
