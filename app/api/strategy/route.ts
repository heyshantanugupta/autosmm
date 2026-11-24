import { demoStrategy } from "@/lib/demo";
import { errorResponse, isDemo, json, requestProvider, requireKey } from "@/lib/http";
import { callForStructuredOutput, resolveModel, UserFacingError } from "@/lib/llm";
import { STRATEGY_SYSTEM, STRATEGY_TOOL, strategyUserPrompt } from "@/lib/prompts";
import { toText, toTextList } from "@/lib/coerce";
import { PLATFORMS, type Strategy } from "@/lib/types";
import { parseIntake } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

function normalize(raw: Strategy): Strategy {
  const validPlatforms = new Set(PLATFORMS.map((p) => p.id));
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const strategy: Strategy = {
    summary: toText(raw.summary),
    positioning: toText(raw.positioning),
    audiences: arr<unknown>(raw.audiences).map((a) => {
      const o = obj(a);
      return { name: toText(o.name), pain: toText(o.pain), message: toText(o.message) };
    }),
    themes: arr<unknown>(raw.themes)
      .map((t) => {
        const o = obj(t);
        return { id: toText(o.id), name: toText(o.name), why: toText(o.why), exampleAngle: toText(o.exampleAngle) };
      })
      .filter((t) => t.id),
    platforms: arr<unknown>(raw.platforms)
      .map((p) => {
        const o = obj(p);
        return {
          platform: toText(o.platform) as Strategy["platforms"][number]["platform"],
          fit: toText(o.fit) as Strategy["platforms"][number]["fit"],
          role: toText(o.role),
          cadence: toText(o.cadence),
          rationale: toText(o.rationale),
        };
      })
      .filter((p) => validPlatforms.has(p.platform)),
    weeklyRhythm: toText(raw.weeklyRhythm),
    measurement: toTextList(raw.measurement),
    risks: toTextList(raw.risks),
    gaps: toTextList(raw.gaps),
  };
  if (strategy.themes.length === 0 || strategy.platforms.length === 0) {
    throw new UserFacingError("The model returned an incomplete strategy. Try again.", 502);
  }
  return strategy;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { intake?: unknown; model?: unknown } | null;
    const intake = parseIntake(body?.intake);

    if (isDemo(req)) return json({ strategy: demoStrategy(intake), demo: true });

    const provider = requestProvider(req);
    const apiKey = requireKey(req, provider);
    const raw = await callForStructuredOutput<Strategy>({
      provider,
      apiKey,
      model: resolveModel(provider, body?.model),
      system: STRATEGY_SYSTEM,
      user: strategyUserPrompt(intake),
      toolName: STRATEGY_TOOL.name,
      toolDescription: STRATEGY_TOOL.description,
      schema: STRATEGY_TOOL.schema as unknown as Record<string, unknown>,
      maxTokens: 4000,
    });
    return json({ strategy: normalize(raw), demo: false });
  } catch (err) {
    return errorResponse(err);
  }
}
