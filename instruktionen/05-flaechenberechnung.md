# Instruktion 5: Flächenberechnung + Polygon-Splitting + vollständiges Freilegen

## Kontext
Aufbauend auf Instruktion 4 (Foreground/Background-Ebenen, pfadbasiertes
Ausschneiden via Offscreen-Canvas + `destination-out`, bereits umgesetzt).

Dieser Auftrag ist der geometrische Kern des Spiels: Wenn eine gezeichnete
Linie den Feld-Rand wieder erreicht, wird das aktuelle Feld-Polygon in zwei
Teilpolygone gesplittet. Eines davon wird zum neuen, aktiven Spielfeld
(Spieler bewegt sich künftig auf dessen Rand), das andere gilt als
"eingeschlossen" bzw. "erobert".

**Wichtige Ergänzung zu Instruktion 4:** Bisher wurde nur der befahrene Pfad
selbst aus dem Foreground ausgeschnitten. Ab jetzt wird zusätzlich die
**gesamte Innenfläche** des eingeschlossenen Teilpolygons aus dem Foreground
entfernt, nicht nur die Pfadlinie — der Background wird dort vollständig
sichtbar, wie bei einer gefüllten Fläche.

**Noch NICHT Teil dieses Auftrags:**
- Gegner (Wurm/Drache) — daher gibt es noch kein "richtiges" Kriterium, um
  zu bestimmen, welche der beiden Teilflächen die eroberte und welche die
  verbleibende Spielfläche ist (siehe Punkt 2, Platzhalter-Regel)
- Zeitlimit/Timer
- Punktesystem / Prozentanzeige (kann vorbereitet, muss aber nicht fertig
  UI-mässig umgesetzt werden)

## Aufgaben

### 1. Polygon-Splitting

- `src/game/polygon.ts` (neue Datei, reine Geometrie-Funktionen, keine
  Abhängigkeit zu Rendering/Input):
  - Funktion, die aus dem aktuellen Feld-Polygon (`Point[]`, siehe
    Instruktion 2) und einer abgeschlossenen Linie (Start- und Endpunkt
    jeweils auf einer Polygon-Kante, dazwischen die Zwischenpunkte aus
    Instruktion 3) **zwei neue geschlossene Polygone** berechnet
  - Ansatz: Rand-Punkte des Ursprungspolygons zwischen Start- und
    Endpunkt der Linie in beide Richtungen ablaufen, jeweils kombiniert
    mit der Linie (einmal vorwärts, einmal rückwärts) ergibt die zwei
    Teilpolygone
  - Funktion für Flächenberechnung eines Polygons (Shoelace-Formel),
    wird für Punkt 2 gebraucht

### 2. Bestimmen, welches Teilpolygon "erobert" ist

- Da noch kein Gegner existiert, der eigentlich bestimmen würde, welche
  Seite "sicher" bzw. "erobert" ist (im fertigen Spiel: die Seite ohne
  Gegner wird erobert), wird hier eine **Platzhalter-Regel** verwendet:
  das **kleinere** der beiden Teilpolygone (nach Fläche) gilt als erobert,
  das grössere bleibt aktives Spielfeld
- Diese Regel klar als Platzhalter kennzeichnen:
  `// TODO(Instruktion 6): Sobald der Gegner existiert, bestimmt dessen
  Position welche Seite erobert wird (Seite ohne Gegner), nicht mehr die
  Flächengrösse`
- Funktion so schreiben, dass die Entscheidungslogik ("welches Polygon
  gilt als erobert") isoliert und leicht austauschbar ist (z.B. eigene
  Funktion `determineClaimedRegion(regionA, regionB): Polygon`, die in
  Instruktion 6 einfach ersetzt wird)

### 3. Feld-Update

- Das neue aktive Spielfeld-Polygon (die nicht-eroberte Seite) ersetzt das
  bisherige Feld-Polygon im Spielzustand
- Spieler-Zustand (Segment-Index + Fortschritt aus Instruktion 2) wird auf
  Basis des neuen Polygons neu berechnet, ausgehend vom Endpunkt der
  gezeichneten Linie (dort befindet sich der Spieler nach Abschluss der
  Linie)
