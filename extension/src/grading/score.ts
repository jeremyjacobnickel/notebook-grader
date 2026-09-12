// Reine Bewertungs-Logik — kein I/O, damit sie leicht unit-testbar ist.

/** Ab diesem Prozentsatz gilt ein Praktikum als bestanden. */
export const PASS_THRESHOLD_PERCENT = 80;

export interface ScoreResult {
  passed: number;
  total: number;
  /** Prozentsatz, auf eine Nachkommastelle gerundet (z. B. 85.7). */
  percentage: number;
  isPass: boolean;
}

/**
 * Berechnet den Punktestand aus bestandenen und gesamten Tests.
 * 0 Tests insgesamt zählt als nicht bestanden.
 */
export function computeScore(passed: number, total: number): ScoreResult {
  const percentage =
    total === 0 ? 0 : Math.round((passed / total) * 1000) / 10;
  return {
    passed,
    total,
    percentage,
    isPass: total > 0 && passed * 100 >= total * PASS_THRESHOLD_PERCENT,
  };
}
