import { TestCaseResult } from "./junitXml";

export function feedback(test: TestCaseResult): string {
  if (test.passed) { return "Bestanden"; }
  const text = test.detail || "";
  const tagged = text.match(/(?:MISSING|OPEN|EXECUTION): ([^\n]+)/);
  if (tagged) { return tagged[1]; }
  if (/NotImplementedError/.test(text)) { return "Noch offen: Die Implementierung fehlt."; }
  const missing = text.match(/(?:KeyError|NameError): ['"]?([\w]+)/);
  if (missing) { return `Der benötigte Name ${missing[1]} fehlt. Prüfe die Schreibweise und Definition.`; }
  if (/DID NOT RAISE/.test(text)) { return "Die erwartete Fehlerbehandlung fehlt: Prüfe ungültige Eingaben."; }
  if (/AssertionError|assert |Not equal|Not equal to tolerance/.test(text)) {
    const message = text.match(/AssertionError: ([^\n]+)/);
    return message ? `Anforderung nicht erfüllt: ${message[1]}` : "Das Ergebnis entspricht nicht der Erwartung. Öffne die Details für den Vergleich.";
  }
  const exception = text.match(/\b(SyntaxError|IndentationError|TypeError|ValueError|IndexError|RecursionError|ZeroDivisionError|ModuleNotFoundError):?([^\n]*)/);
  if (exception) { return `Ausführungsfehler (${exception[1]}):${exception[2]}`; }
  if (test.kind === "skipped") { return "Nicht geprüft (übersprungen)."; }
  return "Prüfung fehlgeschlagen. Öffne die Details für die Ursache.";
}

export function isOpen(test: TestCaseResult): boolean {
  return !test.passed && /\b(?:OPEN|MISSING):|NotImplementedError/.test(test.detail || "");
}

export const subtasks = ["1a", "1b", "2a", "2b", "2c", "2d", "3a", "3b", "3c", "4"];
export function subtaskSummary(cases: TestCaseResult[]): string[] {
  return subtasks.map(task => {
    const checks = cases.filter(c => c.name.startsWith(`test_${task}_`));
    if (!checks.length) { return `${task}: noch nicht geprüft`; }
    const passed = checks.filter(c => c.passed).length;
    const open = checks.filter(isOpen).length;
    const status = passed === checks.length ? "bestanden" : open === checks.length ? "offen" : "in Bearbeitung";
    return `${task}: ${status} · ${passed}/${checks.length} Prüfungen bestanden${open ? ` · ${open} offen` : ""}`;
  });
}
