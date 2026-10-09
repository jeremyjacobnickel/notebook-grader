# Praktikumsaufgaben

Jeder Unterordner ist ein veröffentlichtes Praktikumspaket im Format aus
[WORKFLOW.md](../WORKFLOW.md): `manifest.json`, das getaggte Aufgaben-Notebook,
pytest-Tests, die gemeinsame `conftest.py` (Kopie von
`grader/praktikum_conftest.py`) und benötigte Dateien. Studierende erhalten den
Inhalt als ZIP; das Backend liest hier die Aufgabenstellung für KI-Tipps und
nimmt nur Abgaben zu vorhandenen Paketen an. `tests/test_praktikum_packages.py`
prüft Layout, Tags und dass jedes leere Notebook vollständig als offen gilt.

| Paket | Tests | Ohne automatische Prüfung | Benötigte Dateien |
|---|---|---|---|
| `1_praktikum` | 21 | 1c, 2d (Textantworten), 7 (Vibe Coding) | – |
| `2_praktikum` | 22 | 3 (keine Variablennamen vorgegeben) | – |
| `3_praktikum` | 27 | – | `peppers.tiff` **(fehlt noch)** |
| `4_praktikum` | 20 | – | `peppers.tiff` **(fehlt noch)** |
| `5_praktikum` | 19 | – | – |
| `6_praktikum` | 24 | Auswahlfrage in 1b, Iterationszahl in 4j | `faust.txt`, `labyrinth.tiff` **(fehlen noch)** |

Die fehlenden Dateien stammen vom Professor und müssen vor der Veröffentlichung
neben das Notebook gelegt werden; ohne sie scheitern die betroffenen Aufgaben
mit `FileNotFoundError`. Die Tests berechnen ihre Erwartungswerte aus diesen
Dateien; nur die Kontrollwerte aus der Aufgabenstellung (OBERON 8 und
MEPHISTOPHELES 1331 Zeilen, Ausgang `[16, 17]`) sind fest hinterlegt.

Die Aufgaben-Notebooks entsprechen inhaltlich den Vorlagen des Professors.
Ergänzt wurden nur Tags, in Praktikum 1 eine Setup-Zelle mit `import numpy as np`
und – wo Aufgabenüberschrift und Teil a) in einer Zelle standen – eine Trennung
dieser beiden Zellen. Musterlösungen sind nicht Teil dieses Repositories.

## Auslegungen, die mit dem Professor abzugleichen sind

Wo die Aufgabe keinen eindeutigen Erwartungswert nennt, prüfen die Tests:

- **1/4b** Verschnitt in Zentimetern (`v == 10`).
- **1/6** `F_par = F_g·sin α`, `F_perp = F_g·cos α`; maximale beschleunigende
  Kraft `F_a = F_perp_max / cos α − F_g` (senkrechte Last `(F_g + F_a)·cos α`);
  `s = ½·(F_a / m)·(2 s)²`.
- **2/1d** `m = 4`, `n = 10`, `max_value = 2^10 − 2^−4`.
- **2/2a** `deviation_in_percent = (TiB/TB − 1)·100 ≈ 9,95`, `complain = False`;
  **2/2b** `smart = False` (Übertragung ≈ 9,26 Tage, Luftfracht 2 Tage).
- **3/7b–c** laut Abbildung 1.b `F_z = F·sin α`, `F_x = F·cos α·cos β`,
  `F_y = F·cos α·sin β`; `γ = arctan(a / 2a)`. 7d akzeptiert jede äquivalente
  Matrixform `A`, `b` (Variablennamen `A` und `b` wie im Aufgabentext).
- **4/3d** Die numerische Ableitung wird über `x[:-1]` geplottet (Vorwärtsdifferenz);
  **4/6b** Iterationszahl ±1 toleriert (Zählweise).
- **6/1a** `value_of_time_fix ≈ 30.4`; **6/2d** auch Regie ohne Doppelpunkt
  (`MEPHISTOPHELES (ab)`) ist eine Sprecherzeile; **6/2e** Sprecher- und reine
  Regiezeilen werden nicht mitgezählt (Kontrollwerte OBERON 8, MEPHISTOPHELES 1331).

Jeder Test zählt einen Punkt; bestanden ab 80 %.
