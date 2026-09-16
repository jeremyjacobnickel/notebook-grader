// Einstiegspunkt: registriert die Commands, die Sidebar und das StatusBar-Item.

import * as vscode from "vscode";
import { subtasks } from "./grading/feedback";
import { hint } from "./commands/hint";
import { loadPraktikum } from "./commands/loadPraktikum";
import { runTests } from "./commands/runTests";
import { submit } from "./commands/submit";
import { ScoreViewProvider } from "./sidebar/scoreViewProvider";
import { createStatusBarItem } from "./statusBar";
import * as path from "path";
import { taskDirectory } from "./currentTask";
import { notebookFile } from "./taskSource";
import { state } from "./state";
import { output } from "./output";

export function activate(context: vscode.ExtensionContext): void {
  const sidebar = new ScoreViewProvider();
  const statusBarItem = createStatusBarItem();

  const markChanged = (): void => {
    state.lastResult = undefined; state.lastSource = undefined; state.lastTraceback = "";
    sidebar.reset("Code geändert – bitte erneut testen."); statusBarItem.hide();
  };

  context.subscriptions.push(
    statusBarItem, output,
    vscode.window.registerWebviewViewProvider(
      ScoreViewProvider.viewId,
      sidebar
    ),
    vscode.commands.registerCommand(
      "notebookGrader.loadPraktikum",
      async () => {
        if (state.busy) { return; }
        await loadPraktikum();
        sidebar.reset(); statusBarItem.hide();
      }
    ),
    vscode.commands.registerCommand("notebookGrader.runTests", () =>
      runTests(sidebar, statusBarItem)
    ),
    vscode.commands.registerCommand("notebookGrader.testSubtask", async () => {
      if (state.busy) { return; }
      const folder = taskDirectory();
      if (!folder || path.basename(folder) !== "5_praktikum") {
        vscode.window.showInformationMessage("Einzelprüfung ist derzeit für Praktikum 5 verfügbar."); return;
      }
      const task = await vscode.window.showQuickPick(subtasks, {placeHolder: "Welche Teilaufgabe möchtest du prüfen?"});
      if (task) { await runTests(sidebar, statusBarItem, task); }
    }),
    vscode.commands.registerCommand("notebookGrader.submit", submit),
    vscode.commands.registerCommand("notebookGrader.showOutput", () => output.show()),
    vscode.commands.registerCommand("notebookGrader.showAssignment", async () => {
      const folder = taskDirectory();
      if (!folder) { vscode.window.showErrorMessage("Bitte zuerst ein Praktikum laden."); return; }
      try {
        const document = await vscode.workspace.openNotebookDocument(vscode.Uri.file(await notebookFile(folder)));
        await vscode.window.showNotebookDocument(document);
      } catch { vscode.window.showErrorMessage("Kein Aufgaben-Notebook gefunden."); }
    }),
    vscode.workspace.onDidChangeNotebookDocument(event => {
      if (state.taskDir && event.notebook.uri.fsPath.startsWith(state.taskDir + path.sep) && !state.busy) {
        markChanged();
      }
    }),
    // Textdateien im Paket (z. B. Tests) sind keine studentische Arbeitsoberfläche.
    // Die generierte .py wird während state.busy geschrieben und löst daher kein Reset aus.
    vscode.commands.registerCommand("notebookGrader.hint", () =>
      hint(sidebar)
    )
  );
}

export function deactivate(): void {}
