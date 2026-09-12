// Unit-Tests für die reine Score-Logik (läuft mit `node --test`).

import * as assert from "node:assert/strict";
import { test } from "node:test";
import { computeScore } from "../grading/score";

test("alle Tests bestanden ergibt 100 % und bestanden", () => {
  const result = computeScore(7, 7);
  assert.deepEqual(result, {
    passed: 7,
    total: 7,
    percentage: 100,
    isPass: true,
  });
});

test("6 von 7 ergibt 85.7 % und bestanden", () => {
  const result = computeScore(6, 7);
  assert.equal(result.percentage, 85.7);
  assert.equal(result.isPass, true);
});

test("genau 80 % gilt als bestanden", () => {
  const result = computeScore(4, 5);
  assert.equal(result.percentage, 80);
  assert.equal(result.isPass, true);
});

test("unter 80 % gilt als nicht bestanden", () => {
  const result = computeScore(5, 7);
  assert.equal(result.percentage, 71.4);
  assert.equal(result.isPass, false);
});

test("0 Tests insgesamt ist nicht bestanden", () => {
  const result = computeScore(0, 0);
  assert.equal(result.percentage, 0);
  assert.equal(result.isPass, false);
});

test("aufgerundete Anzeige von 80 Prozent reicht nicht zum Bestehen", () => {
  assert.equal(computeScore(1599, 2000).percentage, 80);
  assert.equal(computeScore(1599, 2000).isPass, false);
});
