import test from "node:test";
import assert from "node:assert/strict";
import { cleanCount, cleanMetrics, parseImageDataUrl } from "../lib/metrics.ts";

test("parseImageDataUrl accepts small PNG, JPEG and WebP data URLs only", () => {
  assert.deepEqual(parseImageDataUrl("data:image/jpeg;base64,/9j/4AAQ"), { mime: "image/jpeg", data: "/9j/4AAQ" });
  assert.equal(parseImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(parseImageDataUrl("data:text/html;base64,PGI+"), null);
  assert.equal(parseImageDataUrl("https://example.com/a.png"), null);
  assert.equal(parseImageDataUrl("data:image/png;base64,AAAA" + "A".repeat(6_000_000)), null);
  assert.equal(parseImageDataUrl(42), null);
});

test("cleanCount keeps whole non-negative numbers and drops the rest", () => {
  assert.equal(cleanCount(1200), 1200);
  assert.equal(cleanCount("2,500"), 2500);
  assert.equal(cleanCount(12.6), 13);
  assert.equal(cleanCount(-3), null);
  assert.equal(cleanCount(null), null);
  assert.equal(cleanCount("lots"), null);
  assert.equal(cleanCount(1e15), null);
  assert.equal(cleanCount(NaN), null);
});

test("cleanMetrics returns null for numbers the screenshot does not show", () => {
  assert.deepEqual(cleanMetrics({ likes: 41, comments: null, views: "1,204", note: "  Views are rounded.  " }), {
    likes: 41,
    comments: null,
    views: 1204,
    note: "Views are rounded.",
  });
  assert.deepEqual(cleanMetrics({}), { likes: null, comments: null, views: null, note: "" });
});
