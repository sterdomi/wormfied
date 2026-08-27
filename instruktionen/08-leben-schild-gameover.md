# Instruktion 8: Leben/Schild-System + Game-Over-Logik

## Kontext
Aufbauend auf Instruktion 7 (Gegner, Kollisionserkennung mit minimaler
Konsequenz — Linie verwerfen, Spieler zurücksetzen, bereits ausgeschnittener
Foreground-Pfad blieb bisher stehen). Dieser Auftrag ersetzt die minimale
Konsequenz durch ein richtiges Leben-/Schild-System und löst dabei auch das
in Instruktion 7 offen gelassene TODO (Foreground bei Kollision zurücksetzen).

**Spielprinzip (analog Original):**
- Der Spieler hat eine begrenzte Anzahl **Leben**
- Zusätzlich gibt es ein **Schild**, das über die Zeit abnimmt, solange sich
  der Spieler auf dem Rand befindet (`onEdge`) — beim Zeichnen (`drawing`)
  ist man ohnehin schon durch die Linien-Kollision verwundbar, dort spielt
  das Schild keine Rolle
- Ist das Schild aufgebraucht (0 erreicht), wird der Spieler **auch auf dem
  Rand** verwundbar — berührt ihn der Gegner dort, kostet das ebenfalls ein
  Leben
- Bei Verlust eines Lebens: Schild wird wieder aufgefüllt, Spielfeld-
  Fortschritt (eroberte Fläche) bleibt erhalten, nur der **aktuelle
  Zeichenversuch** wird rückgängig gemacht
- Sind alle Leben aufgebraucht: Game Over

**Noch NICHT Teil dieses Auftrags:**
- Punktestand/Score-Zahlen (nur Leben/Schild)
- Rundenanzeige/Level-Wechsel
- Zeitlimit (kommt separat)
- Sound/Musik bei Game Over

## Aufgaben

### 1. Foreground-Snapshot-Mechanismus (löst TODO aus Instruktion 7)

- `src/engine/offscreenCanvas.ts` (aus Instruktion 4) erweitern:
  - Funktion `snapshot(canvas: HTMLCanvasElement): ImageData`, die den
    aktuellen Pixel-Zustand des Offscreen-Foreground-Canvas sichert
  - Funktion `restoreSnapshot(canvas: HTMLCanvasElement, snapshot:
    ImageData): void`, die den Zustand wiederherstellt
- Beim Übergang `onEdge` → `drawing` (aus Instruktion 3) wird automatisch
  ein Snapshot des aktuellen Foreground-Zustands genommen und im
  Spielzustand gehalten (z.B. `foregroundSnapshotAtDrawStart`)
- Bei erfolgreichem Abschluss einer Linie (Polygon-Split aus Instruktion 5)
  wird der Snapshot verworfen (Versuch war erfolgreich, nichts
  zurückzusetzen)
- Bei Kollision (siehe Punkt 3) wird der Snapshot auf den Offscreen-Canvas
  zurückgeschrieben — der während dieses Versuchs pfadbasiert ausgeschnittene
  Bereich (aus Instruktion 4) verschwindet wieder, alle vorher bereits
  erfolgreich eroberten Flächen bleiben unangetastet

### 2. Leben- und Schild-Zustand

- `src/game/playerState.ts` (oder passend erweitern): Spielzustand um
  - `lives: number` (Startwert z.B. 3, als Konstante definieren)
  - `shield: number` (0–100, Startwert 100)
  - `isGameOver: boolean` (Startwert false)
- Konstanten für Startwerte und Schild-Abnahmerate (`shieldDecayPerSecond`)
  zentral definieren, nicht verstreut im Code

### 3. Schild-Abnahme

- Solange `mode === 'onEdge'` (aus Instruktion 2/3): `shield` nimmt pro
  Sekunde um `shieldDecayPerSecond` ab (Delta-Time-basiert), minimal 0
- Während `mode === 'drawing'`: Schild bleibt unverändert (dort zählt nur
  die Linien-Kollision aus Instruktion 7)

### 4. Kollisionslogik erweitern

- Bestehende Kollisionsprüfung aus Instruktion 7 (Gegner berührt aktive
  Linie) bleibt bestehen, löst aber jetzt den vollständigen
  Lebensverlust-Ablauf aus (siehe Punkt 5), nicht mehr nur Reset
- Neue Prüfung ergänzen: wenn `shield <= 0` UND `mode === 'onEdge'`, prüfen,
  ob der Gegner die Spielerposition direkt berührt (Toleranzradius wie in
  Instruktion 7) — falls ja, ebenfalls Lebensverlust-Ablauf auslösen
- Beide Fälle in `src/game/collision.ts` sauber unterscheidbar halten
  (z.B. eigene Funktionen `checkLineCollision` und `checkUnshieldedPlayerCollision`)

