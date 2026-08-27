# Instruktion 7: Gegner (Wurm/Drache)

## Kontext
Aufbauend auf Instruktion 6 (Prozentanzeige, bereits umgesetzt). Jetzt kommt
der Gegner dazu — der wurm-/drachenartige Bewohner des Spielfelds, der sich
frei innerhalb der aktuellen (nicht-eroberten) Fläche bewegt.

**Wichtiger Hinweis zur TODO-Nummerierung:** In Instruktion 5 wurden zwei
Stellen mit `// TODO(Instruktion 6): ...` markiert (Platzhalter-Regel für
"welche Seite wird erobert" und Platzhalter-Regel für vorzeitiges Loslassen
der Leertaste). Diese TODOs beziehen sich inhaltlich auf **diesen** Auftrag
(den Gegner), auch wenn zwischenzeitlich Instruktion 6 für die Prozentanzeige
verwendet wurde. Bitte diese Kommentare zu `TODO(Instruktion 7)` umbenennen
bzw. direkt hier auflösen — nicht als offene TODOs stehen lassen.

**Noch NICHT Teil dieses Auftrags:**
- Leben-/Schild-System (Konsequenz bei Kollision ist in diesem Schritt
  bewusst minimal, siehe Punkt 4)
- Zeitlimit/Timer
- Mehrere Gegner gleichzeitig oder Level-spezifische Gegnertypen (nur ein
  einzelner, generischer Gegner für diesen Schritt)
- Finales Grafik-Design des Wurms/Drachen (Platzhalter-Form reicht)

## Aufgaben

### 1. Punkt-in-Polygon-Test (geometrische Grundlage)

- `src/game/polygon.ts` erweitern: Funktion `isPointInPolygon(point: Point,
  polygon: Point[]): boolean` (z.B. Ray-Casting-Algorithmus)
- Wird für Gegner-Bewegung (innerhalb der Fläche bleiben) und für die
  "echte" Eroberungs-Regel (Punkt 5) gebraucht

### 2. Gegner-Datenmodell

- `src/game/enemy.ts`: Typ/Klasse `Enemy` mit Position (`Point`) und
  Bewegungsrichtung (Vektor)
- Für diesen Schritt: ein einzelner Gegner reicht, Position wird beim
  Levelstart innerhalb des initialen Feld-Polygons platziert (z.B. Zentrum
  des Rechtecks)

### 3. Gegner-Bewegung

- `src/game/enemyMovement.ts`:
  - Einfache, erratische Bewegung: Gegner bewegt sich in seine aktuelle
    Richtung, bei Erreichen einer Polygon-Kante (Kollision mit dem Rand
    des **aktuellen, ggf. bereits verkleinerten** Feld-Polygons) wird eine
    neue, zufällige Richtung gewählt (kein exaktes Reflexionsverhalten
    nötig — Hauptsache der Gegner bleibt zuverlässig innerhalb der Fläche)
  - Praktischer Ansatz: nächste Tick-Position testen, mit
    `isPointInPolygon` prüfen, ob sie noch innerhalb der Fläche liegt;
    falls nicht, neue zufällige Richtung wählen und erneut prüfen (mit
    einer sinnvollen Obergrenze an Versuchen, um Endlosschleifen zu
    vermeiden — z.B. 10 Versuche, danach Richtung umkehren als Fallback)
  - Geschwindigkeit als eigene Konstante, Delta-Time-basiert wie die
    übrige Bewegung im Spiel
  - Kurzer Code-Kommentar: dieses simple Zufallsbewegungsmodell ist ein
    Platzhalter für ausgefeilteres Gegnerverhalten (z.B. gezielteres
    Ausweichen/Verfolgen), das bei Bedarf in einer späteren Instruktion
    verfeinert werden kann

### 4. Kollisionserkennung mit der aktiven Linie

- `src/game/collision.ts`: Funktion, die prüft, ob die Gegnerposition
  (mit kleinem Toleranzradius, da beides Punkte/dünne Linien sind) die
  aktuell im `drawing`-Modus gezeichnete Linie (aus Instruktion 3) berührt
