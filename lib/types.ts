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
  /** Facts from the intake that this draft relies on, as claimed by the model. */
  claimsUsed: string[];
  notes: string;
  /** The batch settings this draft was written with, so rewrites and checks use the same ones. */
  batch?: Batch;
  /** Filled in by our own checks after generation. */
  checks: DraftCheck[];
}

export interface DraftCheck {
  level: "ok" | "warn";
  message: string;
}
