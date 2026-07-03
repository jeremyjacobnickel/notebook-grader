// Sidebar-Ansicht: zeigt den Punktestand und einen Tipp-Button.

import * as vscode from "vscode";
import { ScoreResult } from "../grading/score";

export class ScoreViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "notebookGrader.scoreView";

  private view: vscode.WebviewView | undefined;
  private result: ScoreResult | undefined;
  private hint = "";

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.onDidReceiveMessage((message: { command?: string }) => {
      if (message.command === "hint") {
        vscode.commands.executeCommand("notebookGrader.hint");
      }
    });
    this.render();
  }

  /** Zeigt ein neues Testergebnis an (verwirft einen alten Tipp). */
  showResult(result: ScoreResult): void {
    this.result = result;
    this.hint = "";
    this.render();
  }

  /** Zeigt den vom Backend geholten Tipp unter dem Punktestand an. */
  showHint(hint: string): void {
    this.hint = hint;
    this.render();
    this.view?.show?.(true);
  }

  private render(): void {
    if (this.view) {
      this.view.webview.html = this.buildHtml();
    }
  }

  private buildHtml(): string {
    let scoreHtml: string;
    if (this.result === undefined) {
      scoreHtml = `<p>Noch kein Testlauf. Führe <strong>Notebook Grader:
        Tests ausführen</strong> aus, um deinen Punktestand zu sehen.</p>`;
    } else {
      const r = this.result;
      const statusClass = r.isPass ? "pass" : "fail";
      const statusText = r.isPass ? "Bestanden" : "Noch nicht bestanden";
      scoreHtml = `
        <p class="score">${r.passed} / ${r.total} Tests
          (${r.percentage.toFixed(1)} %)</p>
        <p class="status ${statusClass}">${statusText}</p>`;
    }
    const hintHtml = this.hint
      ? `<div class="hint">${escapeHtml(this.hint)}</div>`
      : "";
    return `<!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
      </head>
      <body>
        <style>
          body { font-family: var(--vscode-font-family); padding: 0 8px; }
          .score { font-size: 1.3em; margin-bottom: 2px; }
          .status { font-weight: bold; }
          .pass { color: var(--vscode-testing-iconPassed); }
          .fail { color: var(--vscode-testing-iconFailed); }
          .hint {
            margin-top: 10px; padding: 8px; white-space: pre-wrap;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
          }
          button {
            margin-top: 10px; padding: 4px 12px; border: none; cursor: pointer;
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-background);
          }
          button:hover { background: var(--vscode-button-hoverBackground); }
        </style>
        ${scoreHtml}
        <button id="hint-button">Tipp holen</button>
        ${hintHtml}
        <script>
          const vscodeApi = acquireVsCodeApi();
          document.getElementById("hint-button").addEventListener("click",
            () => vscodeApi.postMessage({ command: "hint" }));
        </script>
      </body>
      </html>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
