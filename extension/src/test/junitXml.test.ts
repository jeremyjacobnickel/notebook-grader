// Unit-Tests für das JUnit-XML-Parsen (läuft mit `node --test`).

import * as assert from "node:assert/strict";
import { test } from "node:test";
import { parseJunitXml } from "../grading/junitXml";

// Verkürzte, aber strukturell echte pytest-JUnit-Ausgabe.
const sampleXml = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" errors="1" failures="1" skipped="1" tests="5">
    <testcase classname="test_1_praktikum" name="test_add" time="0.001" />
    <testcase classname="test_1_praktikum" name="test_is_even" time="0.001">
    </testcase>
    <testcase classname="test_1_praktikum" name="test_fails" time="0.001">
      <failure message="assert 3 == 4">def test_fails(): ...</failure>
    </testcase>
    <testcase classname="test_1_praktikum" name="test_errors" time="0.001">
      <error message="RuntimeError">kaputt</error>
    </testcase>
    <testcase classname="test_1_praktikum" name="test_skipped" time="0.0">
      <skipped message="nicht relevant" />
    </testcase>
  </testsuite>
</testsuites>`;

test("liest alle Testcases mit Namen", () => {
  const cases = parseJunitXml(sampleXml);
  assert.deepEqual(
    cases.map((c) => c.name),
    ["test_add", "test_is_even", "test_fails", "test_errors", "test_skipped"]
  );
});

test("failure, error und skipped zählen als nicht bestanden", () => {
  const cases = parseJunitXml(sampleXml);
  const byName = new Map(cases.map((c) => [c.name, c.passed]));
  assert.equal(byName.get("test_add"), true);
  assert.equal(byName.get("test_is_even"), true);
  assert.equal(byName.get("test_fails"), false);
  assert.equal(byName.get("test_errors"), false);
  assert.equal(byName.get("test_skipped"), false);
});

test("leeres oder testloses XML ergibt eine leere Liste", () => {
  assert.deepEqual(parseJunitXml(""), []);
  assert.deepEqual(
    parseJunitXml(`<testsuites><testsuite tests="0"/></testsuites>`),
    []
  );
});

test("XML-Entities im Testnamen werden dekodiert", () => {
  const xml = `<testsuite>
    <testcase name="test_compare[a &lt; b &amp; c]" />
  </testsuite>`;
  assert.equal(parseJunitXml(xml)[0].name, "test_compare[a < b & c]");
});
