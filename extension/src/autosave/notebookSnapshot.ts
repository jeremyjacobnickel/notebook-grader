// Normalisiert ein Notebook für den Autosave-Verlauf.
//
// Ausgaben (z. B. Plots als Base64), Ausführungszähler und Laufzeitdaten würden
// das Repo aufblähen und die Diffs unlesbar machen. Tags, Quelltext und
// Aufgabentext bleiben; das Ergebnis ist weiterhin ein gültiges Notebook.

type JsonObject = Record<string, unknown>;

const RUNTIME_CELL_METADATA = ["execution", "ExecuteTime", "collapsed", "scrolled"];

export function stripNotebook(json: string): string {
  const notebook = JSON.parse(json) as JsonObject;
  if (!Array.isArray(notebook.cells)) { throw new Error("Ungültiges Jupyter-Notebook: cells fehlt."); }
  for (const cell of notebook.cells as JsonObject[]) {
    if (cell.cell_type === "code") {
      cell.outputs = [];
      cell.execution_count = null;
    }
    removeKeys(cell.metadata, RUNTIME_CELL_METADATA);
  }
  // Zustand interaktiver Widgets (%matplotlib widget) ist reine Laufzeit.
  removeKeys(notebook.metadata, ["widgets"]);
  return JSON.stringify(notebook, null, 1) + "\n";
}

function removeKeys(value: unknown, keys: string[]): void {
  if (!value || typeof value !== "object") { return; }
  for (const key of keys) { delete (value as JsonObject)[key]; }
}
