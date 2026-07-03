// Command: sokratischen KI-Tipp vom Backend holen (Button in der Sidebar).

import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { postHint } from "../backend/client";
import { getConfig } from "../config";
import { ScoreViewProvider } from "../sidebar/scoreViewProvider";
import { state } from "../state";

export async function hint(sidebar: ScoreViewProvider): Promise<void> {
  if (!state.praktikumId) {
    vscode.window.showErrorMessage(
      "Kein Praktikum aktiv. Lade zuerst ein Praktikum und führe die Tests aus."
    );
    return;
  }
  const { backendUrl, courseToken } = getConfig();
  if (!backendUrl || !courseToken) {
    vscode.window.showErrorMessage(
      "Backend ist nicht konfiguriert. Bitte notebookGrader.backendUrl " +
        "und notebookGrader.courseToken in den Einstellungen setzen."
    );
    return;
  }

  const code = await readCurrentCode();
  if (code === undefined) {
    vscode.window.showErrorMessage(
      "Keine Python-Datei gefunden. Öffne deine Praktikums-Datei " +
        "und versuche es erneut."
    );
    return;
  }

  let hintText: string;
  try {
    hintText = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "Hole Tipp…",
      },
      () =>
        postHint(backendUrl, courseToken, {
          praktikum: state.praktikumId as string,
          code,
          traceback: state.lastTraceback,
        })
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Tipp holen fehlgeschlagen: ${(error as Error).message}`
    );
    return;
  }

  sidebar.showHint(hintText);
}

// Inhalt der aktiven .py-Datei; wenn keine offen ist, die
// Hauptdatei <id>.py des geladenen Praktikums.
async function readCurrentCode(): Promise<string | undefined> {
  const activeFile = vscode.window.activeTextEditor?.document;
  if (activeFile && activeFile.fileName.endsWith(".py")) {
    return activeFile.getText();
  }
  if (state.taskDir && state.praktikumId) {
    try {
      return await fs.readFile(
        path.join(state.taskDir, `${state.praktikumId}.py`),
        "utf8"
      );
    } catch {
      return undefined;
    }
  }
  return undefined;
}
