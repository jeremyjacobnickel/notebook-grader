// Reine Rechen-Logik für den Punktestand — bewusst ohne I/O,
// damit sie einfach unit-testbar ist.

export interface ScoreResult {
  passed: number;
  total: number;
  percentage: number;
  isPass: boolean;
}

// Bestanden ab 80 % der Punkte (Vorgabe des Praktikums).
export const PASS_THRESHOLD = 80;

export function computeScore(passed: number, total: number): ScoreResult {
  // Auf eine Nachkommastelle runden, wie im Backend-Contract (z. B. 85.7)
  const percentage = total === 0 ? 0 : Math.round((passed / total) * 1000) / 10;
  return {
    passed,
    total,
    percentage,
    isPass: percentage >= PASS_THRESHOLD,
  };
}
