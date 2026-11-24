import { toText } from "@/lib/coerce";
import { errorResponse, isDemo, json, requestProvider, requireKey } from "@/lib/http";
import { demoHashtags, demoHooks, HASHTAG_COUNT } from "@/lib/ideas";
import { callForStructuredOutput, resolveModel, UserFacingError } from "@/lib/llm";
import { HASHTAG_SYSTEM, HASHTAG_TOOL, HOOKS_SYSTEM, HOOKS_TOOL, ideasUserPrompt } from "@/lib/prompts";
import { PLATFORMS, type Platform } from "@/lib/types";
import { parseIntake } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Hook lab (10 opening lines) and the hashtag and keyword helper. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const intake = parseIntake(body?.intake);
    const kind = body?.kind === "hashtags" ? "hashtags" : "hooks";
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!topic) throw new UserFacingError("Say what the post is about, or paste the post.");
    if (topic.length > 3000) throw new UserFacingError("That is too long (max 3000 characters).");
    const ids = new Set(PLATFORMS.map((p) => p.id));
    const platforms = (Array.isArray(body?.platforms) ? (body.platforms as unknown[]) : [])
      .filter((p): p is Platform => typeof p === "string" && ids.has(p as Platform))
      .slice(0, 7);
    const useModel = !isDemo(req);
    const provider = useModel ? requestProvider(req) : null;
    const apiKey = provider ? requireKey(req, provider) : "";
    const call = (system: string, tool: { name: string; description: string; schema: unknown }, user: string) =>
      callForStructuredOutput<Record<string, unknown>>({
        provider: provider!,
        apiKey,
        model: resolveModel(provider!, body?.model),
        system,
        user,
        toolName: tool.name,
        toolDescription: tool.description,
        schema: tool.schema as Record<string, unknown>,
        maxTokens: 1500,
      });

    if (kind === "hooks") {
      let hooks: string[];
      if (!useModel) hooks = demoHooks(topic, intake);
      else {
        const raw = await call(HOOKS_SYSTEM, HOOKS_TOOL, ideasUserPrompt(intake, topic, platforms));
        hooks = (Array.isArray(raw.hooks) ? raw.hooks : []).map(toText).filter(Boolean).slice(0, 10);
        if (hooks.length === 0) throw new UserFacingError("The model did not write any lines. Try again.", 502);
      }
      return json({ hooks, demo: !useModel });
    }

    if (platforms.length === 0) throw new UserFacingError("Pick at least one platform.");
    let sets;
    if (!useModel) sets = demoHashtags(topic, platforms, intake);
    else {
      const named = platforms.map((p) => `${p} (${HASHTAG_COUNT[p]} hashtags)`);
      const raw = await call(HASHTAG_SYSTEM, HASHTAG_TOOL, ideasUserPrompt(intake, topic, named));
      sets = (Array.isArray(raw.sets) ? raw.sets : []).map((s) => {
        const o = (s ?? {}) as Record<string, unknown>;
        const list = (v: unknown) => (Array.isArray(v) ? v.map(toText).filter(Boolean).slice(0, 12) : []);
        return { platform: toText(o.platform), hashtags: list(o.hashtags), keywords: list(o.keywords), advice: toText(o.advice) };
      }).filter((s) => s.platform);
      if (sets.length === 0) throw new UserFacingError("The model did not suggest any tags. Try again.", 502);
    }
    return json({ sets, demo: !useModel });
  } catch (err) {
    return errorResponse(err);
  }
}
