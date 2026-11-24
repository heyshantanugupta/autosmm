import test from "node:test";
import assert from "node:assert/strict";
import { isNewer } from "../lib/update.ts";

test("isNewer compares version names", () => {
  assert.equal(isNewer("v1.2.1", "1.2.0"), true);
  assert.equal(isNewer("v1.10.0", "1.9.9"), true);
  assert.equal(isNewer("v1.2.0", "1.2.0"), false);
  assert.equal(isNewer("v1.1.9", "1.2.0"), false);
  assert.equal(isNewer("nightly", "1.2.0"), false);
  assert.equal(isNewer("v2.0.0", ""), false);
});
