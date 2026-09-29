// Praktikums-Pakete: Manifest und ZIP-Import.
//
// Das studentische Arbeitsformat ist genau ein .ipynb. Die Tests des Pakets lesen
// es über die mitgelieferte conftest.py direkt; es wird keine .py erzeugt.

import * as fs from "fs/promises";
import * as path from "path";
import { inflateRawSync } from "zlib";

export type PackageManifest = {
  version: number;
  id: string;
  notebook: string;
};

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
