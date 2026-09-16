// Command: Praktikums-ZIP auswählen, validieren und als Notebook-Arbeitsstand laden.

import * as path from "path";
import * as fs from "fs/promises";
import * as vscode from "vscode";
import { state } from "../state";
import { extractPackage, notebookFile, readManifest } from "../taskSource";

export async function loadPraktikum(): Promise<void> {
  if (state.busy) { return; }
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "Bitte öffne zuerst einen Ordner (Datei → Ordner öffnen), in dem deine Praktika gespeichert werden sollen."
    );
    return;
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { "Praktikums-Paket": ["zip"] },
    openLabel: "Praktikum laden",
    title: "Praktikums-ZIP auswählen",
  });
  if (!selected?.length) { return; }

  const workspaceRoot = workspaceFolder.uri.fsPath;
  const workRoot = path.join(workspaceRoot, "work");
  const stagingDir = path.join(workRoot, `.import-${Date.now()}`);

  try {
    await fs.mkdir(workRoot, { recursive: true });
    await extractPackage(selected[0].fsPath, stagingDir);
    const manifest = await readManifest(stagingDir);
    const targetDir = path.join(workRoot, manifest.id);
    const exists = await fs.stat(targetDir).then(() => true, () => false);

    if (exists) {
      await fs.rm(stagingDir, { recursive: true, force: true });
      const choice = await vscode.window.showWarningMessage(
        `Praktikum ${manifest.id} ist bereits geladen. Die vorhandene Bearbeitung wird nicht überschrieben.`,
        "Vorhandenes öffnen"
      );
      if (choice !== "Vorhandenes öffnen") { return; }
    } else {
      await fs.rename(stagingDir, targetDir);
    }

    state.praktikumId = manifest.id;
    state.taskDir = targetDir;
    state.lastResult = undefined;
    state.lastTraceback = "";
    state.lastSource = undefined;

    const notebook = await notebookFile(targetDir);
    const document = await vscode.workspace.openNotebookDocument(vscode.Uri.file(notebook));
    await vscode.window.showNotebookDocument(document);
  } catch (error) {
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => undefined);
    vscode.window.showErrorMessage(
      `Das Praktikum konnte nicht geladen werden: ${(error as Error).message}`
    );
  }
}
