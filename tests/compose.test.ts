import test from "node:test";
import assert from "node:assert/strict";
import { composeTarget } from "../lib/compose.ts";

test("X fills in short posts and encodes them", () => {
  const t = composeTarget("x", "Hello & welcome #1");
  assert.equal(t.prefilled, true);
  assert.equal(t.url, "https://x.com/intent/tweet?text=Hello%20%26%20welcome%20%231");
});

test("X does not try to fill in text over 280 characters", () => {
  const t = composeTarget("x", "a".repeat(281));
  assert.equal(t.prefilled, false);
  assert.equal(t.url, "https://x.com/compose/post");
});

test("LinkedIn opens the post box and passes the text along", () => {
  const t = composeTarget("linkedin", "Line one\n\nLine two");
  assert.ok(t.url.startsWith("https://www.linkedin.com/feed/?shareActive=true&text=Line%20one%0A%0ALine%20two"));
  assert.equal(t.prefilled, false);
});

test("very long LinkedIn posts are not put in the URL", () => {
  const t = composeTarget("linkedin", "a".repeat(2500));
  assert.equal(t.url, "https://www.linkedin.com/feed/?shareActive=true");
});

test("every platform opens an https page", () => {
  for (const p of ["linkedin", "instagram", "x", "facebook", "youtube", "tiktok", "reddit"] as const) {
    assert.ok(composeTarget(p, "hi").url.startsWith("https://"));
  }
});
