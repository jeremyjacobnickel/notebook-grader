// GitLab-Token für den Autosave: nur im SecretStorage von VS Code, nie in Einstellungen oder Logs.
//
// Prototyp: Personal Access Token mit Scope write_repository. OAuth kann später
// getGitlabToken() ersetzen, ohne dass sich der Git-Teil ändert.

import * as vscode from "vscode";

const SECRET_KEY = "notebookGrader.gitlabToken";

export function getGitlabToken(secrets: vscode.SecretStorage): Thenable<string | undefined> {
  return secrets.get(SECRET_KEY);
}

/** Fragt das Token ab und speichert es; true, wenn ein Token gespeichert wurde. */
export async function promptGitlabToken(secrets: vscode.SecretStorage): Promise<boolean> {
  const token = await vscode.window.showInputBox({
    title: "GitLab-Token für den Autosave",
    prompt: "Personal Access Token mit Scope write_repository (GitLab → Einstellungen → Access Tokens).",
    password: true,
    ignoreFocusOut: true,
    validateInput: value => /^\S{8,}$/.test(value.trim()) ? undefined : "Bitte das vollständige Token einfügen.",
  });
  if (!token) { return false; }
  await secrets.store(SECRET_KEY, token.trim());
  return true;
}

export async function clearGitlabToken(secrets: vscode.SecretStorage): Promise<void> {
  await secrets.delete(SECRET_KEY);
}