### 5. Lebensverlust-Ablauf

- Neue Funktion, z.B. `src/game/lifecycle.ts` → `handleLifeLoss(state)`:
  1. Falls gerade eine Linie gezeichnet wird: verwerfen (wie bisher),
     Foreground-Snapshot zurückschreiben (Punkt 1)
  2. Spieler zurück auf den Rand versetzen (Startpunkt der verworfenen
     Linie, oder aktuelle Rand-Position falls gerade kein Zeichenversuch
     lief — z.B. bei der neuen ungeschildeten Rand-Kollision)
  3. `lives -= 1`
  4. `shield` auf Startwert zurücksetzen
  5. Falls `lives <= 0`: `isGameOver = true`, Game-Loop-Update pausieren
     (siehe Punkt 7)
  6. Kurzes visuelles Feedback bei Lebensverlust (z.B. kurzes Aufblitzen
     des Spielers/Canvas — kein aufwändiger Effekt nötig, aber irgendein
     spürbares Feedback, reines `console.log` reicht hier NICHT mehr aus,
     da es jetzt eine echte Spielkonsequenz ist)

### 6. Game-Over-Zustand

- Bei `isGameOver === true`:
  - Game-Loop `update()` verarbeitet keine Spieler-/Gegnerbewegung mehr
    (Rendering des letzten Zustands bleibt sichtbar, quasi "eingefroren")
  - Einfacher "Game Over"-Text wird angezeigt (Canvas-Overlay oder
    HTML-Overlay über dem Spielfeld, konsistent mit dem HUD-Ansatz aus
    Instruktion 6 — bitte gleiche Technik verwenden)
  - Hinweis auf Neustart-Möglichkeit (z.B. "Drücke Enter für Neustart")

### 7. Neustart-Logik

- Bei Druck von Enter (oder gewählter Taste) im Game-Over-Zustand: kompletter
  Reset des Spielzustands:
  - `lives`, `shield`, `isGameOver` auf Startwerte
  - Feld-Polygon zurück auf initiales Rechteck
  - `claimedArea` zurück auf 0 (Instruktion 6)
  - Foreground-Offscreen-Canvas zurück auf das ursprüngliche Foreground-Bild
    (nicht nur Snapshot-Restore, sondern das Bild aus Instruktion 4 neu
    hineinzeichnen)
  - Spieler zurück auf Startposition
  - Gegner zurück auf Startposition (Instruktion 7)
- Bitte diese Reset-Logik als eigene, wiederverwendbare Funktion
  strukturieren (z.B. `src/game/resetGame.ts`), da sie inhaltlich dem
  Level-Start-Setup entsprechen sollte — falls das schon irgendwo als
  Funktion existiert (Level-Initialisierung), diese wiederverwenden statt
  duplizieren

### 8. HUD erweitern

- Bestehende HUD-Leiste (Instruktion 6, Prozentanzeige) um Leben und
  Schild ergänzen:
  - Leben: einfache Zahl oder Reihe kleiner Platzhalter-Icons (z.B. kleine
    Kreise/Dreiecke), Anzahl entspricht `lives`
  - Schild: einfacher numerischer Wert oder schmaler Balken (0–100), analog
    zur Optik des Referenzbilds aus einem früheren Schritt — keine
    aufwändige Grafik nötig, Systemfont/einfache Balken-Darstellung reicht
- HUD aktualisiert sich bei Änderung von `lives`/`shield` (Schild
  kontinuierlich während `onEdge`, Leben nur bei Verlust)

### 9. Tests

- `src/game/lifecycle.test.ts`:
  - Test, dass `handleLifeLoss` `lives` korrekt reduziert und `shield`
    zurücksetzt
  - Test, dass bei `lives === 0` nach Verlust `isGameOver` auf `true`
    gesetzt wird
- `src/game/collision.test.ts` (Erweiterung):
  - Test für `checkUnshieldedPlayerCollision`: löst nur aus, wenn
    `shield <= 0` UND Gegner nah genug am Spieler ist
- Schild-Abnahme über Zeit: einfacher Test, der `dt` simuliert und prüft,
  dass `shield` korrekt und nicht unter 0 sinkt

## Was NICHT Teil dieses Auftrags ist
- Punktestand/Score
- Rundenanzeige, Level-Wechsel-Logik
- Zeitlimit
- Aufwändige Game-Over-Animation/Sound

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie der Foreground-Snapshot-Mechanismus konkret funktioniert und wo er
  eingehängt wurde
- Wie der Game-Over/Neustart-Ablauf strukturiert ist
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: Zeitlimit pro
  Level, danach Score/Rundenanzeige und Levelabschluss-Bedingung z.B. bei
  Erreichen eines Prozent-Schwellwerts)
