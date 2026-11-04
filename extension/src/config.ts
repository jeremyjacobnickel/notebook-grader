// Liest die Extension-Einstellungen. Der courseToken darf nie geloggt werden.

import * as vscode from "vscode";

export interface GraderConfig {
  backendUrl: string;
  courseToken: string;
  pythonPath: string;
  /** HTTPS-URL des Autosave-Repos; leer = Autosave aus. */
  autosaveRepositoryUrl: string;
  autosaveIntervalMinutes: number;
}

export function getConfig(): GraderConfig {
  const config = vscode.workspace.getConfiguration("notebookGrader");
  return {
    // Ohne abschliessende Slashes, damit `${backendUrl}/submit` sauber ist.
    backendUrl: config.get<string>("backendUrl", "").trim().replace(/\/+$/, ""),
    courseToken: config.get<string>("courseToken", "").trim(),
    pythonPath: config.get<string>("pythonPath", "").trim(),
    autosaveRepositoryUrl: config.get<string>("autosave.repositoryUrl", "").trim(),
    autosaveIntervalMinutes: Math.max(1, config.get<number>("autosave.intervalMinutes", 5)),
  };
}
