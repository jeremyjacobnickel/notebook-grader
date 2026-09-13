import { HintUsage } from "../backend/client";

export function usageText(usage?: HintUsage): string {
  if (!usage) { return "Keine Verbrauchsdaten verfügbar."; }
  const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? String(value) : "unbekannt";
  const model = usage.reported_model && usage.reported_model !== "default_router" ? usage.reported_model : "unbekannt (Router)";
  const cost = typeof usage.cost_usd === "number" && Number.isFinite(usage.cost_usd) && usage.cost_usd >= 0 ? `${usage.cost_usd.toFixed(6)} USD` : "unbekannt";
  return [`Angefragt: ${usage.requested_model || "unbekannt"}`, `Gemeldetes Modell: ${model}`,
    `Deployment: ${usage.deployment_id || "unbekannt"}`,
    `Tokens: ${count(usage.input_tokens)} Eingabe · ${count(usage.output_tokens)} Ausgabe · ${count(usage.total_tokens)} gesamt`,
    `Gemeldete Kosten: ${cost}`, `Antwortdauer: ${count(usage.duration_ms)} ms`,
    usage.recorded === false ? "Verbrauch konnte nicht gespeichert werden." : ""
  ].filter(Boolean).join("\n");
}
