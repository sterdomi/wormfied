# Instruktion 12: Punkte für besiegte Gegner + Explosionen

## Kontext
Aufbauend auf Instruktion 11 (Gegner-Projektile, bereits umgesetzt). Dieser
Auftrag löst das in Instruktion 10 offen gelassene TODO auf: Wird ein
Mini-Gegner beim Einschliessen einer Fläche "gefangen" (siehe Instruktion 10,
Punkt 5), gibt es dafür jetzt **Punkte**, und der Mini-Gegner **explodiert**
sichtbar, statt einfach kommentarlos zu verschwinden.

Zusätzlich: Wird ein **Level abgeschlossen** (Instruktion 9, `isLevelComplete`
wird `true`), explodiert auch der **Hauptgegner** (sowie alle zu diesem
Zeitpunkt noch verbliebenen Mini-Gegner) als Abschluss-Bonus, ebenfalls mit
Punktevergabe — das ist die im Original übliche "Aufräum-Bonus"-Mechanik am
Levelende.

**Kein neues Bild-Asset nötig** — die Explosion wird rein prozedural mit
Canvas-Formen gezeichnet (expandierender, ausblendender Kreis + ein paar
Partikel-Linien), kein Sprite/Bild erforderlich. Das kann später bei Bedarf
durch eine echte Animation/Sprite ersetzt werden.

**Noch NICHT Teil dieses Auftrags:**
- Soundeffekte
- Unterschiedliche Explosionsgrössen/-typen pro Gegnertyp (eine einheitliche
  Explosionsdarstellung reicht für diesen Schritt)

## Aufgaben

### 1. Punkte-Konfiguration

- `src/levels/types.ts`: `LevelConfig` um optionales Feld erweitern:
  ```ts
  interface DefeatScoring {
    miniEnemyPoints: number;
    mainEnemyPoints: number;
  }
  ```
  als `scoring?: DefeatScoring` in `LevelConfig`
- `src/game/scoring.ts`: Fallback-Konstanten definieren (z.B.
  `defaultMiniEnemyDefeatedPoints = 500`, `defaultMainEnemyDefeatedPoints =
  2000`), die verwendet werden, falls ein Level keine eigene `scoring`-
  Konfiguration mitgibt — bitte kurz kommentieren, dass das bewusst
  grössere Werte als die flächenbasierten Punkte (Instruktion 9) sind, da
  es sich um klar abgegrenzte, seltenere Erfolge handelt
- `src/levels/level1/index.ts`: `scoring`-Werte für Level 1 setzen (können
  auch einfach den Default-Werten entsprechen)

### 2. Explosions-Datenmodell

- `src/game/explosion.ts` (neu):
  - Typ `Explosion { position: Point; startTime: number; durationMs:
    number; maxRadius: number }`
  - Funktion `createExplosion(position: Point): Explosion` mit sinnvollen
    Default-Werten für Dauer (z.B. 400–600ms) und Maximalradius
  - Spielzustand um `explosions: Explosion[]` erweitern

### 3. Explosions-Rendering (rein prozedural)

- `src/engine/` oder `src/game/` (passend platzieren), Render-Funktion für
  eine `Explosion` basierend auf verstrichener Zeit seit `startTime`:
  - Äusserer Kreis: Radius wächst von 0 auf `maxRadius`, Deckkraft nimmt
    parallel dazu von 1 auf 0 ab (linear oder leicht abgefedert, keine
    aufwändige Physik nötig)
  - Ein paar (z.B. 6–8) kurze Linien/Partikel, die radial vom Zentrum nach
    aussen "wegfliegen" (Position basierend auf Fortschritt der Animation),
    ebenfalls ausblendend
  - Farbe: warmer Ton (Orange/Gelb-Rot), passend zur bereits vorhandenen
    `kugel.svg`-Farbwelt aus Instruktion 11, muss aber kein Bild-Asset
    verwenden — reines Canvas-Zeichnen (Kreise/Linien) reicht
- Abgelaufene Explosionen (Zeit seit `startTime` > `durationMs`) werden aus
  der `explosions`-Liste entfernt

### 4. Mini-Gegner-Bonus (löst TODO aus Instruktion 10 auf)

