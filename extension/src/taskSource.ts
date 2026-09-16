// Praktikums-Pakete und Notebook-Codeextraktion.
//
// Das studentische Arbeitsformat ist genau ein .ipynb. Aufgabenstellung und
// Antwortzellen liegen gemeinsam im Notebook; pytest erhält vor dem Testlauf
// eine aus getaggten Codezellen erzeugte .py-Datei mit demselben Basisnamen.

import * as fs from "fs/promises";
import * as path from "path";
import { inflateRawSync } from "zlib";

export type PackageManifest = {
  version: number;
  id: string;
  notebook: string;
};

type NotebookCell = {
  cell_type?: string;
  source?: string | string[];
  metadata?: { tags?: unknown };
};

type NotebookDocument = { cells?: NotebookCell[] };

function sourceText(source: string | string[] | undefined): string {
  return Array.isArray(source) ? source.join("") : (source ?? "");
}

function tags(cell: NotebookCell): string[] {
  const value = cell.metadata?.tags;
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : [];
}

/** Liefert die eine kanonische Notebook-Datei eines importierten Praktikums. */
export async function notebookFile(folder: string): Promise<string> {
  const manifest = await readManifest(folder);
  const file = path.resolve(folder, manifest.notebook);
  const relative = path.relative(folder, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("manifest.json verweist auf ein Notebook außerhalb des Praktikumsordners.");
  }
  await fs.access(file);
  return file;
}

/** Extrahiert nur ausführbaren Studenten-/Setup-Code aus dem Notebook. */
export async function extractNotebookCode(file: string): Promise<string> {
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as NotebookDocument;
  if (!Array.isArray(raw.cells)) { throw new Error("Ungültiges Jupyter-Notebook: cells fehlt."); }

  const chunks: string[] = [];
  raw.cells.forEach((cell, index) => {
    if (cell.cell_type !== "code") { return; }
    const cellTags = tags(cell);
    if (!cellTags.includes("role:setup") && !cellTags.includes("role:answer")) { return; }
    const code = sourceText(cell.source).trimEnd();
    if (!code.trim()) { return; }
    chunks.push(`# Notebook-Zelle ${index + 1}: ${cellTags.join(", ")}\n${code}`);
  });

  if (!chunks.length) {
    throw new Error("Das Notebook enthält keine Codezellen mit role:setup oder role:answer.");
  }
  return chunks.join("\n\n") + "\n";
}

/** Schreibt die pytest-Eingabedatei direkt neben das Notebook. */
export async function materializeNotebookCode(folder: string): Promise<string> {
  const notebook = await notebookFile(folder);
  const target = notebook.replace(/\.ipynb$/i, ".py");
  await fs.writeFile(target, await extractNotebookCode(notebook), "utf8");
  return target;
}

export async function readManifest(folder: string): Promise<PackageManifest> {
  const value = JSON.parse(await fs.readFile(path.join(folder, "manifest.json"), "utf8")) as Partial<PackageManifest>;
  if (value.version !== 1) { throw new Error("Nicht unterstützte Paketversion. Erwartet wird version 1."); }
  if (!value.id || !/^[A-Za-z0-9_-]+$/.test(value.id)) { throw new Error("manifest.json enthält keine gültige id."); }
  if (!value.notebook || !value.notebook.endsWith(".ipynb")) { throw new Error("manifest.json muss eine .ipynb-Datei angeben."); }
  return value as PackageManifest;
}

/**
 * Entpackt ein kleines Praktikums-ZIP ohne zusätzliche npm-Abhängigkeit.
 * Unterstützt die üblichen ZIP-Verfahren "stored" und "deflate" und weist
 * Pfade außerhalb des Zielordners zurück.
 */
export async function extractPackage(zipPath: string, targetDir: string): Promise<void> {
  const data = await fs.readFile(zipPath);
  const eocd = findEndOfCentralDirectory(data);
  const entries = data.readUInt16LE(eocd + 10);
  let offset = data.readUInt32LE(eocd + 16);

  await fs.mkdir(targetDir, { recursive: true });
  for (let index = 0; index < entries; index++) {
    if (data.readUInt32LE(offset) !== 0x02014b50) { throw new Error("Ungültiges ZIP: Central Directory beschädigt."); }
    const method = data.readUInt16LE(offset + 10);
    const compressedSize = data.readUInt32LE(offset + 20);
    const fileNameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const localOffset = data.readUInt32LE(offset + 42);
    const name = data.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8").replace(/\\/g, "/");
    offset += 46 + fileNameLength + extraLength + commentLength;

    const destination = safeDestination(targetDir, name);
    if (name.endsWith("/")) { await fs.mkdir(destination, { recursive: true }); continue; }
    if (data.readUInt32LE(localOffset) !== 0x04034b50) { throw new Error(`Ungültiger ZIP-Eintrag: ${name}`); }
    const localNameLength = data.readUInt16LE(localOffset + 26);
    const localExtraLength = data.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = data.subarray(start, start + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : undefined;
    if (!content) { throw new Error(`ZIP-Kompressionsverfahren ${method} wird nicht unterstützt (${name}).`); }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content);
  }

  const manifest = await readManifest(targetDir);
  await notebookFile(targetDir);
  const testFiles = (await fs.readdir(targetDir)).filter(name => /^test_.*\.py$/.test(name));
  if (!testFiles.length) { throw new Error(`Praktikum ${manifest.id} enthält keine pytest-Datei (test_*.py).`); }
}

function safeDestination(root: string, name: string): string {
  if (!name || name.startsWith("/") || /^[A-Za-z]:/.test(name)) { throw new Error(`Unsicherer ZIP-Pfad: ${name}`); }
  const target = path.resolve(root, name);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) { throw new Error(`ZIP-Pfad verlässt das Zielverzeichnis: ${name}`); }
  return target;
}

function findEndOfCentralDirectory(data: Buffer): number {
  const signature = 0x06054b50;
  const minimum = Math.max(0, data.length - 65557);
  for (let offset = data.length - 22; offset >= minimum; offset--) {
    if (data.readUInt32LE(offset) === signature) { return offset; }
  }
  throw new Error("Ungültiges ZIP: End of Central Directory nicht gefunden.");
}
