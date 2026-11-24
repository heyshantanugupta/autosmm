import { errorResponse, isDemo, json, requestProvider, requireKey } from "@/lib/http";
import { callForStructuredOutput, resolveModel, UserFacingError } from "@/lib/llm";
import { cleanMetrics, parseImageDataUrl } from "@/lib/metrics";
import { METRICS_SYSTEM, METRICS_TOOL, metricsUserPrompt } from "@/lib/prompts";
import { PLATFORMS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Reads likes, comments and views off a screenshot of a post. The owner checks them before they are saved. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (isDemo(req)) {
      throw new UserFacingError("Reading a screenshot needs a real AI key. Turn off demo mode, or type the numbers in.");
    }
    const image = parseImageDataUrl(body?.image);
    if (!image) throw new UserFacingError("Use a PNG, JPG or WebP screenshot under about 4 MB.");
    const provider = requestProvider(req);
    if (!provider.vision) {
      throw new UserFacingError(`${provider.label} cannot read pictures with its default models. Pick Gemini, ChatGPT or Claude in Settings, or type the numbers in.`);
    }
    const apiKey = requireKey(req, provider);
    const platform = PLATFORMS.find((p) => p.id === body?.platform)?.label ?? "";
    const raw = await callForStructuredOutput<Record<string, unknown>>({
      provider,
      apiKey,
      model: resolveModel(provider, body?.model),
      system: METRICS_SYSTEM,
      user: metricsUserPrompt(platform),
      toolName: METRICS_TOOL.name,
      toolDescription: METRICS_TOOL.description,
      schema: METRICS_TOOL.schema as unknown as Record<string, unknown>,
      maxTokens: 400,
      image,
    });
    return json({ metrics: cleanMetrics(raw) });
  } catch (err) {
    return errorResponse(err);
  }
}
