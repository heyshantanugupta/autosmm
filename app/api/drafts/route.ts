import { applyBatch } from "@/lib/batch";
import { checkDraft } from "@/lib/claims";
import { toText, toTextList } from "@/lib/coerce";
import { demoDrafts } from "@/lib/demo";
import { errorResponse, isDemo, json, requestProvider, requireKey } from "@/lib/http";
import { callForStructuredOutput, resolveModel, UserFacingError } from "@/lib/llm";
import { DRAFTS_SYSTEM, DRAFTS_TOOL, draftsUserPrompt } from "@/lib/prompts";
import { getPostType } from "@/lib/postTypes";
import type { Draft } from "@/lib/types";
import { parseDraftRequest, parseIntake, parseStrategy } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

type RawDraft = Omit<Draft, "id" | "checks" | "platform" | "postTypeLabel">;

const str = toText;
const strList = toTextList;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const intake = parseIntake(body?.intake);
    const strategy = parseStrategy(body?.strategy);
    const request = parseDraftRequest(body);
    const count = request.postTypeIds.length * request.perType;
    // Tone, rules and feature for this batch sit on top of the brief, for checks and demo output.
    const effective = applyBatch(intake, request.batch);

    let rawDrafts: Omit<Draft, "id" | "checks">[];

    if (isDemo(req)) {
      rawDrafts = demoDrafts(effective, strategy, request);
    } else {
      const provider = requestProvider(req);
      const apiKey = requireKey(req, provider);
      const result = await callForStructuredOutput<{ drafts: RawDraft[] }>({
        provider,
        apiKey,
        model: resolveModel(provider, body?.model),
        system: DRAFTS_SYSTEM,
        user: draftsUserPrompt(intake, strategy, request),
        toolName: DRAFTS_TOOL.name,
        toolDescription: DRAFTS_TOOL.description,
        schema: DRAFTS_TOOL.schema as unknown as Record<string, unknown>,
        maxTokens: Math.min(16000, 1500 * count + 1000),
      });

      rawDrafts = (Array.isArray(result.drafts) ? result.drafts : [])
        .map((d) => {
          const type = getPostType(request.platform, str(d.postTypeId));
          if (!type) return null;
          return {
            postTypeId: type.id,
            postTypeLabel: type.label,
            platform: request.platform,
            themeId: str(d.themeId),
            hook: str(d.hook),
            body: str(d.body),
            cta: str(d.cta),
            hashtags: strList(d.hashtags),
            linkSlug: str(d.linkSlug),
            bestTime: str(d.bestTime),
            visualIdea: str(d.visualIdea),
            claimsUsed: strList(d.claimsUsed),
            notes: str(d.notes),
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null && d.body.trim().length > 0);
    }

    if (rawDrafts.length === 0) {
      throw new UserFacingError("The model returned no usable drafts. Try again.", 502);
    }

    const drafts: Draft[] = rawDrafts.map((d, i) => ({
      ...d,
      id: `${d.postTypeId}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      batch: request.batch,
      checks: checkDraft(d, effective),
    }));

    return json({ drafts, demo: isDemo(req) });
  } catch (err) {
    return errorResponse(err);
  }
}
