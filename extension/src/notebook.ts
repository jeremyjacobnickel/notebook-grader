// Getaggte Notebook-Zellen lesen (Vertrag aus WORKFLOW.md).
//
// Gegenstück zu grader/notebook_cells.py. Aufgaben und Teilaufgaben stammen
// ausschließlich aus den Tags role:*, task:<id> und part:<id>.

import * as fs from "fs/promises";

type RawCell = {
  cell_type?: string;
  source?: string | string[];
  metadata?: { tags?: unknown };
};

export type Cell = { index: number; kind: string; source: string; tags: string[] };

/** Eine prüfbare Einheit: Aufgabe oder Teilaufgabe mit Antwortzellen. */
export type NotebookTask = {
  task: string;
  part: string;
  /** Aufgabe + Teilaufgabe, z. B. "2c"; Präfix der Testnamen test_<id>_. */
  id: string;
  title: string;
};

export function parseCells(json: string): Cell[] {
  const raw = JSON.parse(json) as { cells?: RawCell[] };
  if (!Array.isArray(raw.cells)) { throw new Error("Ungültiges Jupyter-Notebook: cells fehlt."); }
  return raw.cells.map((cell, index) => {
    const tags = cell.metadata?.tags;
    return {
      index,
      kind: cell.cell_type ?? "",
      source: Array.isArray(cell.source) ? cell.source.join("") : (cell.source ?? ""),
      tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [],
    };
  });
}

export async function readCells(file: string): Promise<Cell[]> {
  return parseCells(await fs.readFile(file, "utf8"));
}

export function tagValue(cell: Cell, prefix: string): string {
  const tag = cell.tags.find(value => value.startsWith(`${prefix}:`));
  return tag ? tag.slice(prefix.length + 1) : "";
}

function isCode(cell: Cell, ...roles: string[]): boolean {
  return cell.kind === "code" && roles.includes(tagValue(cell, "role")) && cell.source.trim() !== "";
}

function joinCode(cells: Cell[]): string {
  return cells.map(cell => `# Notebook-Zelle ${cell.index + 1}: ${cell.tags.join(", ")}\n${cell.source.trimEnd()}`)
    .join("\n\n") + "\n";
}

/** Setup- und Antwortcode in Notebook-Reihenfolge für den pytest-Lauf. */
export function extractCode(cells: Cell[]): string {
  const code = cells.filter(cell => isCode(cell, "setup", "answer"));
  if (!code.length) { throw new Error("Das Notebook enthält keine Codezellen mit role:setup oder role:answer."); }
  return joinCode(code);
}

/**
 * Code für einen KI-Tipp: Setup plus Antwortzellen derselben Aufgabe bis
 * einschließlich der gewählten Teilaufgabe. Aufgaben sind atomar, frühere
 * Teilaufgaben können aber benötigt werden (z. B. Hilfsfunktionen).
 */
export function extractTaskCode(cells: Cell[], task: string, part: string): string {
  const own = cells.filter(cell => cell.kind === "code" && tagValue(cell, "role") === "answer" && tagValue(cell, "task") === task);
  // Teilaufgaben in der Reihenfolge ihres ersten Auftretens; auch räumlich getrennte Zellen zählen dazu.
  const parts = [...new Set(own.map(cell => tagValue(cell, "part")))];
  if (!parts.includes(part)) { throw new Error(`Keine Antwortzellen für Aufgabe ${task}${part} gefunden.`); }
  const allowed = parts.slice(0, parts.indexOf(part) + 1);
  return joinCode(cells.filter(cell => isCode(cell, "setup")
    || (own.includes(cell) && allowed.includes(tagValue(cell, "part")) && isCode(cell, "answer"))));
}

/** Alle Aufgaben/Teilaufgaben mit Antwortzellen, in Notebook-Reihenfolge. */
export function notebookTasks(cells: Cell[]): NotebookTask[] {
  const tasks: NotebookTask[] = [];
  for (const cell of cells) {
    const task = tagValue(cell, "task");
    const part = tagValue(cell, "part");
    if (tagValue(cell, "role") !== "answer" || !task || tasks.some(t => t.task === task && t.part === part)) { continue; }
    const prompt = cells.find(c => tagValue(c, "role") === "prompt" && tagValue(c, "task") === task && tagValue(c, "part") === part);
    tasks.push({ task, part, id: task + part, title: prompt ? heading(prompt.source) : "" });
  }
  return tasks;
}

function heading(markdown: string): string {
  const line = markdown.split("\n").find(text => text.trim()) ?? "";
  return line.replace(/^#+\s*/, "").trim();
}
