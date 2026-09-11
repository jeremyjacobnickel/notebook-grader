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
    <testcase classname="test_aufgabe_4" name="test_n" time="0.002">
      <failure message="assert None == 5">def test_n(): ...</failure>
    </testcase>
  </testsuite>
</testsuites>`;

test("zählt bestandene und gesamte Tests", () => {
  const counts = parseJunitXml(MIXED_XML);
  assert.equal(counts.total, 3);
  assert.equal(counts.passed, 2);
});

test("liefert Name, Datei und Meldung des fehlgeschlagenen Tests", () => {
  const counts = parseJunitXml(MIXED_XML);
  assert.equal(counts.failures.length, 1);
  assert.deepEqual(counts.failures[0], {
    name: "test_n",
    classname: "test_aufgabe_4",
    message: "assert None == 5",
  });
});

test("wertet <error> wie <failure> und dekodiert XML-Zeichen", () => {
  const xml = `<testsuite tests="1">
    <testcase classname="test_x" name="test_broken">
      <error message="ImportError: No module named &quot;numpy&quot;">boom</error>
    </testcase>
  </testsuite>`;
  const counts = parseJunitXml(xml);
  assert.equal(counts.passed, 0);
  assert.equal(counts.failures[0].message, 'ImportError: No module named "numpy"');
});

test("kürzt lange Meldungen auf die erste Zeile", () => {
  const xml = `<testsuite tests="1">
    <testcase classname="c" name="n">
      <failure message="erste Zeile&#10;zweite Zeile">x</failure>
    </testcase>
  </testsuite>`;
  const counts = parseJunitXml(xml);
  assert.equal(counts.failures[0].message, "erste Zeile");
});

test("alle bestanden bei nur selbstschließenden Testcases", () => {
  const xml = `<testsuite tests="2">
    <testcase name="a" time="0.1"/>
    <testcase name="b" time="0.1"/>
  </testsuite>`;
  const counts = parseJunitXml(xml);
  assert.deepEqual(counts, { passed: 2, total: 2, failures: [] });
});

test("leere oder testlose XML ergibt 0/0", () => {
  assert.deepEqual(parseJunitXml(""), { passed: 0, total: 0, failures: [] });
  assert.deepEqual(parseJunitXml("<testsuites></testsuites>"), {
    passed: 0,
    total: 0,
    failures: [],
  });
});
