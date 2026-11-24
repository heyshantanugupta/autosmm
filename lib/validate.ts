import { GOALS, PLATFORMS, type Batch, type Intake, type Platform, type Strategy } from "./types";
import { PLATFORM_INFO } from "./postTypes";
import { UserFacingError } from "./llm";

const MAX_SHORT = 300;
const MAX_LONG = 4000;

function str(value: unknown, max: number, field: string, required = false): string {
  if (value === undefined || value === null || value === "") {
    if (required) throw new UserFacingError(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new UserFacingError(`${field} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new UserFacingError(`${field} is required.`);
  if (trimmed.length > max) throw new UserFacingError(`${field} is too long (max ${max} characters).`);
  return trimmed;
}

export function parseIntake(raw: unknown): Intake {
  if (!raw || typeof raw !== "object") throw new UserFacingError("Missing product details.");
  const r = raw as Record<string, unknown>;

  const goal = GOALS.find((g) => g.id === r.goal)?.id;
  if (!goal) throw new UserFacingError("Pick a goal.");

  const channelsRaw = Array.isArray(r.channels) ? r.channels : [];
  const channels = channelsRaw.filter((c): c is Platform => PLATFORMS.some((p) => p.id === c));

  const intake: Intake = {
    productName: str(r.productName, MAX_SHORT, "Product name", true),
    oneLiner: str(r.oneLiner, 500, "One-liner"),
    website: str(r.website, MAX_SHORT, "Website"),
    audience: str(r.audience, 1000, "Audience"),
    goal,
    channels,
    facts: str(r.facts, MAX_LONG, "Facts", true),
    proof: str(r.proof, MAX_LONG, "Proof points"),
    newUpdates: str(r.newUpdates, MAX_LONG, "New updates"),
    doNotSay: str(r.doNotSay, MAX_LONG, "Do-not-say rules"),
    tone: str(r.tone, 1000, "Tone"),
    currentState: str(r.currentState, MAX_LONG, "Current state"),
    voiceSamples: str(r.voiceSamples, 3000, "Voice samples"),
  };
  return intake;
}

export function parseStrategy(raw: unknown): Strategy {
  if (!raw || typeof raw !== "object") throw new UserFacingError("Missing strategy. Generate one first.");
  const s = raw as Strategy;
  if (!Array.isArray(s.themes) || s.themes.length === 0 || typeof s.positioning !== "string") {
    throw new UserFacingError("The strategy is incomplete. Generate it again.");
  }
  return s;
}

export function parseDraftRequest(raw: unknown): {
  platform: Platform;
  postTypeIds: string[];
  perType: number;
  instruction?: string;
  batch?: Batch;
} {
  if (!raw || typeof raw !== "object") throw new UserFacingError("Missing draft request.");
  const r = raw as Record<string, unknown>;
  const platform = PLATFORMS.find((p) => p.id === r.platform)?.id;
  if (!platform) throw new UserFacingError("Pick a platform.");

  const valid = new Set(PLATFORM_INFO[platform].postTypes.map((t) => t.id));
  const ids = (Array.isArray(r.postTypeIds) ? r.postTypeIds : []).filter(
    (x): x is string => typeof x === "string" && valid.has(x),
  );
  if (ids.length === 0) throw new UserFacingError("Pick at least one post type.");
  if (ids.length > 6) throw new UserFacingError("Pick at most 6 post types at a time.");

  const perType = Math.min(3, Math.max(1, Number(r.perType) || 1));
  const instruction = str(r.instruction, 500, "Instruction") || undefined;
  const batch: Batch = {
    tone: str(r.tone, 200, "Tone"),
    rules: str(r.rules, 1000, "Rules"),
    feature: str(r.feature, 4000, "Feature"),
  };
  const hasBatch = Boolean(batch.tone || batch.rules || batch.feature);
  return { platform, postTypeIds: ids, perType, instruction, batch: hasBatch ? batch : undefined };
}
