import * as vscode from "vscode";
import { activateTask, currentCode, taskDirectory } from "../currentTask";
import { getConfig } from "../config";
import { computeScore } from "../grading/score";
import { runPytest } from "../grading/pytestRunner";
import { output } from "../output";
import { ScoreViewProvider } from "../sidebar/scoreViewProvider";
import { updateStatusBarItem } from "../statusBar";
import { state } from "../state";
import { materializeNotebookCode } from "../taskSource";

export async function runTests(sidebar: ScoreViewProvider, statusBar: vscode.StatusBarItem, subtask?: string): Promise<void> {
  if (state.busy) { return; }
  const folder = taskDirectory();
  if (!folder) {
    vscode.window.showErrorMessage("Bitte zuerst ein Praktikum laden oder sein Notebook öffnen.");
    return;
  }
  activateTask(folder);
  state.busy = true;
  state.lastResult = undefined;
  state.lastSource = undefined;
  state.lastTraceback = "";
  statusBar.hide();
  sidebar.reset("Tests laufen …");
  let source: string | undefined;
  try {
    if (!await vscode.workspace.saveAll(false)) { throw new Error("Bitte Änderungen speichern und erneut testen."); }
    source = await currentCode();
    await materializeNotebookCode(folder);
    const run = await vscode.window.withProgress({location: vscode.ProgressLocation.Notification,
      title: "Praktikum wird getestet", cancellable: true}, (_, token) =>
      runPytest(folder, getConfig().pythonPath, token, subtask));
    output.clear();
    output.append(run.output);
    if (source !== await currentCode()) { throw new Error("Code während des Testlaufs geändert. Bitte erneut testen."); }
    const result = computeScore(run.testcases.filter(t => t.passed).length, run.testcases.length);
    state.lastResult = subtask ? undefined : result;
    state.lastSource = source;
    state.lastTraceback = result.passed === result.total ? "" : run.output.slice(-16000);
    sidebar.showResult(result, run.testcases, subtask);
    if (!subtask) { updateStatusBarItem(statusBar, result); }
  } catch (error) {
    state.lastTraceback = (error as Error).message.slice(-16000);
    if (source !== undefined && source === await currentCode().catch(() => undefined)) {
      state.lastSource = source;
    }
    output.clear(); output.append(state.lastTraceback);
    sidebar.reset("Testlauf nicht abgeschlossen. Testdetails öffnen.");
    vscode.window.showErrorMessage((error as Error).message);
  } finally { state.busy = false; }
}
