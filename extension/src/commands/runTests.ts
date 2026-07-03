// Command: pytest ausführen und Ergebnis in Sidebar + StatusBar zeigen.

import * as path from "path";
import * as vscode from "vscode";
import { computeScore } from "../grading/score";
import { runPytest } from "../grading/pytestRunner";
import { ScoreViewProvider } from "../sidebar/scoreViewProvider";
import { updateStatusBarItem } from "../statusBar";
import { state } from "../state";

export async function runTests(
  sidebar: ScoreViewProvider,
  statusBarItem: vscode.StatusBarItem
): Promise<void> {
  const taskDir = resolveTaskDir();
  if (!taskDir) {
    vscode.window.showErrorMessage(
      "Kein Praktikums-Ordner gefunden. Lade zuerst ein Praktikum " +
        "(Notebook Grader: Praktikum laden) oder öffne eine .py-Datei daraus."
    );
    return;
  }
  // Falls das Praktikum nicht über loadPraktikum kam, die Id aus dem
  // Ordnernamen ableiten (wird für submit und hint gebraucht).
  state.taskDir = taskDir;
  state.praktikumId = state.praktikumId ?? path.basename(taskDir);

  // Ungespeicherte Änderungen würden sonst nicht mitgetestet.
  await vscode.workspace.saveAll(false);

  let run;
  try {
    run = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "pytest läuft…",
      },
      () => runPytest(taskDir)
    );
  } catch (error) {
    // Fehlerausgabe für den Tipp-Command aufheben.
    state.lastTraceback = (error as Error).message;
    vscode.window.showErrorMessage((error as Error).message);
    return;
  }

  const passedCount = run.testcases.filter((t) => t.passed).length;
  const result = computeScore(passedCount, run.testcases.length);
  state.lastResult = result;
  // Bei fehlgeschlagenen Tests die pytest-Ausgabe für den Tipp merken.
  state.lastTraceback = result.passed === result.total ? "" : run.output;

  sidebar.showResult(result);
  updateStatusBarItem(statusBarItem, result);
}

// Ordner, in dem pytest laufen soll: das geladene Praktikum, sonst der
// Ordner der aktiven .py-Datei, sonst der Workspace selbst.
function resolveTaskDir(): string | undefined {
  if (state.taskDir) {
    return state.taskDir;
  }
  const activeFile = vscode.window.activeTextEditor?.document;
  if (activeFile && activeFile.fileName.endsWith(".py")) {
    return path.dirname(activeFile.fileName);
  }
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
