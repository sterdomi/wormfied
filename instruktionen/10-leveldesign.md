# Instruktion 10: Level-Design-Architektur + Mini-Gegner

## Kontext
Aufbauend auf Instruktion 9 (Scoring, bereits umgesetzt). Bisher gibt es
genau ein "Level" fest im Code verankert (Foreground/Background-Bilder aus
Instruktion 4, ein einzelner Gegner aus Instruktion 7). Dieser Auftrag baut
eine echte **Level-Architektur**: jedes Level ist ein eigenes Package mit
seiner eigenen Konfiguration, und es kommen **Mini-Gegner** dazu (mehrere
kleine Gegner zusätzlich zum Hauptgegner).

**Neue Assets (bereits vorbereitet, liegen bei):**
- `gegner.svg` — Hauptgegner (Wurm/Drache), grösser, detaillierter
- `gegner-mini.svg` — kleinere, einfachere Variante für die Mini-Gegner

Bitte diese beiden Dateien nach `public/assets/enemies/level1/gegner.svg`
bzw. `public/assets/enemies/level1/gegner-mini.svg` legen (analog zur
bestehenden Struktur `public/assets/levels/level1/foreground.png` /
`background.png` aus Instruktion 4).

**Scope dieses Schritts:** Für den Start nur **Anzahl, Geschwindigkeit und
Grösse** der Mini-Gegner pro Level konfigurierbar machen. Weitere
Level-Eigenheiten (Bewegungsmuster-Varianten, Spezialverhalten einzelner
Level, Power-ups etc.) kommen später dazu — die Architektur soll dafür aber
bereits Platz lassen (siehe Punkt 1).

**Noch NICHT Teil dieses Auftrags:**
- Bonuspunkte für "gefangene" Mini-Gegner (aus Instruktion 9 bereits
  bewusst zurückgestellt — bleibt weiterhin zurückgestellt, siehe Punkt 5)
- Mehrere tatsächliche Levels mit unterschiedlichem Inhalt (nur Level 1
  wird in diesem Schritt konkret befüllt, die Architektur trägt aber
  bereits für weitere Levels)
- Level-Auswahl-UI oder Level-Übergangs-Logik

## Aufgaben

### 1. Level-Package-Struktur

- Neuer Ordner `src/levels/`, darin pro Level ein eigenes Unterpackage:
  ```
  src/levels/
    types.ts           # gemeinsames LevelConfig-Interface
    index.ts           # Registry aller Levels (Array/Map)
    level1/
      index.ts         # exportiert das LevelConfig-Objekt für Level 1
  ```
- `src/levels/types.ts`: Interface `LevelConfig`, z.B.:
  ```ts
  interface EnemyConfig {
    assetSrc: string;
    speed: number;      // Pixel/Sekunde
    size: number;        // Rendergrösse in Pixel (z.B. Durchmesser)
  }

  interface LevelConfig {
    id: string;
    name: string;
    backgroundSrc: string;
    foregroundSrc: string;
    mainEnemy: EnemyConfig;
    miniEnemies: {
      count: number;
      config: EnemyConfig;
    };
    // Platzhalter-Kommentar: hier kommen später weitere level-spezifische
    // Eigenheiten rein (Bewegungsmuster, Spezialverhalten, Power-ups etc.)
  }
  ```
- `src/levels/level1/index.ts`: konkretes `LevelConfig`-Objekt für Level 1
  mit den mitgelieferten Assets, sinnvollen Startwerten für
  Hauptgegner-Geschwindigkeit/-Grösse (bestehende Werte aus Instruktion 7
  übernehmen) und für Level 1 z.B. 3 Mini-Gegner, etwas kleiner und
  schneller oder langsamer als der Hauptgegner (bitte eine Einschätzung
  treffen, die sich beim Testen sinnvoll anfühlt, z.B. Mini-Gegner kleiner
  aber gleich schnell oder etwas schneller — kurz im Code kommentieren,
  welche Wahl getroffen wurde)
- `src/levels/index.ts`: exportiert z.B. `levels: LevelConfig[]` mit
  aktuell nur `level1` drin — Struktur so anlegen, dass weitere Levels
  später einfach ergänzt werden können (Import + Array-Eintrag)

### 2. Bestehenden Level-Lade-Mechanismus umstellen

- Der bisherige `Level`-Typ und die Lade-Logik aus Instruktion 4
  (`foregroundSrc`/`backgroundSrc` direkt verwendet) wird durch das neue
  `LevelConfig` ersetzt bzw. darauf umgestellt
- Asset-Loader (Instruktion 4, `assetLoader.ts`) wird so erweitert/
  aufgerufen, dass er neben Foreground/Background jetzt auch
  `mainEnemy.assetSrc` und `miniEnemies.config.assetSrc` lädt (SVGs lassen
  sich wie PNGs über `HTMLImageElement`/`Image()` laden, keine
  Sonderbehandlung nötig)

### 3. Mini-Gegner-Datenmodell

