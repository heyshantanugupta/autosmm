import type { Intake, Platform } from "./types";

export type IdeaKind = "hooks" | "hashtags";

export interface HashtagSet {
  platform: string;
  hashtags: string[];
  keywords: string[];
  advice: string;
}

/** How many hashtags each platform can use before it starts to look like spam. */
export const HASHTAG_COUNT: Record<Platform, string> = {
  linkedin: "3 to 5",
  instagram: "3 to 8",
  x: "0 to 2",
  facebook: "0 to 3",
  youtube: "3 to 5 in the description",
  tiktok: "3 to 5",
  reddit: "none (Reddit does not use them)",
};

const clean = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "");

export function demoHooks(topic: string, intake: Intake): string[] {
  const t = topic.trim() || intake.oneLiner || intake.productName || "this";
  const who = intake.audience.split(/[.\n]/)[0].trim() || "you";
  return [
    `Most people get ${t} wrong.`,
    `Here is what we learned about ${t}.`,
    `If you are ${who.toLowerCase()}, read this.`,
    `The simplest way to think about ${t}.`,
    `Stop doing this with ${t}.`,
    `Three things about ${t} nobody tells you.`,
    `A small change that helped with ${t}.`,
    `Why does ${t} feel so hard?`,
    `Before you try ${t}, read this.`,
    `We almost skipped ${t}. Here is why we did not.`,
  ];
}

export function demoHashtags(topic: string, platforms: Platform[], intake: Intake): HashtagSet[] {
  const words = `${topic} ${intake.productName}`.split(/\s+/).map(clean).filter((w) => w.length > 3);
  const base = Array.from(new Set(words)).slice(0, 5);
  return platforms.map((p) => ({
    platform: p,
    hashtags: p === "reddit" ? [] : base.map((w) => `#${w}`),
    keywords: Array.from(new Set([topic.trim(), intake.productName].filter(Boolean))),
    advice: `Use ${HASHTAG_COUNT[p]} on ${p}. Mix one broad tag with narrower ones.`,
  }));
}
