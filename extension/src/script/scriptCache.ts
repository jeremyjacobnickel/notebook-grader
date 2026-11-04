// Lokale Kopie des Vorlesungsskripts: einmal vom Backend laden, danach nur bei Änderung.
//
// Das Skript kommt vom Backend, damit die Seitenzahlen der Tipps genau zur
// indexierten Datei passen. Ohne Verbindung wird die vorhandene Kopie genutzt.

import * as fs from "fs/promises";
import * as path from "path";
import { ScriptDownload } from "../backend/client";

export type ScriptFetcher = (etag?: string) => Promise<ScriptDownload>;

export async function ensureScript(directory: string, fetchScript: ScriptFetcher): Promise<string> {
  const file = path.join(directory, "skript.pdf");
  const etagFile = path.join(directory, "skript.etag");
  const cached = await fs.stat(file).then(() => true, () => false);
  const etag = cached ? await fs.readFile(etagFile, "utf8").catch(() => undefined) : undefined;

  let download: ScriptDownload;
  try {
    download = await fetchScript(etag);
  } catch (error) {
    if (cached) { return file; }
    throw error;
  }
  if (download.unchanged) { return file; }

  // Erst vollständig schreiben, dann ersetzen: ein abgebrochener Download hinterlässt keine kaputte Kopie.
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(`${file}.part`, download.bytes);
  await fs.rename(`${file}.part`, file);
  await fs.writeFile(etagFile, download.etag, "utf8");
  return file;
}
