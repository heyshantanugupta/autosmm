import { buildSchedule } from "@/lib/calendar";
import { isISODate } from "@/lib/dates";
import { errorResponse, isDemo, json, requestProvider, requireKey } from "@/lib/http";
import { callForStructuredOutput, resolveModel, UserFacingError } from "@/lib/llm";
import { PLATFORM_INFO } from "@/lib/postTypes";
import { CALENDAR_SYSTEM, CALENDAR_TOOL, calendarUserPrompt } from "@/lib/prompts";
import { parseIntake, parseStrategy } from "@/lib/validate";
import { toText } from "@/lib/coerce";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Build the 30-day plan. The schedule is plain code. A model only suggests a topic for each post. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const intake = parseIntake(body?.intake);
    const strategy = parseStrategy(body?.strategy);
    if (!isISODate(body?.startDate)) throw new UserFacingError("Pick a start date.");
    const perWeek = Math.min(10, Math.max(1, Math.round(Number(body?.perWeek) || 5)));
    const review = typeof body?.review === "string" ? body.review.slice(0, 800) : undefined;

    const plan = buildSchedule(strategy, intake, body.startDate as string, { perWeek });
    if (plan.length === 0) throw new UserFacingError("The strategy has no platforms to plan for. Build the strategy again.", 422);
    if (isDemo(req)) return json({ plan, demo: true });

    const provider = requestProvider(req);
    const apiKey = requireKey(req, provider);
    const themeName = (id: string) => strategy.themes.find((t) => t.id === id)?.name ?? id;
    const raw = await callForStructuredOutput<{ topics?: unknown }>({
      provider,
      apiKey,
      model: resolveModel(provider, body?.model),
      system: CALENDAR_SYSTEM,
      user: calendarUserPrompt(
        intake,
        strategy,
        plan.map((p) => ({
          id: p.id,
          date: p.date,
          platform: PLATFORM_INFO[p.platform].label,
          type: PLATFORM_INFO[p.platform].postTypes.find((t) => t.id === p.postTypeId)?.label ?? p.postTypeId,
          theme: themeName(p.themeId),
          kind: p.pillar,
          topic: p.topic,
        })),
        review,
      ),
      toolName: CALENDAR_TOOL.name,
      toolDescription: CALENDAR_TOOL.description,
      schema: CALENDAR_TOOL.schema as unknown as Record<string, unknown>,
      maxTokens: 3000,
    });
    const byId = new Map<string, string>();
    for (const t of Array.isArray(raw.topics) ? raw.topics : []) {
      const o = (t ?? {}) as Record<string, unknown>;
      const topic = toText(o.topic).slice(0, 160);
      if (typeof o.id === "string" && topic) byId.set(o.id, topic);
    }
    return json({ plan: plan.map((p) => ({ ...p, topic: byId.get(p.id) ?? p.topic })), demo: false });
  } catch (err) {
    return errorResponse(err);
  }
}
