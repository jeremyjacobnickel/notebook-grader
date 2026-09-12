// Gemeinsamer Sitzungszustand der Commands (ein Extension-Host, ein Objekt).

import { ScoreResult } from "./grading/score";

export interface SessionState {
  /** Id des geladenen Praktikums, z. B. "1_praktikum". */
  praktikumId: string | undefined;
  /** Ordner, in dem pytest läuft. */
  taskDir: string | undefined;
  /** Ergebnis des letzten Testlaufs. */
  lastResult: ScoreResult | undefined;
  /** pytest-Ausgabe des letzten fehlgeschlagenen Laufs (für den Tipp). */
  lastTraceback: string;
  lastSource: string | undefined;
  busy: boolean;
}

export const state: SessionState = {
  praktikumId: undefined,
  taskDir: undefined,
  lastResult: undefined,
  lastTraceback: "",
  lastSource: undefined,
  busy: false,
};