- Bestehenden `Enemy`-Typ (Instruktion 7) prüfen: falls sinnvoll,
  generisch genug gestalten, um sowohl Hauptgegner als auch Mini-Gegner
  abzubilden (Position, Geschwindigkeit, Grösse, Asset-Referenz) — falls
  eine Unterscheidung nötig ist (z.B. weil nur der Hauptgegner die
  "erobert"-Seite bestimmt), reicht ein Flag wie `isMainEnemy: boolean`
  oder zwei getrennte, aber strukturell ähnliche Typen — bitte sinnvoll
  entscheiden und kurz begründen
- Spielzustand: `mainEnemy: Enemy` bleibt wie bisher, neu dazu
  `miniEnemies: Enemy[]` (Anzahl gemäss `LevelConfig.miniEnemies.count`,
  beim Levelstart erzeugt, Startpositionen z.B. zufällig verteilt
  innerhalb des initialen Feld-Polygons, mit Mindestabstand zueinander
  und zum Hauptgegner, damit sie nicht alle übereinanderliegen)

### 4. Mini-Gegner-Verhalten

- Mini-Gegner nutzen die **gleiche Bewegungslogik** wie der Hauptgegner
  (Instruktion 7, `enemyMovement.ts`) — bitte die bestehende Funktion so
  verallgemeinern, dass sie für ein beliebiges `Enemy`-Objekt (nicht nur
  den Hauptgegner) funktioniert, statt die Logik zu duplizieren
- Mini-Gegner lösen **die gleichen Kollisionen aus wie der Hauptgegner**:
  Berühren sie die aktive Zeichenlinie, oder (bei leerem Schild) den
  Spieler direkt auf dem Rand, löst das denselben Lebensverlust-Ablauf aus
  (Instruktion 8) — bitte bestehende Kollisionsprüfung (Instruktion 7/8)
  so anpassen, dass sie über alle Gegner (Hauptgegner + alle Mini-Gegner)
  läuft, nicht nur über den Hauptgegner
- Mini-Gegner beeinflussen **nicht**, welche Seite beim Polygon-Split als
  erobert gilt (Instruktion 5/7) — das bestimmt weiterhin ausschliesslich
  die Position des Hauptgegners

### 5. Mini-Gegner beim Einschliessen entfernen (ohne Bonus, siehe Hinweis)

- Nach einem erfolgreichen Polygon-Split: prüfen, ob sich einer oder
  mehrere Mini-Gegner innerhalb des soeben eroberten Teilpolygons befinden
  (`isPointInPolygon` aus Instruktion 7)
- Falls ja: diese Mini-Gegner aus `miniEnemies` entfernen (sie sind
  "gefangen" und verschwinden) — **ohne** Bonuspunkte in diesem Schritt
  (das bleibt wie in Instruktion 9 festgehalten für später vorgesehen)
- Kommentar im Code: `// TODO(später): gefangene Mini-Gegner sollten
  Bonuspunkte geben (siehe Instruktion 9), aktuell verschwinden sie ohne
  Score-Effekt`

### 6. Rendering

- Mini-Gegner werden mit ihrem jeweiligen SVG-Asset gerendert (analog zum
  Hauptgegner, aber mit `size` aus der Konfiguration skaliert)
- Render-Reihenfolge: alle Gegner (Hauptgegner + Mini-Gegner) an der
  gleichen Stelle wie bisher der Hauptgegner (nach Feld/Background/
  Foreground, vor Spielfigur/aktueller Linie)

### 7. Tests

- `src/levels/levelConfig.test.ts` (oder passend benannt): Test, dass
  `levels`-Array mindestens `level1` enthält und dessen Konfiguration
  plausibel ist (z.B. `miniEnemies.count > 0`)
- `src/game/enemyMovement.test.ts` (Erweiterung): Test, dass die
  verallgemeinerte Bewegungsfunktion sowohl für den Hauptgegner als auch
  für einen Mini-Gegner funktioniert (gleiche Funktion, unterschiedliche
  Instanzen)
- `src/game/collision.test.ts` (Erweiterung): Test, dass eine Kollision
  mit einem Mini-Gegner denselben Effekt auslöst wie eine Kollision mit
  dem Hauptgegner
- Test für das Entfernen gefangener Mini-Gegner nach einem Split
  (Mini-Gegner-Position eindeutig innerhalb des eroberten Teilpolygons →
  wird aus der Liste entfernt)

## Was NICHT Teil dieses Auftrags ist
- Bonuspunkte für gefangene Mini-Gegner
- Weitere Levels mit eigenem Inhalt (nur Level 1 konkret befüllt)
- Level-Auswahl oder automatischer Level-Wechsel bei Abschluss
- Unterschiedliche Bewegungsmuster oder Spezialverhalten pro Level (nur
  Anzahl/Geschwindigkeit/Grösse als Stellschrauben)

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie `Enemy` strukturiert wurde, um Hauptgegner und Mini-Gegner
  abzudecken (gleicher Typ mit Flag, oder getrennte Typen — und warum)
- Welche Startwerte für Level 1 gewählt wurden (Anzahl/Geschwindigkeit/
  Grösse der Mini-Gegner) und ob sich das Spielgefühl beim Testen
  balanciert anfühlt
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: Bonuspunkte
  für gefangene Mini-Gegner nachrüsten, oder ein zweites Level mit
  eigenen Assets/Werten anlegen, um die Architektur zu verproben)
