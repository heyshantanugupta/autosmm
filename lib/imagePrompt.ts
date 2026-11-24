import type { Draft, Intake, Platform } from "./types";

/** Image shape that suits each platform's feed. */
const SHAPE: Record<Platform, { ratio: string; note: string }> = {
  linkedin: { ratio: "1.91:1 landscape (1200 x 627)", note: "a LinkedIn feed image" },
  x: { ratio: "16:9 landscape (1600 x 900)", note: "an image attached to a post on X" },
  facebook: { ratio: "1.91:1 landscape (1200 x 630)", note: "a Facebook feed image" },
  instagram: { ratio: "4:5 portrait (1080 x 1350)", note: "an Instagram feed image" },
  tiktok: { ratio: "9:16 vertical (1080 x 1920)", note: "a vertical TikTok cover or slide" },
  youtube: { ratio: "16:9 landscape (1280 x 720)", note: "a YouTube thumbnail" },
  reddit: { ratio: "16:9 landscape (1600 x 900)", note: "an image for a Reddit post" },
};

/**
 * A ready-to-paste prompt for any image generator. Built from the draft's own visual idea, so it
 * needs no extra model call. It asks for no text in the picture, because image models misspell
 * words and invent numbers; the person adds real text afterwards.
 */
export function buildImagePrompt(draft: Draft, intake: Intake): string {
  const shape = SHAPE[draft.platform];
  const idea =
    draft.visualIdea.trim() ||
    `A simple, clear picture that supports this post: ${draft.hook || draft.body.slice(0, 140)}`;
  const lines = [
    `Create ${shape.note} for ${intake.productName || "a product"}.`,
    "",
    `Scene: ${idea.replace(/\s+/g, " ")}`,
    draft.themeId ? `Mood: ${draft.postTypeLabel.toLowerCase()} post, calm and credible.` : "",
    intake.audience ? `Audience: ${intake.audience.replace(/\s+/g, " ").slice(0, 200)}` : "",
    "",
    `Size: ${shape.ratio}.`,
    "Style: clean, modern, lots of empty space, soft colors, one clear focal point.",
    "Do not include any text, letters, numbers, logos or watermarks in the image.",
    "Do not show real people's faces or invented screenshots with fake data.",
  ];
  return lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n").trim();
}

export interface ImageTool {
  id: "gemini" | "chatgpt";
  label: string;
  url: (prompt: string) => string;
  /** True when the link fills the prompt in for the person. */
  prefills: boolean;
}

export const IMAGE_TOOLS: ImageTool[] = [
  { id: "gemini", label: "Gemini", url: () => "https://gemini.google.com/app", prefills: false },
  {
    id: "chatgpt",
    label: "ChatGPT",
    url: (p) => (p.length <= 1500 ? `https://chatgpt.com/?q=${encodeURIComponent(p)}` : "https://chatgpt.com/"),
    prefills: true,
  },
];
