// Quelle der Praktikums-Aufgaben. Aktuell ein lokaler Ordner —
// diese beiden Funktionen sind die Naht, hinter die später ein
// Backend-Endpoint (Download vom FH-Server) passt, ohne dass sich
// der loadPraktikum-Command ändern muss.

import * as fs from "fs/promises";
import * as path from "path";

/** Listet die verfügbaren Praktikums-Ids (Unterordner der Quelle). */
export async function listTaskIds(sourceDir: string): Promise<string[]> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Kopiert die Aufgabe <id> aus der Quelle in den Zielordner. */
export async function copyTask(
  sourceDir: string,
  id: string,
  targetDir: string
): Promise<void> {
  await fs.cp(path.join(sourceDir, id), targetDir, {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
}
