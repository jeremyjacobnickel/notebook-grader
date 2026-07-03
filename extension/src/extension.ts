// Einstiegspunkt: registriert die Commands, die Sidebar und das StatusBar-Item.

import * as vscode from "vscode";
import { hint } from "./commands/hint";
import { loadPraktikum } from "./commands/loadPraktikum";
import { runTests } from "./commands/runTests";
import { submit } from "./commands/submit";
import { ScoreViewProvider } from "./sidebar/scoreViewProvider";
import { createStatusBarItem } from "./statusBar";

export function activate(context: vscode.ExtensionContext): void {
  const sidebar = new ScoreViewProvider();
  const statusBarItem = createStatusBarItem();

  context.subscriptions.push(
    statusBarItem,
    vscode.window.registerWebviewViewProvider(
      ScoreViewProvider.viewId,
      sidebar
    ),
    vscode.commands.registerCommand(
      "notebookGrader.loadPraktikum",
      loadPraktikum
    ),
    vscode.commands.registerCommand("notebookGrader.runTests", () =>
      runTests(sidebar, statusBarItem)
    ),
    vscode.commands.registerCommand("notebookGrader.submit", submit),
    // hint steht nicht in der Command-Palette (package.json), sondern
    // wird vom Tipp-Button in der Sidebar ausgelöst.
    vscode.commands.registerCommand("notebookGrader.hint", () =>
      hint(sidebar)
    )
  );
}

export function deactivate(): void {}
