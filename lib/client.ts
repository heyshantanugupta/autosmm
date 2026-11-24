import type { Settings } from "./storage";
import type { ImportedBrief } from "./importBrief";
import type { Draft, Intake, Platform, Strategy } from "./types";

async function post<T>(path: string, body: Record<string, unknown>, settings: Settings): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.demo) headers["x-demo"] = "1";
  else {
    headers["x-provider"] = settings.provider;
    if (settings.apiKey) headers["x-api-key"] = settings.apiKey;
  }

  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers, body: JSON.stringify({ ...body, model: settings.model }) });
  } catch {
    throw new Error("Could not reach the app server. Is it still running?");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "The request failed. Try again.");
  return data as T;
}

export function requestImport(url: string, settings: Settings) {
  return post<{ brief: ImportedBrief; demo: boolean }>("/api/import", { url }, settings);
}

export function requestStrategy(intake: Intake, settings: Settings) {
  return post<{ strategy: Strategy; demo: boolean }>("/api/strategy", { intake }, settings);
}

export function requestDrafts(
  args: { intake: Intake; strategy: Strategy; platform: Platform; postTypeIds: string[]; perType: number; instruction?: string; tone?: string; rules?: string; feature?: string },
  settings: Settings,
) {
  return post<{ drafts: Draft[]; demo: boolean }>("/api/drafts", args, settings);
}

export async function requestModels(settings: Settings): Promise<string[]> {
  const headers: Record<string, string> = { "x-provider": settings.provider };
  if (settings.apiKey) headers["x-api-key"] = settings.apiKey;
  let res: Response;
  try {
    res = await fetch("/api/models", { headers });
  } catch {
    throw new Error("Could not reach the app server. Is it still running?");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; models?: string[] };
  if (!res.ok) throw new Error(data.error ?? "Could not list models.");
  return data.models ?? [];
}
