import { NextResponse } from "next/server";
import { UserFacingError } from "./llm";
import { getProvider, type Provider } from "./providers";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(err: unknown) {
  if (err instanceof UserFacingError) return json({ error: err.message }, err.status);
  // Deliberately generic: never echo internals or anything that could contain a key.
  console.error("Unexpected error in API route:", err instanceof Error ? err.name : "unknown");
  return json({ error: "Something went wrong on the server. Try again." }, 500);
}

export function isDemo(req: Request): boolean {
  return req.headers.get("x-demo") === "1";
}

export function requestProvider(req: Request): Provider {
  return getProvider(req.headers.get("x-provider"));
}

/** Reads the user's own API key from the request header. Never stored or logged. */
export function requireKey(req: Request, provider: Provider): string {
  const key = (req.headers.get("x-api-key") ?? "").trim();
  if (!provider.needsKey) return key;
  if (!key) {
    throw new UserFacingError(`Add your ${provider.label} API key in Settings, or switch on demo mode.`, 401);
  }
  if (provider.kind === "anthropic" && !key.startsWith("sk-ant-")) {
    throw new UserFacingError("That does not look like an Anthropic API key. Keys start with sk-ant-.", 401);
  }
  if (key.length < 10 || key.length > 300 || /\s/.test(key)) {
    throw new UserFacingError("That does not look like a valid API key.", 401);
  }
  return key;
}
