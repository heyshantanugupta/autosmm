import { toText, toTextList } from "@/lib/coerce";
import { parseEntries } from "@/lib/entries";
import { errorResponse, isDemo, json, requestProvider, requireKey } from "@/lib/http";
import { callForStructuredOutput, resolveModel, UserFacingError } from "@/lib/llm";
import { REVIEW_SYSTEM, REVIEW_TOOL, reviewUserPrompt } from "@/lib/prompts";
import { basicReview, summarize, summaryText } from "@/lib/results";
import { parseIntake, parseStrategy } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

/** A short "do more of this, change that" note. The numbers come from our own table, not the model. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const intake = parseIntake(body?.intake);
    const strategy = parseStrategy(body?.strategy);
    const entries = parseEntries(body?.entries);
    if (entries.length === 0) throw new UserFacingError("Log the results of at least one post first.");

    const themeName = (id: string) => strategy.themes.find((t) => t.id === id)?.name ?? "";
    const stats = summarize(entries, themeName);
    const createdAt = new Date().toISOString().slice(0, 10);

    if (isDemo(req)) return json({ review: { createdAt, ...basicReview(stats) }, stats, demo: true });

    const provider = requestProvider(req);
    const apiKey = requireKey(req, provider);
    const raw = await callForStructuredOutput<Record<string, unknown>>({
      provider,
      apiKey,
      model: resolveModel(provider, body?.model),
      system: REVIEW_SYSTEM,
      user: reviewUserPrompt(intake, strategy, summaryText(stats)),
      toolName: REVIEW_TOOL.name,
      toolDescription: REVIEW_TOOL.description,
      schema: REVIEW_TOOL.schema as unknown as Record<string, unknown>,
      maxTokens: 1200,
    });
    const fallback = basicReview(stats);
    const review = {
      createdAt,
      summary: toText(raw.summary) || fallback.summary,
      doMore: toTextList(raw.doMore).slice(0, 4),
      changeOrStop: toTextList(raw.changeOrStop).slice(0, 4),
      tryNext: toTextList(raw.tryNext).slice(0, 3),
    };
    return json({ review, stats, demo: false });
  } catch (err) {
    return errorResponse(err);
  }
}
