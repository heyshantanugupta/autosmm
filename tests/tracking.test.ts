import test from "node:test";
import assert from "node:assert/strict";
import { cleanSlug, trackedUrl } from "../lib/tracking.ts";

test("builds a UTM link from the website, platform and slug", () => {
  assert.equal(
    trackedUrl("https://www.example.com", "linkedin", "li-founder-story"),
    "https://www.example.com/?utm_source=linkedin&utm_medium=social&utm_campaign=li-founder-story",
  );
});

test("adds https when the website has none, and keeps existing query parameters", () => {
  assert.equal(
    trackedUrl("example.com/pricing?ref=a", "x", "x-launch"),
    "https://example.com/pricing?ref=a&utm_source=x&utm_medium=social&utm_campaign=x-launch",
  );
});

test("cleans unsafe characters out of the slug", () => {
  assert.equal(cleanSlug("  LI Founder Story!! "), "li-founder-story");
  assert.equal(cleanSlug("a/b?c=d"), "a-b-c-d");
});

test("returns null without a website or slug", () => {
  assert.equal(trackedUrl("", "linkedin", "slug"), null);
  assert.equal(trackedUrl("https://x.com", "linkedin", "!!!"), null);
});
