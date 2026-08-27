# Instruktion 9: Score-System, Extra-Leben, Levelabschluss

## Kontext
Aufbauend auf Instruktion 8 (Leben/Schild-System + Game-Over, bereits
umgesetzt). Dieser Auftrag ergänzt das Scoring nach dem Vorbild des
Originals (Volfied), recherchiert und bestätigt über mehrere Quellen:

- Punkte werden basierend auf der eroberten Fläche vergeben — je mehr
  Fläche, desto mehr Punkte
- Ziel pro Level: **mindestens 80%** der Fläche erobern, dann gilt das
  Level als abgeschlossen (im Original abgelöst von Qix/Super Qix, die
  75% bzw. 70% verlangten — 80% ist Volfieds spezifischer Wert)
- Bei genügend Score gibt es **Extra-Leben** (Standard-Arcade-Mechanik der
  Ära; die exakten Punkte-Schwellwerte aus dem Original sind nicht
  zuverlässig dokumentiert, daher wird ein sinnvoller, konfigurierbarer
  Schwellwert verwendet — siehe Punkt 3)

**Hinweis zu Dokumentationslücken:** Die genauen Punktewerte pro Prozent
sowie die genauen Extra-Leben-Schwellwerte aus dem Original-Arcade-Automaten
sind nicht mit Sicherheit recherchierbar (verschiedene Ports/Difficulty-
Level hatten vermutlich unterschiedliche Werte). Dieser Auftrag verwendet
daher plausible, klar als Konstanten definierte Platzhalter-Werte, die du
später leicht anpassen kannst, statt erfundene "Original"-Zahlen als exakt
auszugeben.

