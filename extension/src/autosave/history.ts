// Autosave-Verlauf aus `git log` lesen und für die Anzeige beschriften.
//
// Grundlage sind die Trailer aus messages.ts; Merge-Commits und fremde Commits
// (z. B. die README, die GitLab beim Anlegen erzeugt) tragen keine und fallen weg.

import { SnapshotReason } from "./messages";

export type SnapshotEntry = {
  sha: string;
  date: Date;
  subject: string;
  praktikumId: string;
  reason: SnapshotReason | "";
  tests: string;
  subtask: string;
  /** Bei Wiederherstellungen: Commit, dessen Stand übernommen wurde. */
  restoredFrom: string;
  tags: string[];
  /** false = nur lokal, noch nicht auf GitLab. */
  pushed: boolean;
};

const FIELD = "%x1f";
const RECORD = "%x1e";
const trailer = (key: string) => `%(trailers:key=${key},valueonly)`;

/** Format für `git log --format=...`, passend zu parseHistory(). */
export const HISTORY_FORMAT = ["%H", "%cI", "%s", trailer("Praktikum"), trailer("Anlass"), trailer("Tests"),
  trailer("Teilaufgabe"), trailer("Wiederhergestellt"), "%D"].join(FIELD) + RECORD;

export function parseHistory(output: string, unpushed: Set<string>): SnapshotEntry[] {
  return output.split("\x1e").map(record => record.replace(/^\n/, "")).filter(record => record.trim()).map(record => {
    const [sha, date, subject, praktikumId, reason, tests, subtask, restoredFrom, refs] = record.split("\x1f").map(field => field.trim());
    return {
      sha,
      date: new Date(date),
      subject,
      praktikumId,
      reason: reason as SnapshotEntry["reason"],
      tests,
      subtask,
      restoredFrom,
      tags: (refs ?? "").split(",").map(ref => ref.trim()).filter(ref => ref.startsWith("tag: ")).map(ref => ref.slice(5)),
      pushed: !unpushed.has(sha),
    };
  });
}

const REASON_LABELS: Record<string, string> = {
  load: "Ausgangsstand",
  interval: "Autosave",
  manual: "Manuell gesichert",
  tests: "Testlauf",
  submit: "Abgabe",
  restore: "Wiederhergestellt",
};

/** Zeile im Verlauf: Uhrzeit als Label, Anlass und Ergebnis als Beschreibung. */
export function describeEntry(entry: SnapshotEntry, now: Date): { label: string; description: string } {
  const time = entry.date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const sameDay = entry.date.toDateString() === now.toDateString();
  const label = sameDay ? time : `${entry.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} ${time}`;
  const reason = entry.reason === "tests" && entry.subtask
    ? `Teilaufgabe ${entry.subtask}` : REASON_LABELS[entry.reason] ?? entry.subject;
  const parts = [reason, entry.tests, entry.pushed ? "" : "nur lokal"].filter(Boolean);
  return { label, description: parts.join(" · ") };
}
