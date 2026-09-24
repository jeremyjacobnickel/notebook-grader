import * as vscode from "vscode";
import { postHint } from "../backend/client";
import { getConfig } from "../config";
import { activateTask, taskDirectory } from "../currentTask";
import { extractCode, extractTaskCode } from "../notebook";
import { pickNotebookTask } from "./pickTask";
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
    const picked = await pickNotebookTask("Zu welcher Teilaufgabe brauchst du einen Tipp?");
    if (!picked) { return; }
    const { task, cells } = picked;
    const question = await vscode.window.showInputBox({prompt: "Deine Frage (optional)",
      placeHolder: "Wo komme ich nicht weiter?", validateInput: value => value.length > 2000 ? "Bitte kürzer formulieren." : undefined});
    if (question === undefined) { return; }
    // Nur die gewählte Aufgabe verlässt den Rechner, nicht das ganze Notebook.
    const code = extractTaskCode(cells, task.task, task.part);
    if (code.length > 40000) { throw new Error("Der Code dieser Aufgabe ist für einen Tipp zu groß (maximal 40.000 Zeichen)."); }
    const fullCode = extractCode(cells);
    const text = await vscode.window.withProgress({location: vscode.ProgressLocation.Notification,
      title: "FH-LiteLLM erstellt einen Tipp …"}, () => postHint(backendUrl, courseToken, {
        praktikum: state.praktikumId!, task: task.task, part: task.part,
        question: question || "Was ist mein nächster Schritt?", code,
        traceback: state.lastSource === fullCode ? state.lastTraceback : "Kein aktueller Testlauf zu diesem Code."
      }));
    if (folder === state.taskDir) { sidebar.showHint(text.hint, text.usage); }
  } catch (error) { vscode.window.showErrorMessage((error as Error).message); }
  finally { pending = false; }
}
