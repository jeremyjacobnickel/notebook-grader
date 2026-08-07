// Gemeinsamer Zustand der Extension — bewusst ein einfaches Objekt,
// kein Framework. Lebt so lange wie das Extension-Host-Fenster.

import * as path from "node:path";
import type { ScoreResult } from "./grading/score";
import type { FailedTest } from "./grading/junit";

export const state = {
  praktikumId: undefined as string | undefined,
  taskDir: undefined as string | undefined,
  lastScore: undefined as ScoreResult | undefined,
  // Welche Tests zuletzt fehlgeschlagen sind — für die Sidebar
  lastFailures: [] as FailedTest[],
  // Letzte pytest-Fehlerausgabe — geht mit an /hint
  lastTraceback: "",
  lastHint: "",
};

// Praktikums-Name für die Backend-Requests. Fallback: Ordnername.
export function currentPraktikumId(): string | undefined {
  if (state.praktikumId) {
    return state.praktikumId;
  }
  if (state.taskDir) {
    return path.basename(state.taskDir);
  }
  return undefined;
}
