// Unit-Tests für den JUnit-XML-Parser (node:test, kein VS Code nötig).

import { test } from "node:test";
import * as assert from "node:assert/strict";
import { parseJunitXml } from "../grading/junit";

// So sieht echte pytest-Ausgabe aus: bestandene Testcases sind
// selbstschließend, fehlgeschlagene enthalten ein <failure>-Element.
const MIXED_XML = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" errors="0" failures="1" skipped="0" tests="3" time="0.05">
    <testcase classname="test_beispiel" name="test_add" time="0.001" />
    <testcase classname="test_beispiel" name="test_add_negative" time="0.001" />
    <testcase classname="test_beispiel" name="test_is_even" time="0.002">
      <failure message="assert False">def test_is_even(): ...</failure>
    </testcase>
  </testsuite>
</testsuites>`;

test("zählt bestandene und gesamte Tests", () => {
  const counts = parseJunitXml(MIXED_XML);
  assert.equal(counts.total, 3);
  assert.equal(counts.passed, 2);
});

test("wertet <error> wie <failure>", () => {
  const xml = `<testsuite tests="1">
    <testcase name="test_broken"><error message="ImportError">boom</error></testcase>
  </testsuite>`;
  const counts = parseJunitXml(xml);
  assert.equal(counts.total, 1);
  assert.equal(counts.passed, 0);
});

test("alle bestanden bei nur selbstschließenden Testcases", () => {
  const xml = `<testsuite tests="2">
    <testcase name="a" time="0.1"/>
    <testcase name="b" time="0.1"/>
  </testsuite>`;
  const counts = parseJunitXml(xml);
  assert.deepEqual(counts, { passed: 2, total: 2 });
});

test("leere oder testlose XML ergibt 0/0", () => {
  assert.deepEqual(parseJunitXml(""), { passed: 0, total: 0 });
  assert.deepEqual(parseJunitXml("<testsuites></testsuites>"), {
    passed: 0,
    total: 0,
  });
});
