import test from "node:test";
import assert from "node:assert/strict";
import { briefFileName, parseBriefFile, serializeBrief } from "../lib/briefFile.ts";
import { BLANK_INTAKE, THEINTERVIEWS_EXAMPLE } from "../lib/presets.ts";

test("a saved brief loads back unchanged", () => {
  const r = parseBriefFile(serializeBrief(THEINTERVIEWS_EXAMPLE));
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.intake, THEINTERVIEWS_EXAMPLE);
});

test("files from somewhere else are refused", () => {
  assert.equal(parseBriefFile("not json").ok, false);
  assert.equal(parseBriefFile(JSON.stringify({ hello: 1 })).ok, false);
  assert.equal(parseBriefFile(JSON.stringify({ app: "other", brief: {} })).ok, false);
});

test("bad values are cleaned instead of trusted", () => {
  const r = parseBriefFile(JSON.stringify({ app: "social-strategy-agent", brief: { productName: 5, goal: "nope", channels: ["x", "bogus"], facts: "a" } }));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.intake.productName, "");
    assert.equal(r.intake.goal, "awareness");
    assert.deepEqual(r.intake.channels, ["x"]);
    assert.equal(r.intake.facts, "a");
  }
});

test("the file never contains a key and the name is tidy", () => {
  assert.ok(!serializeBrief(BLANK_INTAKE).toLowerCase().includes("api"));
  assert.equal(briefFileName({ ...BLANK_INTAKE, productName: "My Cool App!" }), "my-cool-app-brief.json");
  assert.equal(briefFileName(BLANK_INTAKE), "my-brief.json");
});
