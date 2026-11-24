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

type Kind = "story" | "product" | "data" | "opinion" | "teach" | "quote" | "default";

/** Picks a look from the post type, so the picture matches what the post is doing. */
function kindOf(draft: Draft): Kind {
  const key = `${draft.postTypeId} ${draft.postTypeLabel}`.toLowerCase();
  if (/quote/.test(key)) return "quote";
  if (/story|founder|customer/.test(key)) return "story";
  if (/demo|feature|announce|launch|product|build-in-public|update/.test(key)) return "product";
  if (/data|insight|proof|result/.test(key)) return "data";
  if (/myth|hot-take|opinion|poll|question/.test(key)) return "opinion";
  if (/how-to|tip|carousel|teach|educat/.test(key)) return "teach";
  return "default";
}

/** Concrete look, light and subject for each kind of post. Image tools do best with specific, visual words. */
const LOOK: Record<Kind, { style: string; light: string; subject: string }> = {
  story: {
    style: "editorial lifestyle photograph, shot on a 35mm lens, natural and candid",
    light: "soft window light, warm tones, shallow depth of field",
    subject: "a real-feeling moment shown through hands, objects and a workspace, with no faces visible",
  },
  product: {
    style: "clean product-in-context illustration, modern flat design with subtle depth",
    light: "even, bright studio light, gentle shadows",
    subject: "a laptop or phone on a tidy desk showing a blurred, unreadable app screen, so a real screenshot can be placed over it later",
  },
  data: {
    style: "minimal abstract data illustration, flat vector shapes",
    light: "flat, even light",
    subject: "simple bars, lines or dots rising or connecting, with no numbers, labels or axes",
  },
  opinion: {
    style: "bold minimal graphic metaphor, flat vector, strong shapes",
    light: "flat, high contrast",
    subject: "one clear visual metaphor for the idea, drawn with a few simple shapes",
  },
  teach: {
    style: "clear explanatory illustration, flat vector, friendly and uncluttered",
    light: "flat, even light",
    subject: "one simple scene or object that stands for the single idea being taught",
  },
  quote: {
    style: "calm abstract background, soft gradient or paper texture",
    light: "flat, even light",
    subject: "a plain textured field with a large empty area in the middle, where the quote will be added later",
  },
  default: {
    style: "clean modern illustration, flat vector, uncluttered",
    light: "soft, even light",
    subject: "one clear object or scene that supports the post",
  },
};

/** Where to keep the picture clear, so the platform's own buttons and the person's text overlay do not cover the subject. */
const SAFE: Record<Platform, string> = {
  linkedin: "Place the subject on the left or right third. Keep the other two thirds calm and empty, for a headline added later.",
  x: "Center the subject. Keep a small empty margin on every side, because the feed crops the edges.",
  facebook: "Place the subject slightly left of center. Keep the right side calm and empty.",
  instagram: "Place the subject in the upper two thirds. Keep the bottom third calm and empty, for a caption overlay.",
  tiktok: "Keep the top 15% and bottom 25% empty, because the app covers them with buttons and captions. Put the subject in the middle.",
  youtube: "Use one large, bold subject on the left. Keep the right third empty and the contrast high, so it reads at thumbnail size.",
  reddit: "Center one clear subject with a simple background, so it reads in a small preview.",
};

const clip = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

/** A visual idea that only says "use a real screenshot" cannot be drawn by an image tool. */
const wantsRealScreen = (s: string) => /\b(screenshot|screen recording|screen capture|screen|recording|video|demo)\b/i.test(s);

/** Which corner the owner's logo note asks for. Defaults to bottom-right. */
function logoCorner(note: string): string {
  const n = note.toLowerCase();
  const v = /\btop\b/.test(n) ? "top" : "bottom";
  const h = /\bleft\b/.test(n) ? "left" : /\bcent(er|re)\b/.test(n) ? "center" : "right";
  return h === "center" ? `${v} center` : `${v}-${h}`;
}

/**
 * A ready-to-paste prompt for any image generator. Built from the draft and the brief, so it needs no
 * extra model call: the scene comes from the one the writer produced with the post. It is laid out in
 * labeled lines (subject, composition, style, brand, light, format, avoid) because image tools follow
 * specific, concrete direction better than a loose idea.
 *
 * Image tools cannot read a website and misspell words, so brand colors and style are written out, text is
 * never drawn in the picture, and the logo and watermark get reserved space for the owner to add afterwards.
 */
export function buildImagePrompt(draft: Draft, intake: Intake): string {
  const shape = SHAPE[draft.platform];
  const look = LOOK[kindOf(draft)];
  const name = intake.productName.trim() || "a product";
  const what = clip(intake.oneLiner || "", 160).replace(/[.\s]+$/, "");
  const about = clip(draft.hook || draft.body, 140);
  const scene = clip(draft.imageScene || "", 600);
  const idea = clip(draft.visualIdea || "", 220);
  const colors = clip(intake.brandColors || "", 200);
  const styleNote = clip(intake.visualStyle || "", 200);
  const logo = clip(intake.logoNote || "", 200);
  const mark = clip(intake.watermark || "", 60);

  // Prefer the writer's detailed scene. Fall back to the short idea when it is something an image tool can
  // draw. A "real screenshot" idea is replaced by a scene that leaves room for the real one.
  const pick = scene || (idea && !wantsRealScreen(idea) ? idea : look.subject);
  const subject = `${pick}${/[.!?]$/.test(pick) ? "" : "."}`;

  const lines = [
    `Create ${shape.note} for ${name}${what ? ` (${what})` : ""}.`,
    about ? `The post it goes with is about: "${about}"` : "",
    intake.audience.trim() ? `The viewers are: ${clip(intake.audience, 160)}.` : "",
    "",
    `Subject: ${subject}`,
    `Composition: ${SAFE[draft.platform]} One clear focal point, simple background, plenty of empty space.`,
    `Style: ${styleNote ? `${styleNote}; ${look.style}` : look.style}.`,
    colors
      ? `Brand colors: ${colors}. Use them for the main surfaces and the accent, and keep everything else neutral. No other bright colors.`
      : "",
    `Light and color: ${look.light}.${colors ? "" : " A calm palette of two or three harmonious colors plus one accent. No neon."}`,
    logo
      ? `Logo space: keep a clean, empty area about 12% of the image width in the ${logoCorner(logo)} corner. Do not draw or invent a logo. If I attach my logo file, place it there exactly as it is, unchanged (logo: ${logo}).`
      : "",
    mark
      ? `Watermark space: keep a small, quiet, low-contrast strip along the bottom edge for "${mark}". Do not type that text into the picture, because image tools misspell it. I will add it afterwards.`
      : "",
    `Format: ${shape.ratio}.`,
    "",
    `Avoid: any text, letters or numbers; ${logo || mark ? "any drawn logo or watermark" : "logos or watermarks"}; real people's faces; invented screenshots with fake data; stock-photo cliches; clutter; distorted hands.`,
  ];
  return lines.filter((l, i) => l !== "" || (i > 0 && lines[i - 1] !== "")).join("\n").trim();
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
