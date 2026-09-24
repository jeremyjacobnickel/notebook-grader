// Auswahl einer Aufgabe/Teilaufgabe anhand der Tags des aktuellen Notebooks.

import * as vscode from "vscode";
import { currentCells } from "../currentTask";
import { Cell, NotebookTask, notebookTasks } from "../notebook";

export async function pickNotebookTask(placeHolder: string): Promise<{ task: NotebookTask; cells: Cell[] } | undefined> {
  const cells = await currentCells();
  const tasks = notebookTasks(cells);
  if (!tasks.length) { throw new Error("Das Notebook enthält keine Antwortzellen mit task:-Tag."); }
  const picked = await vscode.window.showQuickPick(
    tasks.map(task => ({ label: task.id, description: task.title, task })), { placeHolder });
  return picked && { task: picked.task, cells };
}
