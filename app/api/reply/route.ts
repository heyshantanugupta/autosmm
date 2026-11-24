import { toText } from "@/lib/coerce";
import { checkDraft } from "@/lib/claims";
import { errorResponse, isDemo, json, requestProvider, requireKey } from "@/lib/http";
import { callForStructuredOutput, resolveModel, UserFacingError } from "@/lib/llm";
import { REPLY_SYSTEM, REPLY_TOOL, replyUserPrompt } from "@/lib/prompts";
import { classifyMessage, demoReplies, demoReviewReplies, type MessageKind } from "@/lib/reply";
import { PLATFORMS } from "@/lib/types";
import { parseIntake } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS: MessageKind[] = ["question", "praise", "complaint", "other"];

/** Three possible replies to a comment or message. The owner edits and sends them. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const intake = parseIntake(body?.intake);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) throw new UserFacingError("Paste the comment or message you want to reply to.");
    if (message.length > 1500) throw new UserFacingError("That message is too long (max 1500 characters).");
    const platform = PLATFORMS.find((p) => p.id === body?.platform)?.label ?? "";

    const review = body?.kind === "review";
    let category: MessageKind = review ? "complaint" : classifyMessage(message);
    let needsHuman = category === "complaint";
    let why = needsHuman ? "A complaint is worth reading twice before you reply." : "";
    let replies: { label: string; text: string }[];

    if (isDemo(req)) {
      replies = review ? demoReviewReplies(intake) : demoReplies(category, intake);
    } else {
      const provider = requestProvider(req);
      const apiKey = requireKey(req, provider);
      const raw = await callForStructuredOutput<Record<string, unknown>>({
        provider,
        apiKey,
        model: resolveModel(provider, body?.model),
        system: REPLY_SYSTEM,
        user: replyUserPrompt(intake, message, platform, review),
        toolName: REPLY_TOOL.name,
        toolDescription: REPLY_TOOL.description,
        schema: REPLY_TOOL.schema as unknown as Record<string, unknown>,
        maxTokens: 1200,
      });
      const k = toText(raw.category) as MessageKind;
      if (KINDS.includes(k) && !review) category = k;
      needsHuman = raw.needsHuman === true || category === "complaint";
      why = toText(raw.why) || (needsHuman ? "Read this one carefully before you reply." : "");
      replies = (Array.isArray(raw.replies) ? raw.replies : [])
        .map((r, i) => {
          const o = (r ?? {}) as Record<string, unknown>;
          return { label: toText(o.label) || ["Short", "Friendly", "Helpful"][i] || "Reply", text: toText(o.text) };
        })
        .filter((r) => r.text)
        .slice(0, 3);
      if (replies.length === 0) throw new UserFacingError("The model did not write any replies. Try again.", 502);
    }

    // Same checks as drafts: invented numbers, banned phrases and style rules.
    const withChecks = replies.map((r) => ({ ...r, warnings: checkDraft({ body: r.text, claimsUsed: [] }, intake).filter((c) => c.level === "warn").map((c) => c.message) }));
    return json({ category, needsHuman, why, replies: withChecks, demo: isDemo(req) });
  } catch (err) {
    return errorResponse(err);
  }
}
