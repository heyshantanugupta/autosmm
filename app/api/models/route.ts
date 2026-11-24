import { errorResponse, json, requestProvider, requireKey } from "@/lib/http";
import { listModels } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const provider = requestProvider(req);
    const apiKey = requireKey(req, provider);
    return json({ models: await listModels(provider, apiKey) });
  } catch (err) {
    return errorResponse(err);
  }
}
