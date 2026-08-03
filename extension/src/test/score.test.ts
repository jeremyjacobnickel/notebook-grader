// Unit-Tests für die reine Score-Funktion (node:test, kein VS Code nötig).

import { test } from "node:test";
import * as assert from "node:assert/strict";
import { computeScore } from "../grading/score";

test("6 von 7 ist bestanden (85.7 %) — wie im Backend-Contract", () => {
  const score = computeScore(6, 7);
  assert.equal(score.percentage, 85.7);
  assert.equal(score.isPass, true);
});

test("5 von 7 ist nicht bestanden (71.4 %)", () => {
  const score = computeScore(5, 7);
  assert.equal(score.percentage, 71.4);
  assert.equal(score.isPass, false);
});

test("genau 80 % ist bestanden", () => {
  const score = computeScore(4, 5);
  assert.equal(score.percentage, 80);
  assert.equal(score.isPass, true);
});

test("alle bestanden ergibt 100 %", () => {
  const score = computeScore(3, 3);
  assert.equal(score.percentage, 100);
  assert.equal(score.isPass, true);
});

test("0 Tests ergibt 0 % und nicht bestanden", () => {
  const score = computeScore(0, 0);
  assert.equal(score.percentage, 0);
  assert.equal(score.isPass, false);
});
