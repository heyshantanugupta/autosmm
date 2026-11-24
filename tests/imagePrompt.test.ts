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

import { buildLogoPrompt, parseCorner } from "../lib/imagePrompt.ts";
import { pickColors } from "../lib/logo.ts";
import { stampLayout } from "../lib/stamp.ts";

test("an uploaded logo reserves space even with no logo note", () => {
  const p = buildImagePrompt(draft, intake, { hasLogo: true });
  assert.match(p, /Logo space: .*bottom-right corner.*Do not draw or invent a logo/);
  assert.match(p, /Avoid: any text, letters or numbers; any drawn logo or watermark/);
});

test("the logo prompt uses the brief and asks for one flat mark", () => {
  const p = buildLogoPrompt({ ...intake, brandColors: "deep teal, coral", visualStyle: "friendly" });
  assert.match(p, /Design a logo for /);
  assert.match(p, /Colors: deep teal, coral\. Use at most two\./);
  assert.match(p, /Style: friendly; flat vector look/);
  assert.match(p, /spelled exactly like this/);
});

test("parseCorner reads the logo note", () => {
  assert.deepEqual(parseCorner("white wordmark, top left"), { v: "top", h: "left" });
  assert.deepEqual(parseCorner("center bottom"), { v: "bottom", h: "center" });
  assert.deepEqual(parseCorner(""), { v: "bottom", h: "right" });
});

test("pickColors ignores white and transparent pixels and merges close shades", () => {
  const px: number[] = [];
  const add = (r: number, g: number, b: number, a: number, n: number) => { for (let i = 0; i < n; i++) px.push(r, g, b, a); };
  add(255, 255, 255, 255, 500);
  add(10, 10, 10, 0, 500);
  add(15, 118, 110, 255, 300);
  add(18, 120, 112, 255, 100);
  add(240, 90, 70, 255, 120);
  assert.deepEqual(pickColors(px), ["#0F766E", "#F05A46"]);
});

test("stampLayout puts the logo in its corner and the watermark away from it", () => {
  const l = stampLayout({ w: 1000, h: 500 }, { w: 200, h: 100 }, { v: "bottom", h: "right" }, true);
  assert.deepEqual(l.logo, { x: 850, y: 410, w: 120, h: 60 });
  assert.equal(l.watermark?.align, "left");
  const top = stampLayout({ w: 1000, h: 500 }, { w: 200, h: 100 }, { v: "top", h: "left" }, true);
  assert.deepEqual(top.logo, { x: 30, y: 30, w: 120, h: 60 });
  assert.equal(top.watermark?.align, "right");
  const none = stampLayout({ w: 1000, h: 500 }, null, { v: "bottom", h: "right" }, false);
  assert.deepEqual(none, { logo: null, watermark: null });
});
