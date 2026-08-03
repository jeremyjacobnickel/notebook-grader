// Führt pytest im Task-Ordner aus, berechnet den Punktestand und
// aktualisiert Sidebar + StatusBar.

import * as vscode from "vscode";
import { runPytest } from "../grading/runner";
import { parseJunitXml } from "../grading/junit";
import { computeScore } from "../grading/score";
import { state } from "../state";
import { updateStatusBar } from "../statusBar";
import type { SidebarProvider } from "../sidebar/sidebarProvider";

export async function runTests(
  statusBar: vscode.StatusBarItem,
  sidebar: SidebarProvider
): Promise<void> {
  const cwd = state.taskDir ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!cwd) {
    void vscode.window.showErrorMessage(
      "Notebook Grader: Kein Task- oder Workspace-Ordner gefunden. Erst ein Praktikum laden."
    );
    return;
  }

  // Ungespeicherte Änderungen sichern, sonst testet pytest den alten Stand
  await vscode.workspace.saveAll(false);

  let run;
  try {
    run = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Notebook Grader: Tests laufen …",
      },
      () => runPytest(cwd)
    );
  } catch {
    // spawn-Fehler: python selbst wurde nicht gefunden
    void vscode.window.showErrorMessage(
      "Notebook Grader: `python` wurde nicht gefunden. Bitte Python installieren und in PATH aufnehmen."
    );
    return;
  }

  if (run.junitXml === null) {
    // pytest kam nicht bis zur XML (z. B. pytest fehlt oder Import-Fehler).
    // Ausgabe merken, damit der KI-Tipp etwas zum Arbeiten hat.
    state.lastTraceback = run.output;
    void vscode.window.showErrorMessage(
      "Notebook Grader: pytest konnte nicht ausgeführt werden. " +
        "Ist pytest installiert (pip install pytest)? Details im Tipp oder Terminal."
    );
    return;
  }

  const counts = parseJunitXml(run.junitXml);
  const score = computeScore(counts.passed, counts.total);
  state.lastScore = score;
  // Bei komplett grünem Lauf gibt es keinen Fehler zu erklären
  state.lastTraceback = run.exitCode === 0 ? "" : run.output;

  if (counts.total === 0) {
    void vscode.window.showWarningMessage(
      "Notebook Grader: Keine Tests gefunden (test_*.py vorhanden?)."
    );
  }

  updateStatusBar(statusBar, score);
  sidebar.refresh();
}
