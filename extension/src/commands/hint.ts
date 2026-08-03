// Holt einen sokratischen KI-Tipp vom Backend (POST /hint).
// Mitgeschickt werden: aktueller Code und die letzte pytest-Fehlerausgabe.

import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getBackendConfig } from "../config";
import { requestHint } from "../backend/client";
import { state, currentPraktikumId } from "../state";
import type { SidebarProvider } from "../sidebar/sidebarProvider";

export async function hint(sidebar: SidebarProvider): Promise<void> {
  const praktikum = currentPraktikumId();
  if (!praktikum) {
    void vscode.window.showErrorMessage(
      "Notebook Grader: Kein Praktikum geladen — bitte zuerst eines laden."
    );
    return;
  }

  const config = getBackendConfig();
  if (!config) {
    void vscode.window.showErrorMessage(
      "Notebook Grader: backendUrl und courseToken in den Einstellungen setzen (notebookGrader.*)."
    );
    return;
  }

  const code = await readCurrentCode(praktikum);
  if (code === undefined) {
    void vscode.window.showErrorMessage(
      `Notebook Grader: Keine Python-Datei gefunden — bitte ${praktikum}.py öffnen.`
    );
    return;
  }

  try {
    const hintText = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Notebook Grader: Tipp wird geholt …",
      },
      () => requestHint(config, praktikum, code, state.lastTraceback)
    );
    state.lastHint = hintText;
    sidebar.refresh();
    // Sidebar in den Vordergrund holen, damit der Tipp sichtbar ist
    void vscode.commands.executeCommand("notebookGrader.sidebar.focus");
  } catch {
    void vscode.window.showErrorMessage(
      "Notebook Grader: Das Backend ist gerade nicht erreichbar. Bitte später erneut versuchen."
    );
  }
}

// Inhalt der aktuellen .py-Datei: bevorzugt der aktive Editor,
// sonst die Aufgaben-Datei <id>.py aus dem Task-Ordner.
async function readCurrentCode(praktikum: string): Promise<string | undefined> {
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.fileName.endsWith(".py")) {
    return editor.document.getText();
  }
  if (state.taskDir) {
    try {
      return await fs.readFile(
        path.join(state.taskDir, `${praktikum}.py`),
        "utf8"
      );
    } catch {
      return undefined;
    }
  }
  return undefined;
}
