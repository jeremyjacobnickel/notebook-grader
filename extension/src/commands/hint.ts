import * as vscode from "vscode";
import { postHint } from "../backend/client";
import { getConfig } from "../config";
import { activateTask, currentCode, taskDirectory } from "../currentTask";
import { ScoreViewProvider } from "../sidebar/scoreViewProvider";
import { state } from "../state";

let pending = false;
export async function hint(sidebar: ScoreViewProvider): Promise<void> {
  if (pending || state.busy) { return; }
  const folder = taskDirectory();
  if (!folder) { vscode.window.showErrorMessage("Bitte zuerst ein Praktikum laden."); return; }
  activateTask(folder);
  const { backendUrl, courseToken } = getConfig();
  if (!backendUrl || !courseToken) { vscode.window.showErrorMessage("Backend-URL und Kurs-Token fehlen in den Einstellungen."); return; }
  pending = true;
  try {
    const task = await vscode.window.showQuickPick([
      "1a – Fakultät iterativ", "1b – Fakultät rekursiv", "2a/b – Matrix und Elemente",
      "2c – Untermatrix", "2d – Laplace-Determinante", "3a – Satzzeichen entfernen",
      "3b – Wort-Echo", "3c – Satz-Echo", "4 – Insertion-Sort"
    ], {placeHolder: "Zu welcher Teilaufgabe brauchst du einen Tipp?"});
    if (!task) { return; }
    const question = await vscode.window.showInputBox({prompt: "Deine Frage (optional)",
      placeHolder: "Wo komme ich nicht weiter?", validateInput: value => value.length > 2000 ? "Bitte kürzer formulieren." : undefined});
    if (question === undefined) { return; }
    const code = await currentCode();
    if (code.length > 40000) { throw new Error("Die Datei ist für einen Tipp zu groß (maximal 40.000 Zeichen)."); }
    const text = await vscode.window.withProgress({location: vscode.ProgressLocation.Notification,
      title: "FH-LiteLLM erstellt einen Tipp …"}, () => postHint(backendUrl, courseToken, {
        praktikum: state.praktikumId!, task, question: question || "Was ist mein nächster Schritt?", code,
        traceback: state.lastSource === code ? state.lastTraceback : "Kein aktueller Testlauf zu diesem Code."
      }));
    if (folder === state.taskDir) { sidebar.showHint(text.hint, text.usage); }
  } catch (error) { vscode.window.showErrorMessage((error as Error).message); }
  finally { pending = false; }
}