- Bei Kollision (Gegner berührt die aktive Linie): minimaler Konsequenz-
  Mechanismus, da noch kein Leben-/Punktesystem existiert:
  - Spieler wird zurück auf den Rand versetzt, an die Position, wo die
    aktuelle Linie begonnen hat (Start-Punkt aus Instruktion 3)
  - Die begonnene Linie wird verworfen (nicht als `completedLine`
    übernommen, kein Polygon-Split)
  - Der bereits ausgeschnittene Pfad-Bereich im Foreground (aus
    Instruktion 4, pfadbasiertes `destination-out`) bleibt technisch
    sichtbar ausgeschnitten, da das rückgängig machen des Canvas-
    Compositing aufwändig wäre — das ist für diesen Schritt akzeptiert,
    bitte mit `// TODO(später): bei Kollision müsste der Foreground
    eigentlich auf den Stand vor Beginn der Linie zurückgesetzt werden
    (z.B. durch Neuzeichnen des Foreground-Bilds), aktuell bleibt der
    Pfad optisch ausgeschnitten` kommentieren
  - Kurze Konsolen-Ausgabe (`console.log`) als sichtbares Feedback, dass
    eine Kollision stattgefunden hat — kein UI/Game-Over-Screen in
    diesem Schritt

### 5. Echte Regel für "welche Seite wird erobert" (löst Platzhalter aus
   Instruktion 5 ab)

- In `src/game/polygon.ts` (oder wo `determineClaimedRegion` aus
  Instruktion 5 liegt): Funktion so anpassen, dass sie zusätzlich die
  aktuelle Gegnerposition entgegennimmt
- Neue Logik: dasjenige der beiden Teilpolygone, das die Gegnerposition
  **nicht** enthält (`isPointInPolygon`), gilt als erobert; das Polygon
  mit dem Gegner bleibt aktives Spielfeld
- Die bisherige "kleineres Polygon gewinnt"-Regel als Fallback behalten,
  falls der Gegner exakt auf einer Kante liegt oder aus anderen Gründen
  keinem der beiden Polygone eindeutig zugeordnet werden kann (seltener
  Randfall, kurz kommentieren)
- Alle Aufrufer dieser Funktion entsprechend anpassen (Gegnerposition
  mitgeben)

### 6. Rendering

- Gegner wird als einfache, gut sichtbare Platzhalter-Form gezeichnet
  (z.B. Kreis oder einfaches Polygon in kontrastierender Farbe), mit
  Kommentar, dass dies später durch das eigentliche Wurm-/Drachen-Design
  ersetzt wird
- Gegner wird nach dem Feld/Background/Foreground, aber vor
  Spielfigur/aktueller Linie gezeichnet (Render-Reihenfolge sinnvoll
  ergänzen)

### 7. Integration in Game-Loop

- `update(dt)`: Gegner-Bewegung wird jeden Frame aktualisiert, danach
  Kollisionsprüfung (nur relevant, wenn Spieler gerade im `drawing`-Modus
  ist)

### 8. Tests

- `src/game/polygon.test.ts` (Erweiterung):
  - `isPointInPolygon`: Tests für eindeutig innen/aussen liegende Punkte
    an einem einfachen Rechteck
  - `determineClaimedRegion` mit Gegnerposition: Test, dass das Polygon
    OHNE Gegner als erobert zurückgegeben wird, auch wenn es das grössere
    ist (Regression-Test gegen die alte "kleiner gewinnt"-Regel)
- `src/game/collision.test.ts`:
  - Test für eindeutige Kollision (Gegner exakt auf der Linie)
  - Test für eindeutige Nicht-Kollision (Gegner weit entfernt)

## Was NICHT Teil dieses Auftrags ist
- Leben-/Schild-System, Game-Over-Screen
- Zurücksetzen des Foreground-Ausschnitts bei Kollision (nur TODO-Kommentar)
- Mehrere/unterschiedliche Gegnertypen
- Ausgefeiltes Gegnerverhalten (Verfolgen, gezieltes Ausweichen)
- Finales Grafik-Design

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie die Gegner-Bewegung konkret innerhalb des (ggf. unregelmässigen)
  Polygons begrenzt wird
- Wie die Kollisionserkennung mit der aktiven Linie funktioniert
  (Toleranzradius etc.)
- Wo die TODO(Instruktion 6)-Kommentare aus Instruktion 5 gefunden und wie
  sie aufgelöst/umbenannt wurden
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: Leben-/
  Schild-System + Game-Over/Retry-Logik, danach Zeitlimit)
