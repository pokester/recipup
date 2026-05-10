import { readFileSync } from "node:fs";
import vm from "node:vm";

process.env.NODE_ENV ??= "test";

const tests = [];

globalThis.describe = (name, fn) => {
  fn();
};

globalThis.it = (name, fn) => {
  tests.push({ name, fn });
};

globalThis.expect = (received) => ({
  toBe(expected) {
    if (received !== expected) {
      throw new Error(`Expected ${String(received)} to be ${String(expected)}`);
    }
  },
  toBeDefined() {
    if (received === undefined) {
      throw new Error("Expected value to be defined");
    }
  },
});

const source = readFileSync(new URL("../src/test/smoke.test.ts", import.meta.url), "utf8");
vm.runInThisContext(source, { filename: "src/test/smoke.test.ts" });

let failures = 0;
for (const test of tests) {
  try {
    await test.fn();
    console.log(`✓ ${test.name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${test.name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`${tests.length} smoke tests passed`);
}
