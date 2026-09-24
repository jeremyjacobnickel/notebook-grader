import { test } from "node:test";
import * as assert from "node:assert/strict";
import { extractTaskCode, notebookTasks, parseCells } from "../notebook";

const cell = (kind: string, tags: string[], source: string) => ({cell_type: kind, metadata: {tags}, source: [source]});
const cells = parseCells(JSON.stringify({cells: [
  cell("markdown", ["role:prompt", "task:1"], "## 1. Aufgabe: Echo"),
  cell("markdown", ["role:prompt", "task:1", "part:a"], "### a) Satzzeichen\nText"),
  cell("code", ["role:setup"], "import string"),
  cell("code", ["role:answer", "task:1", "part:a"], "def clean(s): pass"),
  cell("markdown", ["role:prompt", "task:1", "part:b"], "### b) Wortecho"),
  cell("code", ["role:answer", "task:1", "part:b"], "def echo(s): return clean(s)"),
  cell("code", ["role:answer", "task:2"], "SECRET = 'andere Aufgabe'"),
  cell("code", ["role:answer", "task:1", "part:a"], "HELPER = 1  # räumlich getrennt"),
  cell("code", ["role:answer", "task:1", "part:c"], ""),
]}));

test("Aufgaben und Teilaufgaben kommen aus den Tags", () => {
  assert.deepEqual(notebookTasks(cells).map(t => [t.id, t.title]),
    [["1a", "a) Satzzeichen"], ["1b", "b) Wortecho"], ["2", ""], ["1c", ""]]);
});

test("Tipp-Code enthält Setup und die Aufgabe bis zur gewählten Teilaufgabe", () => {
  const b = extractTaskCode(cells, "1", "b");
  assert.match(b, /import string/);
  assert.match(b, /def clean/);
  assert.match(b, /def echo/);
  assert.match(b, /HELPER/);
  assert.doesNotMatch(b, /SECRET/);
  const a = extractTaskCode(cells, "1", "a");
  assert.match(a, /HELPER/);
  assert.doesNotMatch(a, /def echo/);
  assert.doesNotMatch(extractTaskCode(cells, "2", ""), /clean|echo/);
});

test("leere Antwortzelle liefert Kontext, unbekannte Teilaufgabe einen Fehler", () => {
  assert.match(extractTaskCode(cells, "1", "c"), /def echo/);
  assert.throws(() => extractTaskCode(cells, "1", "z"));
});
