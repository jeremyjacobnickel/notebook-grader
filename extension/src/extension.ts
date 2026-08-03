// Einstiegspunkt: registriert die Commands, die Sidebar und die StatusBar.

import * as vscode from "vscode";
import { loadPraktikum } from "./commands/loadPraktikum";
import { runTests } from "./commands/runTests";
import { submit } from "./commands/submit";
import { hint } from "./commands/hint";
import { SidebarProvider } from "./sidebar/sidebarProvider";
import { createStatusBar } from "./statusBar";

export function activate(context: vscode.ExtensionContext): void {
  const sidebar = new SidebarProvider();
  const statusBar = createStatusBar();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewId, sidebar),
    statusBar,
    vscode.commands.registerCommand("notebookGrader.loadPraktikum", () =>
      loadPraktikum(sidebar)
    ),
    vscode.commands.registerCommand("notebookGrader.runTests", () =>
      runTests(statusBar, sidebar)
    ),
    vscode.commands.registerCommand("notebookGrader.submit", () => submit()),
    vscode.commands.registerCommand("notebookGrader.hint", () => hint(sidebar))
  );
}

export function deactivate(): void {
  // nichts aufzuräumen — alles hängt an context.subscriptions
}