- An der Stelle aus Instruktion 10, wo ein gefangener Mini-Gegner aus
  `miniEnemies` entfernt wird:
  - Neue `Explosion` an der aktuellen Position des Mini-Gegners erzeugen
    und der `explosions`-Liste hinzufügen
  - `score += levelConfig.scoring?.miniEnemyPoints ??
    defaultMiniEnemyDefeatedPoints`
  - Den bestehenden `TODO(später)`-Kommentar aus Instruktion 10 entfernen,
    da jetzt umgesetzt

### 5. Levelabschluss-Bonus (Hauptgegner + verbliebene Mini-Gegner)

- Dort, wo `isLevelComplete` erstmals auf `true` gesetzt wird (Instruktion
  9): einmaligen "Level-Clear-Bonus"-Ablauf auslösen (bitte mit einem Guard
  absichern, dass das nur einmal passiert, nicht jeden Frame erneut,
  solange `isLevelComplete === true` bleibt — z.B. den Bonus direkt an der
  Stelle auslösen, wo der Zustand von `false` auf `true` wechselt, nicht in
  einer Dauerprüfung)
- Ablauf:
  1. Explosion an der aktuellen Position des Hauptgegners erzeugen,
     `score += scoring?.mainEnemyPoints ?? defaultMainEnemyDefeatedPoints`
  2. Für jeden zu diesem Zeitpunkt noch in `miniEnemies` verbliebenen
     Mini-Gegner: ebenfalls Explosion erzeugen und
     `miniEnemyPoints` gutschreiben (diese Mini-Gegner waren nicht durch
     Einschliessen besiegt, gelten aber beim Levelabschluss als "aufgeräumt"
     und geben den gleichen Bonus)
  3. `mainEnemy`- und `miniEnemies`-Liste können danach geleert/als besiegt
     markiert werden (sie werden ohnehin nicht mehr gerendert/bewegt, da
     der Game-Loop bei `isLevelComplete` pausiert — siehe nächster Punkt)

### 6. Wichtiger Hinweis zum Game-Loop-Freeze

- In Instruktion 9 wurde festgelegt, dass bei `isLevelComplete === true`
  keine Spieler-/Gegnerbewegung mehr verarbeitet wird. Die
  Explosions-Animationen müssen aber trotzdem weiterlaufen, damit der
  Levelabschluss-Bonus sichtbar ist, bevor das "Level Complete"-Overlay
  erscheint (oder gleichzeitig damit)
- Bitte sicherstellen, dass das Update der `explosions`-Liste (Fortschritt/
  Entfernen abgelaufener Explosionen) **nicht** durch den allgemeinen
  Freeze blockiert wird, sondern unabhängig davon weiterläuft

### 7. Rendering-Reihenfolge

- Explosionen werden nach Gegnern/Projektilen, aber vor der HUD-Ebene
  gezeichnet (damit sie gut sichtbar über dem Spielgeschehen liegen)

### 8. Tests

- `src/game/explosion.test.ts`:
  - Test: `createExplosion` liefert plausible Default-Werte
  - Test: Explosion wird nach Ablauf ihrer `durationMs` aus der Liste
    entfernt
- `src/game/scoring.test.ts` (Erweiterung):
  - Test: Gefangener Mini-Gegner erhöht `score` um den konfigurierten
    (oder Default-) Wert
  - Test: Level-Clear-Bonus wird nur **einmal** ausgelöst, auch wenn
    `isLevelComplete` über mehrere Frames hinweg `true` bleibt
  - Test: Level-Clear-Bonus vergibt Punkte für Hauptgegner UND alle zu
    diesem Zeitpunkt noch lebenden Mini-Gegner

## Was NICHT Teil dieses Auftrags ist
- Soundeffekte
- Unterschiedliche Explosionsvarianten pro Gegnertyp
- Persistenz/Highscore

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie der "nur einmal auslösen"-Guard beim Levelabschluss-Bonus umgesetzt
  wurde
- Wie sichergestellt wurde, dass Explosionen trotz Game-Loop-Freeze bei
  Levelabschluss weiterlaufen
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt
