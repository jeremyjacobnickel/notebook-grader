// Panel „Vorlesungsskript“: zeigt das ganze Skript mit pdf.js neben dem Notebook,
// springt zur Seite einer Fundstelle und hebt deren Überschrift hervor.

import { randomBytes } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { getScript, ScriptSource } from "../backend/client";
import { getConfig } from "../config";
import { ensureScript } from "./scriptCache";

type Target = { page: number; heading: string };

let panel: vscode.WebviewPanel | undefined;
let shownVersion = 0;

export async function openScript(context: vscode.ExtensionContext, source: ScriptSource): Promise<void> {
  const { backendUrl, courseToken } = getConfig();
  if (!backendUrl || !courseToken) {
    vscode.window.showErrorMessage("Backend-URL und Kurs-Token fehlen in den Einstellungen.");
    return;
  }
  if (!source.pdf_page) {
    vscode.window.showErrorMessage("Das Backend liefert keine Seitenangabe. Bitte das Backend aktualisieren.");
    return;
  }
  const directory = path.join(context.globalStorageUri.fsPath, "script");
  let file: string;
  try {
    file = await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Skript wird geladen …" },
      () => ensureScript(directory, etag => getScript(backendUrl, courseToken, etag)));
  } catch (error) {
    vscode.window.showErrorMessage(`Skript: ${(error as Error).message}`);
    return;
  }

  const target: Target = { page: source.pdf_page, heading: source.heading ?? "" };
  const version = (await fs.stat(file)).mtimeMs;
  if (panel && shownVersion === version) {
    panel.reveal(vscode.ViewColumn.Beside);
    void panel.webview.postMessage({ type: "goto", ...target });
    return;
  }
  if (!panel) {
    panel = vscode.window.createWebviewPanel("notebookGrader.script", "Vorlesungsskript", vscode.ViewColumn.Beside, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "media"),
        vscode.Uri.joinPath(context.extensionUri, "node_modules", "pdfjs-dist"),
        vscode.Uri.file(directory),
      ],
    });
    panel.onDidDispose(() => { panel = undefined; });
  }
  shownVersion = version;
  panel.webview.html = viewerHtml(panel.webview, context.extensionUri, file, version, target);
  panel.reveal(vscode.ViewColumn.Beside);
}

function viewerHtml(webview: vscode.Webview, extension: vscode.Uri, file: string, version: number, target: Target): string {
  const pdfjs = (...parts: string[]) => webview.asWebviewUri(vscode.Uri.joinPath(extension, "node_modules", "pdfjs-dist", ...parts)).toString();
  const config = {
    pdfjs: pdfjs("build", "pdf.min.mjs"),
    viewer: pdfjs("web", "pdf_viewer.mjs"),
    worker: pdfjs("build", "pdf.worker.min.mjs"),
    fonts: pdfjs("standard_fonts") + "/",
    wasm: pdfjs("wasm") + "/",
    // Version im Query-String, damit ein aktualisiertes Skript nicht aus dem Cache kommt.
    pdf: `${webview.asWebviewUri(vscode.Uri.file(file))}?v=${version}`,
    target,
  };
  const script = webview.asWebviewUri(vscode.Uri.joinPath(extension, "media", "scriptViewer.mjs"));
  const nonce = randomBytes(16).toString("hex");
  const source = webview.cspSource;
  // JSON im <script>-Block: "<" maskieren, damit kein Tag vorzeitig endet.
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${source};
      style-src ${source} 'unsafe-inline'; img-src ${source} data: blob:; font-src ${source} data:;
      connect-src ${source}; worker-src blob:;">
    <link rel="stylesheet" href="${pdfjs("web", "pdf_viewer.css")}">
    <style>
      body{margin:0;background:var(--vscode-editor-background);font-family:var(--vscode-font-family)}
      #viewerContainer{position:absolute;inset:0;overflow:auto}
      #status{position:absolute;top:12px;left:12px;color:var(--vscode-descriptionForeground)}
    </style></head><body>
    <div id="viewerContainer"><div id="viewer" class="pdfViewer"></div></div>
    <div id="status">Skript wird geladen …</div>
    <script id="config" type="application/json">${json}</script>
    <script type="module" nonce="${nonce}" src="${script}"></script>
  </body></html>`;
}
