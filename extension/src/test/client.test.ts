import { test } from "node:test";
import * as assert from "node:assert/strict";
import { scriptSources } from "../backend/client";

test("Skriptquellen: nur vollständige Einträge, ältere Backends ohne Quellen", () => {
  const valid = { title: "4.6 Skalarfelder › 4.6.1 Heatmap", pages: "61–62", excerpt: "Eine Heatmap …" };
  assert.deepEqual(scriptSources([valid, { title: "ohne Seiten" }, null, "x"]), [valid]);
  assert.deepEqual(scriptSources(undefined), []);
  assert.deepEqual(scriptSources({ title: "kein Array" }), []);
});
