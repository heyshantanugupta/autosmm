import test from "node:test";
import assert from "node:assert/strict";
import { buildImagePrompt, IMAGE_TOOLS } from "../lib/imagePrompt.ts";

const draft: any = { platform: "instagram", visualIdea: "A desk with a laptop showing a link", hook: "h", body: "b", postTypeLabel: "Founder story", themeId: "t" };
const intake: any = { productName: "TheInterviews.ai", audience: "Recruiters" };

test("prompt carries the visual idea, product, size and no-text rule", () => {
  const p = buildImagePrompt(draft, intake);
  assert.match(p, /TheInterviews\.ai/);
  assert.match(p, /A desk with a laptop/);
  assert.match(p, /4:5 portrait/);
  assert.match(p, /Do not include any text/);
  assert.ok(!p.includes("—"));
});

test("falls back to the hook when there is no visual idea", () => {
  const p = buildImagePrompt({ ...draft, visualIdea: "" }, intake);
  assert.match(p, /supports this post: h/);
});

test("ChatGPT link prefills, Gemini opens the app", () => {
  const g = IMAGE_TOOLS.find((t) => t.id === "gemini")!;
  const c = IMAGE_TOOLS.find((t) => t.id === "chatgpt")!;
  assert.equal(g.url("x"), "https://gemini.google.com/app");
  assert.equal(c.url("a b"), "https://chatgpt.com/?q=a%20b");
  assert.equal(c.url("a".repeat(2000)), "https://chatgpt.com/");
});
