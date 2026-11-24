import type { Settings } from "./storage";
import type { ImportedBrief } from "./importBrief";
import type { Summary } from "./results";
import type { Draft, Intake, Platform, PlanItem, ResultEntry, Review, Strategy } from "./types";

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

export function requestCalendar(args: { intake: Intake; strategy: Strategy; startDate: string; perWeek?: number; review?: string }, settings: Settings) {
  return post<{ plan: PlanItem[]; demo: boolean }>("/api/calendar", args, settings);
}

export interface ReplyResult {
  category: "question" | "praise" | "complaint" | "other";
  needsHuman: boolean;
  why: string;
  replies: { label: string; text: string; warnings: string[] }[];
  demo: boolean;
}

export function requestReply(args: { intake: Intake; message: string; platform?: Platform; kind?: "message" | "review" }, settings: Settings) {
  return post<ReplyResult>("/api/reply", args, settings);
}

export function requestReview(args: { intake: Intake; strategy: Strategy; entries: ResultEntry[] }, settings: Settings) {
  return post<{ review: Review; stats: Summary; demo: boolean }>("/api/review", args, settings);
}

export interface HashtagResult {
  platform: string;
  hashtags: string[];
  keywords: string[];
  advice: string;
}

export function requestHooks(args: { intake: Intake; topic: string; platforms?: Platform[] }, settings: Settings) {
  return post<{ hooks: string[]; demo: boolean }>("/api/ideas", { ...args, kind: "hooks" }, settings);
}

export function requestHashtags(args: { intake: Intake; topic: string; platforms: Platform[] }, settings: Settings) {
  return post<{ sets: HashtagResult[]; demo: boolean }>("/api/ideas", { ...args, kind: "hashtags" }, settings);
}
