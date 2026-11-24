import Anthropic from "@anthropic-ai/sdk";
import { getProvider, isSafeModelId, type Provider } from "./providers";

export class UserFacingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function resolveModel(provider: Provider, requested: unknown): string {
  if (provider.kind === "anthropic") {
    return provider.models.some((m) => m.id === requested) ? (requested as string) : provider.defaultModel;
  }
  return isSafeModelId(requested) ? requested : provider.defaultModel;
}

/** Fixed endpoints. Nothing the browser sends can change where the server connects. */
function openAiBaseUrl(provider: Provider): string {
  switch (provider.id) {
    case "gemini":
      return "https://generativelanguage.googleapis.com/v1beta/openai";
    case "groq":
      return "https://api.groq.com/openai/v1";
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "openai":
      return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    case "xai":
      return process.env.XAI_BASE_URL || "https://api.x.ai/v1";
    case "ollama":
      return process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
    default:
      throw new UserFacingError("Unknown provider.", 400);
  }
}

/** Ollama calls the server's own localhost, so only allow it when the app runs locally. */
export function assertProviderAllowed(provider: Provider) {
  if (provider.localOnly && process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_MODELS !== "1") {
    throw new UserFacingError(
      "Local models only work when you run this app on your own computer. Pick another provider.",
      400,
    );
  }
}

interface ToolCall {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  maxTokens: number;
}

/**
 * Ask Claude for structured output by forcing a single tool call. The tool's input schema is
 * the output format, so the response is already JSON and we never parse free text.
 *
 * The API key comes from the caller's request and is used for this one call only.
 * It is never stored or logged.
 */
export async function callForStructuredOutput<T>(opts: ToolCall): Promise<T> {
  assertProviderAllowed(opts.provider);
  if (opts.provider.kind === "openai-compatible") return callOpenAiCompatible<T>(opts);
  return callAnthropic<T>(opts);
}

async function callAnthropic<T>(opts: ToolCall): Promise<T> {
  const client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 1 });
  try {
    const response = await client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      tools: [
        {
          name: opts.toolName,
          description: opts.toolDescription,
          input_schema: opts.schema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: opts.toolName },
    });

    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      throw new UserFacingError("The model did not return structured output. Try again.", 502);
    }
    if (response.stop_reason === "max_tokens") {
      throw new UserFacingError(
        "The response was cut off. Try fewer post types or a shorter intake, then run it again.",
        502,
      );
    }
    return block.input as T;
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    // Connection and timeout errors are a subclass of APIError, so they must be checked first.
    if (err instanceof Anthropic.APIConnectionError) {
      throw new UserFacingError("Could not reach the Anthropic API. Check your connection and try again.", 502);
    }
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) throw new UserFacingError("Anthropic rejected that API key. Check it and try again.", 401);
      if (err.status === 403) throw new UserFacingError("That API key does not have access to this model.", 403);
      if (err.status === 404) throw new UserFacingError("That model is not available to your account. Pick another model in Settings.", 404);
      if (err.status === 429) throw new UserFacingError("Rate limit reached on your Anthropic account. Wait a minute and retry.", 429);
      throw new UserFacingError(`Anthropic API error (${err.status ?? "unknown"}). Try again.`, 502);
    }
    throw new UserFacingError("Could not reach the Anthropic API. Check your connection and try again.", 502);
  }
}

/** Pull a JSON object out of model text, tolerating code fences and stray prose. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
  }
  throw new UserFacingError(
    "The model did not return valid JSON. Try again, or pick a stronger model in Settings.",
    502,
  );
}

/**
 * Providers other than Anthropic (Gemini, Groq, OpenRouter, Ollama) all speak the OpenAI chat API.
 * Tool calling is uneven across free models, so we ask for a JSON object and describe the schema in
 * the prompt. The routes then validate and normalize whatever comes back.
 */
