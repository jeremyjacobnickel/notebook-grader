import { test } from "node:test";
import * as assert from "node:assert/strict";
import { feedback, isOpen, subtaskSummary } from "../grading/feedback";
import { parseJunitXml } from "../grading/junitXml";

test("missing functions and placeholders are open with explicit reasons", () => {
  const cases = parseJunitXml('<testcase name="test_1a_iteration"><skipped message="MISSING: factorial_iter fehlt." /></testcase>');
  assert.equal(isOpen(cases[0]), true);
  assert.match(feedback(cases[0]), /factorial_iter fehlt/);
  const tasks = [{task: "1", part: "a", id: "1a", title: ""}, {task: "1", part: "b", id: "1b", title: ""}];
  assert.match(subtaskSummary(cases, tasks)[0], /^1a: offen/);
  assert.match(subtaskSummary(cases, tasks)[1], /^1b: noch nicht geprüft/);
});

test("runtime and expectation failures have distinct explanations", () => {
  assert.match(feedback({name: "x", passed: false, detail: "TypeError: invalid operand"}), /Ausführungsfehler/);
  assert.match(feedback({name: "x", passed: false, detail: "assert 3 == 4"}), /Ergebnis/);
  assert.equal(isOpen({name: "x", passed: false, detail: "assert 3 == 4"}), false);
});

test("failure body with escaped lines survives XML parsing", () => {
  const [result] = parseJunitXml('<testcase name="test_x"><failure message="short">AssertionError: falsch&#10;assert 3 &lt; 2</failure></testcase>');
  assert.equal(result.detail, 'AssertionError: falsch\nassert 3 < 2');
});
