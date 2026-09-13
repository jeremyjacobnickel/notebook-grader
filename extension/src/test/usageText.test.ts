import { test } from "node:test";
import * as assert from "node:assert/strict";
import { usageText } from "../sidebar/usageText";

test("unknown router model and missing prices are explicit", () => {
  const text = usageText({reported_model: "default_router", requested_model: "default_router"});
  assert.match(text, /Gemeldetes Modell: unbekannt/);
  assert.match(text, /Gemeldete Kosten: unbekannt/);
});

test("zero cost is distinct from unavailable and storage failures are visible", () => {
  const text = usageText({reported_model: "fhms/example", cost_usd: 0, total_tokens: 42, recorded: false});
  assert.match(text, /0.000000 USD/);
  assert.match(text, /fhms\/example/);
  assert.match(text, /nicht gespeichert/);
});
