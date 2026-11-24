/**
 * Model providers the user can bring their own key for.
 * Only these fixed endpoints are ever called by the server, so the app cannot be pointed at
 * arbitrary URLs (that would let a visitor make your server call internal addresses).
 */
export type ProviderId = "gemini" | "groq" | "openrouter" | "openai" | "xai" | "anthropic" | "ollama";

/** How the provider is usually paid for. Only used to group the list: any provider accepts a paid key. */
export type ProviderGroup = "free" | "local" | "paid";

export const PROVIDER_GROUPS: { id: ProviderGroup; label: string }[] = [
  { id: "free", label: "Has a free tier" },
  { id: "local", label: "Runs on your computer" },
  { id: "paid", label: "Paid API key" },
];

export interface Provider {
  id: ProviderId;
  label: string;
  group: ProviderGroup;
  /** Short note shown in Settings, including whether a free tier exists. */
  note: string;
  keyUrl: string;
  keyPlaceholder: string;
  needsKey: boolean;
  /** Anthropic uses its own SDK. Everything else speaks the OpenAI-compatible chat API. */
  kind: "anthropic" | "openai-compatible";
  defaultModel: string;
  /** Suggested models. Non-Anthropic providers also accept any model id typed by the user. */
  models: { id: string; label: string }[];
  /** Only offered when running locally (the server would otherwise call its own localhost). */
  localOnly?: boolean;
}

export const PROVIDERS: Provider[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    group: "free",
    note: "Works with a free key (rate limited) or a paid key with higher limits. Create it in Google AI Studio.",
    keyUrl: "aistudio.google.com/apikey",
    keyPlaceholder: "AIza...",
    needsKey: true,
    kind: "openai-compatible",
    defaultModel: "gemini-3.5-flash-lite",
    models: [
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (fastest)" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    group: "free",
    note: "Has a free tier with rate limits, and paid plans with higher limits. Groq (with a q) is not the same as xAI Grok. Create a key at console.groq.com.",
    keyUrl: "console.groq.com/keys",
    keyPlaceholder: "gsk_...",
    needsKey: true,
    kind: "openai-compatible",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (balanced)" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fastest)" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B (open model)" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    group: "free",
    note: "Some models are free (their id ends in :free) and paid models work too. Create a key at openrouter.ai.",
    keyUrl: "openrouter.ai/keys",
    keyPlaceholder: "sk-or-...",
    needsKey: true,
    kind: "openai-compatible",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    models: [{ id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" }],
  },
  {
    id: "openai",
    label: "OpenAI ChatGPT",
    group: "paid",
    note: "Uses an OpenAI API key, which is billed separately from a ChatGPT subscription. Create a key at platform.openai.com.",
    keyUrl: "platform.openai.com/api-keys",
    keyPlaceholder: "sk-...",
    needsKey: true,
    kind: "openai-compatible",
    defaultModel: "gpt-5-mini",
    models: [
      { id: "gpt-5-mini", label: "GPT-5 mini (cheaper)" },
      { id: "gpt-5", label: "GPT-5 (higher quality)" },
      { id: "gpt-5-nano", label: "GPT-5 nano (cheapest)" },
    ],
  },
  {
    id: "xai",
    label: "xAI Grok",
    group: "paid",
    note: "Grok, the model from xAI. Uses an xAI API key, which is billed by xAI. Create one at console.x.ai.",
    keyUrl: "console.x.ai",
    keyPlaceholder: "xai-...",
    needsKey: true,
    kind: "openai-compatible",
    defaultModel: "grok-4.7",
    models: [{ id: "grok-4.7", label: "Grok 4.7 (default)" }],
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    group: "paid",
    note: "Best quality. Pay as you go, billed by Anthropic.",
    keyUrl: "console.anthropic.com",
    keyPlaceholder: "sk-ant-...",
    needsKey: true,
    kind: "anthropic",
    defaultModel: "claude-sonnet-5-5",
    models: [
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (balanced)" },
      { id: "claude-opus-5-5", label: "Claude Opus 5.5 (highest quality)" },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (fastest, cheapest)" },
    ],
  },
  {
    id: "ollama",
    label: "Ollama",
    group: "local",
    note: "Runs on your own computer. Needs Ollama installed, and works only when you run this app locally.",
    keyUrl: "ollama.com",
    keyPlaceholder: "",
    needsKey: false,
    kind: "openai-compatible",
    defaultModel: "llama3.1",
    models: [{ id: "llama3.1", label: "llama3.1 (default)" }],
    localOnly: true,
  },
];

export const DEFAULT_PROVIDER: ProviderId = "gemini";

export function getProvider(id: unknown): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

/** Model ids are free text for OpenAI-compatible providers, so keep them to a safe shape. */
export function isSafeModelId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9._:\/-]{1,100}$/.test(v);
}
