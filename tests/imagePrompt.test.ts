import test from "node:test";
import assert from "node:assert/strict";
import { buildImagePrompt, IMAGE_TOOLS } from "../lib/imagePrompt.ts";

const draft: any = { platform: "instagram", postTypeId: "founder-story", visualIdea: "A desk with a laptop showing a link", hook: "Why we built it", body: "b", postTypeLabel: "Founder story", themeId: "t" };
const intake: any = { productName: "Brightloop", oneLiner: "A habit tracker for busy teams.", audience: "Recruiters" };

test("prompt is laid out in labeled lines with product, subject, size and no-text rule", () => {
  const p = buildImagePrompt(draft, intake);
  assert.match(p, /for Brightloop \(A habit tracker for busy teams\)\./);
  assert.match(p, /Subject: A desk with a laptop/);
  assert.match(p, /Composition: .*bottom third/);
  assert.match(p, /Style: .*photograph/);
  assert.match(p, /Light and color:/);
  assert.match(p, /Format: 4:5 portrait/);
  assert.match(p, /Avoid: any text, letters or numbers; logos or watermarks/);
  assert.ok(!p.includes("—"));
});

test("a 'real screenshot' idea becomes a scene that leaves room for the real one", () => {
  const p = buildImagePrompt({ ...draft, postTypeId: "product-demo", postTypeLabel: "Product demo", visualIdea: "A real screenshot of the product." }, intake);
  assert.doesNotMatch(p, /real screenshot of the product/);
  assert.match(p, /blurred, unreadable app screen/);
});

test("style follows the post type and composition follows the platform", () => {
  const data = buildImagePrompt({ ...draft, platform: "tiktok", postTypeId: "data-insight", postTypeLabel: "Data insight", visualIdea: "" }, intake);
  assert.match(data, /no numbers, labels or axes/);
  assert.match(data, /top 15% and bottom 25%/);
  assert.match(data, /9:16 vertical/);
});

test("works with a bare brief", () => {
  const p = buildImagePrompt({ ...draft, visualIdea: "", hook: "", body: "" }, { productName: "", oneLiner: "", audience: "" } as any);
  assert.match(p, /for a product\./);
  assert.doesNotMatch(p, /undefined/);
});

test("ChatGPT link prefills, Gemini opens the app", () => {
  const g = IMAGE_TOOLS.find((t) => t.id === "gemini")!;
  const c = IMAGE_TOOLS.find((t) => t.id === "chatgpt")!;
  assert.equal(g.url("x"), "https://gemini.google.com/app");
  assert.equal(c.url("a b"), "https://chatgpt.com/?q=" + encodeURIComponent("a b"));
  assert.equal(c.url("a".repeat(2000)), "https://chatgpt.com/");
});

test("uses the writer's detailed scene when there is one", () => {
  const p = buildImagePrompt({ ...draft, imageScene: "A cluttered team lead's desk at 8am, a half-written goal list on a notepad, a mug, a phone face down." }, intake);
  assert.match(p, /Subject: A cluttered team lead's desk at 8am/);
  assert.doesNotMatch(p, /A desk with a laptop showing a link/);
});

test("brand colors, style, logo and watermark shape the prompt without drawing text", () => {
  const brand = { ...intake, brandColors: "deep teal #0F766E, warm white", visualStyle: "clean and editorial", logoNote: "white wordmark, top left", watermark: "@brightloop" };
  const p = buildImagePrompt(draft, brand);
  assert.match(p, /Brand colors: deep teal #0F766E, warm white\./);
  assert.match(p, /Style: clean and editorial; /);
  assert.match(p, /Logo space: .*top-left corner.*Do not draw or invent a logo.*attach my logo file/);
  assert.match(p, /Watermark space: .*"@brightloop".*Do not type that text/);
  assert.match(p, /Avoid: any text, letters or numbers; any drawn logo or watermark/);
  assert.doesNotMatch(p, /No neon/);
});

test("without brand fields the prompt keeps the default palette and has no logo lines", () => {
  const p = buildImagePrompt(draft, intake);
  assert.match(p, /No neon/);
  assert.doesNotMatch(p, /Logo space|Watermark space|Brand colors/);
});
