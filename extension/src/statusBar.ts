// StatusBar-Item: grün bei bestanden, rot sonst.

import * as vscode from "vscode";
import { ScoreResult } from "./grading/score";

export function createStatusBarItem(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  item.name = "Notebook Grader";
  item.command = "notebookGrader.runTests";
  return item;
}

export function updateStatusBarItem(
  item: vscode.StatusBarItem,
  result: ScoreResult
): void {
  const summary = `${result.passed}/${result.total} (${result.percentage.toFixed(1)} %)`;
  if (result.isPass) {
    item.text = `$(pass) Praktikum: ${summary}`;
    item.color = new vscode.ThemeColor("testing.iconPassed");
    item.backgroundColor = undefined;
  } else {
    // Es gibt keine grüne Hintergrundfarbe für StatusBar-Items, daher
    // rot über den Fehler-Hintergrund und grün über die Textfarbe.
    item.text = `$(error) Praktikum: ${summary}`;
    item.color = undefined;
    item.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
  }
  item.tooltip = result.isPass
    ? "Bestanden — mit »Notebook Grader: Ergebnis abgeben« einreichen"
    : "Noch nicht bestanden (mindestens 80 % nötig)";
  item.show();
}
