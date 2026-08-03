// StatusBar-Item: zeigt den letzten Punktestand, grün bei bestanden,
// rot hinterlegt sonst. Klick startet die Tests erneut.

import * as vscode from "vscode";
import type { ScoreResult } from "./grading/score";

export function createStatusBar(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  item.name = "Notebook Grader";
  item.command = "notebookGrader.runTests";
  item.text = "$(beaker) Notebook Grader";
  item.tooltip = "Tests ausführen";
  item.show();
  return item;
}

export function updateStatusBar(
  item: vscode.StatusBarItem,
  score: ScoreResult
): void {
  const icon = score.isPass ? "$(pass-filled)" : "$(error)";
  item.text = `${icon} ${score.passed}/${score.total} (${score.percentage} %)`;
  if (score.isPass) {
    item.color = new vscode.ThemeColor("charts.green");
    item.backgroundColor = undefined;
  } else {
    // Es gibt keine offizielle "grüne" Hintergrundfarbe, aber eine rote —
    // deshalb: rot hinterlegt bei nicht bestanden, grüne Schrift bei bestanden.
    item.color = undefined;
    item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
  }
}
