// Liest die Extension-Einstellungen. Der courseToken darf nie geloggt werden.

import * as vscode from "vscode";

export interface GraderConfig {
  backendUrl: string;
  courseToken: string;
  tasksSource: string;
}

export function getConfig(): GraderConfig {
  const config = vscode.workspace.getConfiguration("notebookGrader");
  return {
    // Ohne abschliessende Slashes, damit `${backendUrl}/submit` sauber ist.
    backendUrl: config.get<string>("backendUrl", "").trim().replace(/\/+$/, ""),
    courseToken: config.get<string>("courseToken", "").trim(),
    tasksSource: config.get<string>("tasksSource", "").trim(),
  };
}
