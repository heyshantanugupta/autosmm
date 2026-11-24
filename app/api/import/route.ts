import { basicBrief, briefFromModel } from "@/lib/importBrief";
import { errorResponse, isDemo, json, requestProvider, requireKey } from "@/lib/http";
import { callForStructuredOutput, resolveModel } from "@/lib/llm";
import { IMPORT_SYSTEM, IMPORT_TOOL, importUserPrompt } from "@/lib/prompts";
import { fetchPublicPage } from "@/lib/safeFetch";
import { extractSiteText } from "@/lib/siteText";
import { UserFacingError } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Read a public website and return a first draft of the brief. Nothing is stored. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { url?: unknown; model?: unknown } | null;
    if (typeof body?.url !== "string") throw new UserFacingError("Paste your website address first.");

    const page = await fetchPublicPage(body.url);
    const site = extractSiteText(page.html);
    if (!site.text && !site.description && !site.title) {
      throw new UserFacingError("That page has no readable text. It may need JavaScript to show its content. Fill in the brief by hand.", 422);
    }

    if (isDemo(req)) return json({ brief: basicBrief(site, page.url), demo: true });

    const provider = requestProvider(req);
    const apiKey = requireKey(req, provider);
    const raw = await callForStructuredOutput<Record<string, unknown>>({
      provider,
      apiKey,
      model: resolveModel(provider, body?.model),
      system: IMPORT_SYSTEM,
      user: importUserPrompt(page.url, site),
      toolName: IMPORT_TOOL.name,
      toolDescription: IMPORT_TOOL.description,
      schema: IMPORT_TOOL.schema as unknown as Record<string, unknown>,
      maxTokens: 2000,
    });
    return json({ brief: briefFromModel(raw, site, page.url), demo: false });
  } catch (err) {
    return errorResponse(err);
  }
}
