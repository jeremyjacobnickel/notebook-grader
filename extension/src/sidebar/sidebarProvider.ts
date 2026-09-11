// Sidebar (WebviewView): zeigt Praktikum, Punktestand und den letzten
// KI-Tipp. Der "Tipp holen"-Button löst den Command notebookGrader.hint aus.

import * as vscode from "vscode";
import { state } from "../state";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "notebookGrader.sidebar";

  private view?: vscode.WebviewView;

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.onDidReceiveMessage((message: { command?: string }) => {
      if (message.command === "hint") {
        void vscode.commands.executeCommand("notebookGrader.hint");
      }
    });
    view.webview.html = this.render();
  }

  // Nach jeder Zustandsänderung neu rendern (einfach und ausreichend für v1)
  refresh(): void {
    if (this.view) {
      this.view.webview.html = this.render();
    }
  }

  private render(): string {
    const nonce = makeNonce();
    const score = state.lastScore;

    const praktikumHtml = state.praktikumId
      ? `<p class="muted">Praktikum: <strong>${escapeHtml(state.praktikumId)}</strong></p>`
      : `<p class="muted">Kein Praktikum geladen.</p>`;

    const scoreHtml = score
      ? `<p class="score">${score.passed}/${score.total} Punkte (${score.percentage} %)</p>
         <p class="${score.isPass ? "pass" : "fail"}">
           ${score.isPass ? "✔ Bestanden" : "✘ Noch nicht bestanden"} (Grenze: 80 %)
         </p>`
      : `<p class="muted">Noch keine Tests ausgeführt.</p>`;

    const failuresHtml = renderFailures();

    const hintHtml = state.lastHint
      ? `<h3>Tipp</h3><p class="hint">${escapeHtml(state.lastHint)}</p>`
      : "";

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    body { font-family: var(--vscode-font-family); padding: 0 12px; }
    .score { font-size: 1.4em; margin-bottom: 0; }
    .pass { color: var(--vscode-testing-iconPassed); }
    .fail { color: var(--vscode-testing-iconFailed); }
    .muted { color: var(--vscode-descriptionForeground); }
    .hint { white-space: pre-wrap; }
    ul.failures { list-style: none; padding: 0; margin: 4px 0 0; }
    ul.failures li {
      border-left: 3px solid var(--vscode-testing-iconFailed);
      padding: 4px 8px; margin-bottom: 6px;
    }
    ul.failures .where { font-weight: bold; }
    ul.failures code {
      display: block; margin-top: 2px;
      color: var(--vscode-descriptionForeground);
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em; word-break: break-word;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; padding: 6px 14px; cursor: pointer;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <h2>Punktestand</h2>
  ${praktikumHtml}
  ${scoreHtml}
  ${failuresHtml}
  <p><button id="hintBtn">Tipp holen</button></p>
  ${hintHtml}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById("hintBtn").addEventListener("click", () => {
      vscode.postMessage({ command: "hint" });
    });
  </script>
</body>
</html>`;
  }
}

// Liste der fehlgeschlagenen Tests: wo es hakt und was pytest meldet.
// Zeigt maximal 10 Einträge, damit die Sidebar lesbar bleibt.
function renderFailures(): string {
  const failures = state.lastFailures;
  if (failures.length === 0) {
    return "";
  }
  const shown = failures.slice(0, 10);
  const items = shown
    .map((failure) => {
      const where = `${formatClassname(failure.classname)} · ${formatTestName(failure.name)}`;
      return `<li><span class="where">${escapeHtml(where)}</span>
        <code>${escapeHtml(failure.message)}</code></li>`;
    })
    .join("\n");
  const more =
    failures.length > shown.length
      ? `<p class="muted">… und ${failures.length - shown.length} weitere</p>`
      : "";
  return `<h3>Woran es hakt</h3><ul class="failures">${items}</ul>${more}`;
}

// "test_aufgabe_4" -> "Aufgabe 4"; alles andere unverändert anzeigen
function formatClassname(classname: string): string {
  const found = classname.match(/^test_aufgabe_(\d+)$/);
  return found ? `Aufgabe ${found[1]}` : classname;
}

// "test_echo_beispiel_2" -> "Funktion echo, Beispiel 2"
// "test_n"               -> "Variable n"
// alles andere unverändert anzeigen
function formatTestName(name: string): string {
  const example = name.match(/^test_(\w+)_beispiel_(\d+)$/);
  if (example) {
    return `Funktion ${example[1]}, Beispiel ${example[2]}`;
  }
  const variable = name.match(/^test_(\w+)$/);
  return variable ? `Variable ${variable[1]}` : name;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function makeNonce(): string {
  let nonce = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