- Die Liste `completedLines` (aus Instruktion 3) kann nach erfolgreicher
  Verarbeitung geleert bzw. die verarbeitete Linie entfernt werden — sie
  ist nach dem Splitting nicht mehr gesondert nötig, da sie jetzt Teil der
  Polygon-Kanten ist

### 4. Vollständiges Freilegen der eroberten Fläche

- Das eroberte Teilpolygon wird komplett aus dem Offscreen-Foreground-
  Canvas (aus Instruktion 4) entfernt: gesamte Innenfläche, nicht nur der
  Pfad
- Technisch: Pfad des eroberten Polygons auf dem Offscreen-Canvas
  aufbauen (`ctx.beginPath()` + `moveTo`/`lineTo` entlang der
  Polygon-Punkte + `closePath()`), dann mit
  `globalCompositeOperation = 'destination-out'` und `ctx.fill()` die
  gesamte Fläche ausschneiden
- Das bisherige pfadbasierte Ausschneiden aus Instruktion 4 bleibt für die
  Live-Vorschau während des Zeichnens bestehen (sofortiges Feedback), wird
  hier aber durch das vollständige Flächen-Ausschneiden ergänzt/überschrieben,
  sobald die Linie abgeschlossen ist

### 5. Verhalten bei Loslassen der Leertaste mitten im Feld (TODO aus
   Instruktion 3/4 auflösen)

- Da noch keine Gefahr/kein Gegner existiert, der ein vorzeitiges
  Abbrechen bestrafen würde, wird für diesen Schritt folgende einfache
  Regel umgesetzt: Wird die Leertaste losgelassen, bevor die Linie
  natürlich auf eine Kante trifft, wird automatisch eine gerade Verbindung
  vom aktuellen Punkt zum **nächstgelegenen Punkt auf dem Feld-Rand**
  ergänzt (kürzeste Distanz), und die Linie danach wie gewohnt verarbeitet
  (Polygon-Splitting wie oben)
- Diesen Punkt im Code klar kommentieren:
  `// TODO(Instruktion 6): Sobald Gegner/Gefahr existieren, wird
  vorzeitiges Loslassen vermutlich anders behandelt (z.B. Linie bricht ab
  ohne Fläche zu erobern, oder kostet ein Leben) — aktuelle Regel ist ein
  Platzhalter ohne Risiko`
- Bitte bestehende TODOs im Code (die in Instruktion 4 bereits mit
  `TODO(Instruktion 5)` markiert wurden) suchen und durch die hier
  beschriebene, jetzt implementierte Lösung ersetzen bzw. auflösen

### 6. Tests

- `src/game/polygon.test.ts`:
  - Flächenberechnung für bekannte einfache Polygone (z.B. Rechteck)
  - Splitting-Test: Rechteck-Feld + eine gerade Linie von der oberen zur
    unteren Kante ergibt zwei Rechtecke mit korrekt berechenbarer,
    plausibler Fläche (Summe ≈ ursprüngliche Fläche)
  - Test für `determineClaimedRegion`: bei zwei unterschiedlich grossen
    Polygonen wird das kleinere zurückgegeben
- `src/game/field.test.ts` (Erweiterung): Test, dass nach einem Split das
  neue Feld-Polygon korrekt gesetzt wird und der Spieler-Zustand
  (Segment/Fortschritt) auf dem neuen Polygon konsistent ist

## Was NICHT Teil dieses Auftrags ist
- Gegner-Logik oder -Rendering
- Endgültige Regel für "welche Seite wird erobert" (Platzhalter reicht)
- Endgültige Regel für vorzeitiges Loslassen (Platzhalter reicht)
- Zeitlimit, Punkteanzeige/UI, Levelabschluss-Bedingung (z.B. "80%
  erobert")

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie das Polygon-Splitting konkret gelöst wurde (kurz in eigenen Worten)
- Wie die Platzhalter-Regel für "erobertes Polygon" und für "vorzeitiges
  Loslassen" jeweils funktioniert, und wo die entsprechenden
  TODO(Instruktion 6)-Kommentare gesetzt wurden
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für Instruktion 6 (vermutlich: Gegner/Wurm — Bewegung,
  Rendering, Kollisionslogik mit der aktiven Linie, und die "echte"
  Regel für eroberte Seite basierend auf Gegnerposition)
