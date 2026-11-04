// Commit-Nachrichten und Abgabe-Tags des Autosave-Verlaufs.
//
// Die Trailer (Praktikum, Tests, Teilaufgabe) sind maschinenlesbar, damit ein
// späteres Admin-Panel den Verlauf auswerten kann.

export type SnapshotReason = "load" | "interval" | "manual" | "tests" | "submit" | "restore";

export type SnapshotEvent = {
  reason: SnapshotReason;
  praktikumId: string;
  /** Teilaufgabe bei Einzelprüfung, z. B. "2c". */
  subtask?: string;
  tests?: { passed: number; total: number };
  /** Commit, dessen Stand wiederhergestellt wurde. */
  restoredFrom?: string;
};

/** Testläufe, Abgaben und Wiederherstellungen sind selbst eine Information, auch ohne Codeänderung. */
export function allowsEmptyCommit(reason: SnapshotReason): boolean {
  return reason === "tests" || reason === "submit" || reason === "restore";
}

export function commitMessage(event: SnapshotEvent): string {
  const id = event.praktikumId;
  const score = event.tests ? `${event.tests.passed}/${event.tests.total}` : "";
  const subject = {
    load: `Ausgangsstand ${id}`,
    interval: `Autosave ${id}`,
    manual: `Manuell gesichert ${id}`,
    tests: event.subtask ? `Teilaufgabe ${event.subtask} geprüft (${id}): ${score}` : `Testlauf ${id}: ${score}`,
    submit: `Abgabe ${id}: ${score}`,
    restore: `Stand ${(event.restoredFrom ?? "").slice(0, 8)} wiederhergestellt (${id})`,
  }[event.reason];
  const trailers = [`Praktikum: ${id}`, `Anlass: ${event.reason}`];
  if (event.tests) { trailers.push(`Tests: ${score}`); }
  if (event.subtask) { trailers.push(`Teilaufgabe: ${event.subtask}`); }
  if (event.restoredFrom) { trailers.push(`Wiederhergestellt: ${event.restoredFrom}`); }
  return `${subject}\n\n${trailers.join("\n")}\n`;
}

/** Tag für eine Abgabe, z. B. abgabe/4_praktikum/20261104-143205 (UTC). */
export function submissionTag(praktikumId: string, date: Date): string {
  const stamp = date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `abgabe/${praktikumId}/${stamp}`;
}