async function callOpenAiCompatible<T>(opts: ToolCall): Promise<T> {
  const url = `${openAiBaseUrl(opts.provider)}/chat/completions`;
  const system =
    `${opts.system}\n\nReturn ONLY one JSON object, with no commentary and no code fences. ` +
    `It must match this JSON schema:\n${JSON.stringify(opts.schema)}`;

  const send = async (withResponseFormat: boolean) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;
    const body: Record<string, unknown> = {
      model: opts.model,
      // OpenAI's newer models reject max_tokens and expect max_completion_tokens instead.
      ...(opts.provider.id === "openai" ? { max_completion_tokens: opts.maxTokens } : { max_tokens: opts.maxTokens }),
      messages: [
        { role: "system", content: system },
        { role: "user", content: opts.user },
      ],
    };
    if (withResponseFormat) body.response_format = { type: "json_object" };
    try {
      return await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(100_000) });
    } catch {
      throw new UserFacingError(
        opts.provider.id === "ollama"
          ? "Could not reach Ollama. Is it running on this computer?"
          : `Could not reach ${opts.provider.label}. Check your connection and try again.`,
        502,
      );
    }
  };

  const busy = (status: number) => status === 500 || status === 502 || status === 503 || status === 504;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let res = await send(true);
  // Some models reject response_format. Retry once without it.
  if (res.status === 400) res = await send(false);
  // Free tiers are often briefly overloaded (503). Retry a couple of times before giving up.
  for (const delay of [1500, 4000]) {
    if (!busy(res.status)) break;
    await wait(delay);
    res = await send(true);
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new UserFacingError(`${opts.provider.label} rejected that API key. Check it and try again.`, 401);
    }
    if (res.status === 404) {
      throw new UserFacingError("That model is not available to your account. Pick another model in Settings.", 404);
    }
    if (res.status === 429) {
      throw new UserFacingError(
        "Rate limit reached. Free tiers allow only a few requests a minute. Wait a minute and retry, or write fewer drafts at once.",
        429,
      );
    }
    if (busy(res.status)) {
      throw new UserFacingError(
        `${opts.provider.label} is overloaded right now (${res.status}). Free models get busy at peak times. Wait a minute and try again, or pick another model in Settings.`,
        503,
      );
    }
    throw new UserFacingError(`${opts.provider.label} returned an error (${res.status}). Try again.`, 502);
  }

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: unknown }; finish_reason?: string }[];
  } | null;
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new UserFacingError("The model returned an empty response. Try again.", 502);
  }
  if (choice?.finish_reason === "length") {
    throw new UserFacingError(
      "The response was cut off. Try fewer post types or a shorter intake, then run it again.",
      502,
    );
  }
  return extractJson(content) as T;
}

/**
 * Ask the provider which models this key can use, so the user does not have to guess current ids.
 * Only meaningful for OpenAI-compatible providers. Returns ids, with non-chat models filtered out.
 */
export async function listModels(provider: Provider, apiKey: string): Promise<string[]> {
  assertProviderAllowed(provider);
  if (provider.kind !== "openai-compatible") return provider.models.map((m) => m.id);
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  let res: Response;
  try {
    res = await fetch(`${openAiBaseUrl(provider)}/models`, { headers, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new UserFacingError(`Could not reach ${provider.label}. Check your connection and try again.`, 502);
  }
  if (res.status === 401 || res.status === 403) {
    throw new UserFacingError(`${provider.label} rejected that API key. Check it and try again.`, 401);
  }
  if (!res.ok) throw new UserFacingError(`${provider.label} could not list models (${res.status}).`, 502);
  const data = (await res.json().catch(() => null)) as { data?: { id?: unknown }[] } | null;
  const skip = /embed|dall-e|davinci|babbage|codex|search|transcribe|realtime|omni-moderation|sora|instruct|tts|image|imagen|veo|live|audio|speech|whisper|moderation|guard|vision-preview|robotics|computer-use/i;
  const ids = (data?.data ?? [])
    .map((m) => (typeof m.id === "string" ? m.id.replace(/^models\//, "") : ""))
    .filter((id) => isSafeModelId(id) && !skip.test(id));
  return Array.from(new Set(ids)).sort().slice(0, 100);
}
