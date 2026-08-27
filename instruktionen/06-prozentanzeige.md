# Instruktion 6: Prozentanzeige der eroberten Fläche

## Kontext
Aufbauend auf Instruktion 5 (Flächenberechnung + Polygon-Splitting +
vollständiges Freilegen, bereits umgesetzt). Jetzt kommt die erste HUD-
Anzeige dazu: unten im Bild wird angezeigt, wie viel Prozent des
ursprünglichen Spielfelds bereits erobert wurde — analog zum Original
(Volfied-Referenzbild: gelbe Prozentzahl unten, Format z.B. `01.0%`).

**Scope bewusst eng gehalten:** Nur die Prozentanzeige, nicht der Rest des
HUDs (Punktestand, Runde, Schild-Anzeige, Leben-Icons aus dem Referenzbild)
— das kommt in späteren Instruktionen, sobald die entsprechenden
Spielmechaniken (Punkte, Leben, Runden) existieren.

**Noch NICHT Teil dieses Auftrags:**
- Punktestand/Score
- Leben-/Schild-Anzeige
- Runden-Anzeige
- Levelabschluss-Bedingung (z.B. "bei 80% ist das Level geschafft") — nur
  die Anzeige, keine Konsequenz daraus

## Aufgaben

### 1. Gesamtfläche des Levels festhalten

- Beim Start eines Levels (aktuell: beim initialen Erstellen des
  rechteckigen Feld-Polygons, aus Instruktion 2/`createRectangularField`)
  wird die Gesamtfläche einmalig berechnet (Shoelace-Formel-Funktion aus
  Instruktion 5, `src/game/polygon.ts`) und im Spielzustand gespeichert
  (z.B. `totalFieldArea: number`)

### 2. Eroberte Fläche kumulativ tracken

- `src/game/scoring.ts` (neue Datei): Spielzustand um `claimedArea: number`
  erweitern (Startwert 0)
- Jedes Mal, wenn in Instruktion 5 ein Teilpolygon als "erobert" bestimmt
  und aus dem Foreground ausgeschnitten wird (Punkt 2/4 aus Instruktion 5),
  wird dessen Fläche zu `claimedArea` addiert
- Bitte an der Stelle im Code ansetzen, wo das Splitting/Ausschneiden aus
  Instruktion 5 bereits passiert — keine Duplizierung der Flächenberechnung,
  die dort berechnete Fläche des eroberten Polygons wiederverwenden

### 3. Prozent-Berechnung

- `src/game/scoring.ts`: Funktion `getClaimedPercentage(claimedArea: number,
  totalFieldArea: number): number`, liefert Prozentwert (0–100, eine
  Nachkommastelle sinnvoll, siehe Formatierung unten)
- Reine, leicht testbare Funktion (kein Rendering, kein State-Zugriff
  direkt in der Funktion)

### 4. HUD-Anzeige (Rendering)

- Neues HTML-Element unterhalb des Canvas für die HUD-Leiste (nicht ins
  Canvas hineingezeichnet) — das ist einfacher zu stylen und entspricht
  dem Aufbau vieler Arcade-UI-Nachbauten: schwarzer Balken mit Text
- `src/ui/hud.ts` (oder passend benannt): Funktion, die den Prozentwert
  aktualisiert und ins entsprechende DOM-Element schreibt
- Styling orientiert an der Optik des Referenzbilds: monospace/Pixel-Font
  (Systemfont reicht, falls keine passende Web-Font vorhanden ist — bitte
  keine Zeit in Font-Suche stecken), gelbe Schriftfarbe, unten links
  positioniert
- Format: `NN.N%` (eine Nachkommastelle, führende Nullen wie im
  Referenzbild `01.0%`), aktualisiert sich live während des Spiels

### 5. Integration in Game-Loop

- Nach jedem erfolgreichen Polygon-Split (aus Instruktion 5) wird
  `claimedArea` aktualisiert und die HUD-Anzeige neu gerendert/aktualisiert
- Kein Update pro Frame nötig, nur wenn sich der Wert tatsächlich ändert
  (Performance: unnötiges DOM-Update jeden Frame vermeiden)

### 6. Tests

- `src/game/scoring.test.ts`:
  - `getClaimedPercentage`: einfache Fälle (z.B. `claimedArea` = 25% von
    `totalFieldArea` → Ergebnis 25.0), Rundung auf eine Nachkommastelle
    korrekt
  - Test, dass `claimedArea` nach einem simulierten Split korrekt erhöht
    wird (kann auf bestehenden Split-Testfällen aus Instruktion 5
    aufbauen)

## Was NICHT Teil dieses Auftrags ist
- Restliches HUD (Score, Leben, Schild, Runde)
- Levelabschluss-Logik bei Erreichen eines Prozent-Schwellwerts
- Visuelles Feintuning/Pixel-Font-Nachbau des Originals — reine Systemfont-
  Lösung reicht für diesen Schritt

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wo `claimedArea` im Spielzustand verankert wurde
- Wie die HUD-Aktualisierung an den Split-Vorgang aus Instruktion 5
  angebunden wurde
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: Gegner/Wurm
  — Bewegung, Rendering, Kollisionslogik, danach die "echte" Regel für
  eroberte Seite basierend auf Gegnerposition, die aktuell noch als
  Platzhalter in Instruktion 5 gelöst ist)
