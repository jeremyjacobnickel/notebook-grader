// Liest die Extension-Einstellungen.
// Wichtig: der courseToken darf nirgends geloggt werden.

import * as vscode from "vscode";

export interface BackendConfig {
  backendUrl: string;
  courseToken: string;
}

// undefined, wenn backendUrl oder courseToken fehlen — der Aufrufer
// zeigt dann eine Meldung mit Hinweis auf die Einstellungen.
export function getBackendConfig(): BackendConfig | undefined {
  const cfg = vscode.workspace.getConfiguration("notebookGrader");
  const backendUrl = (cfg.get<string>("backendUrl") ?? "")
    .trim()
    .replace(/\/+$/, ""); // trailing Slash entfernen, Routen hängen "/submit" an
  const courseToken = (cfg.get<string>("courseToken") ?? "").trim();
  if (!backendUrl || !courseToken) {
    return undefined;
  }
  return { backendUrl, courseToken };
}

export function getTasksSource(): string {
  const cfg = vscode.workspace.getConfiguration("notebookGrader");
  return (cfg.get<string>("tasksSource") ?? "").trim();
}
