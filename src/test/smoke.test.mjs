import test from "node:test";
import assert from "node:assert/strict";

test("smoke test runner executes", () => {
  assert.equal(true, true);
});

test("Node environment is available", () => {
  assert.ok(process.version);
});