**Noch NICHT Teil dieses Auftrags:**
- Bonuspunkte für gefangene Mini-Gegner (im Original: kleinere Gegner, die
  beim Einschliessen "gefangen" werden, geben Bonus — da es aktuell nur
  einen einzelnen Gegner gibt, entfällt das vorerst, siehe "Was NICHT Teil
  ist")
- Rundenanzeige/Level-zu-Level-Übergang mit neuem Foreground/Background
  (nur der Abschluss-Zustand des aktuellen Levels)
- Highscore-Speicherung

## Aufgaben

### 1. Score-Zustand

- `src/game/scoring.ts` (aus Instruktion 6) erweitern: Spielzustand um
  `score: number` (Startwert 0)
- Konstante `pointsPerPercent: number` definieren (z.B. 100 — als klar
  benannte, leicht anpassbare Konstante, nicht magisch im Code verteilt)

### 2. Punktevergabe bei Flächeneroberung

- Bei jedem erfolgreichen Polygon-Split (Instruktion 5/Instruktion 6 —
  dort, wo `claimedArea` bereits aktualisiert wird): zusätzlich Punkte
  vergeben, proportional zur neu eroberten Fläche
  - Berechnung: `neuer Prozentanteil dieser Eroberung × pointsPerPercent`
    (Prozentanteil bezogen auf `totalFieldArea` aus Instruktion 6, nicht
    auf die verbleibende Restfläche)
  - `score += zusätzliche Punkte`, gerundet auf ganze Zahl
- Kurzer Kommentar im Code: grössere Claims geben automatisch
  proportional mehr Punkte, kein zusätzlicher Bonus-Faktor für "mutigere"
  (grössere) Linien in diesem Schritt — das wäre eine mögliche spätere
  Erweiterung, aber nicht Teil dieses Auftrags

### 3. Extra-Leben bei Score-Schwellwerten

- Konstante `extraLifeScoreThreshold: number` definieren (z.B. 10'000) —
  bei jedem Vielfachen dieses Schwellwerts wird ein Leben gutgeschrieben
- Implementierung: nach jeder Score-Erhöhung prüfen, ob eine neue
  Schwelle überschritten wurde (nicht nur "score > threshold", sondern
  auch bei grossen Sprüngen über mehrere Schwellen hinweg korrekt zählen
  — z.B. via `Math.floor(scoreVorher / threshold)` vs.
  `Math.floor(scoreNachher / threshold)` vergleichen, Differenz = Anzahl
  neuer Extra-Leben)
- Bei Extra-Leben: `lives += 1` (kein Cap in diesem Schritt, ausser du
  willst explizit eine Obergrenze — bitte kurz kommentieren, falls keine
  gesetzt wird, dass das eine bewusste Entscheidung ist)
- Kurzes visuelles Feedback bei Extra-Leben (analog zum Feedback bei
  Lebensverlust aus Instruktion 8 — gleiche Technik wiederverwenden,
  z.B. kurzes Aufblitzen der Leben-Anzeige im HUD)

### 4. Levelabschluss bei 80%

- Neue Zustandsgrösse `isLevelComplete: boolean` (Startwert false)
- Sobald der Prozentwert aus Instruktion 6
  (`getClaimedPercentage(claimedArea, totalFieldArea)`) **80 oder mehr**
  erreicht: `isLevelComplete = true`
- Bei `isLevelComplete === true`:
  - Game-Loop `update()` verarbeitet keine Spieler-/Gegnerbewegung mehr
    (gleiches Prinzip wie beim Game-Over-Freeze aus Instruktion 8)
  - Einfaches "Level Complete"-Overlay analog zum Game-Over-Overlay
    (gleiche Technik/Struktur wiederverwenden, nicht neu erfinden),
    zeigt erreichten Prozentwert und aktuellen Score an
  - Konstante `levelCompleteThreshold = 80` verwenden, nicht hartcodiert
    als Magic Number im Code verteilen

### 5. Abgrenzung Level-Complete vs. Game-Over

- Beide Zustände (`isGameOver`, `isLevelComplete`) schliessen sich
  gegenseitig aus — bitte sicherstellen, dass nicht beide gleichzeitig
  `true` sein können (z.B. durch klare Prüf-Reihenfolge: Level-Complete-
  Check nur, wenn nicht bereits `isGameOver`)
- Beide nutzen aktuell den gleichen "Neustart bei Enter"-Mechanismus aus
  Instruktion 8 (kompletter Reset) — echter Level-zu-Level-Übergang mit
  neuem Level statt komplettem Neustart ist bewusst NICHT Teil dieses
  Auftrags (siehe unten)

### 6. HUD erweitern

- Score-Anzeige im bestehenden HUD (Instruktion 6/8) ergänzen, gleiche
  Position/Stil wie die anderen Werte (z.B. oben oder neben der
  Prozentanzeige, passend zum bisherigen Layout)
- Format: einfache Zahl, keine führenden Nullen nötig (im Gegensatz zur
  Prozentanzeige)

### 7. Tests

- `src/game/scoring.test.ts` (Erweiterung):
  - Test: Punktevergabe bei bekannter eroberter Fläche ergibt erwarteten
    Score-Zuwachs
  - Test: Überschreiten eines Extra-Leben-Schwellwerts erhöht `lives`
    korrekt um genau 1
  - Test: ein Score-Sprung über **mehrere** Schwellwerte hinweg (z.B.
    durch eine sehr grosse Eroberung in einem Schritt) erhöht `lives` um
    die korrekte Anzahl (nicht nur um 1)
  - Test: `isLevelComplete` wird korrekt bei genau 80% sowie bei einem
    Wert knapp darüber `true`, bei 79.9% bleibt es `false`

## Was NICHT Teil dieses Auftrags ist
- Bonuspunkte für gefangene Mini-Gegner (aktuell nur ein Gegnertyp)
- Echter Level-zu-Level-Übergang (neues Level laden statt Neustart)
- Rundenanzeige/-zähler
- Highscore-Speicherung (lokal oder sonst)
- Obergrenze für Extra-Leben, falls nicht ohnehin trivial mit umzusetzen

## Nach Abschluss
Bitte kurz zusammenfassen:
- Welche Werte für `pointsPerPercent` und `extraLifeScoreThreshold`
  gewählt wurden und ob sie sich im Spielgefühl sinnvoll anfühlen (grobe
  Einschätzung reicht)
- Wie die Mehrfach-Schwellwert-Logik für Extra-Leben umgesetzt wurde
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: echter
  Level-zu-Level-Übergang mit mehreren Levels/Foreground-Background-Sets,
  oder Zeitlimit pro Level, je nachdem was du priorisieren willst)
