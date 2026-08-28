# Instruktion 14: Bonussteine

## Kontext
Aufbauend auf Instruktion 13 (Spieler-Sprite, bereits umgesetzt). Auf dem
Spielfeld erscheinen ab jetzt in regelmässigen Abständen **Bonussteine** —
kleine, kristallartige Objekte innerhalb der aktuellen Spielfläche. Werden
sie beim Einschliessen einer Fläche mit eingeschlossen (analog zu den
gefangenen Mini-Gegnern aus Instruktion 10/12), erhält der Spieler den
zugehörigen Bonus. Bleiben sie zu lange ungefangen, verschwinden sie
wieder. Der Spieler kann beim Zeichnen **nicht durch einen Bonusstein
hindurchfahren** — er wirkt wie ein festes Hindernis.

**Zwei Bonustypen für diesen Schritt:**
1. **Geschwindigkeits-Boost** — Spieler bewegt sich für einige Sekunden
   doppelt (bzw. konfigurierbar) so schnell, sowohl am Rand als auch beim
   Zeichnen
2. **Kanone** — Spieler kann für einige Sekunden kleine Gegner (nur
   Mini-Gegner, nicht den Hauptgegner) aus der Distanz eliminieren

**Neue Assets (liegen bei):** `bonus-speed.svg` (blau, Blitz-Symbol),
`bonus-cannon.svg` (orange, Fadenkreuz-Symbol). Bitte nach
`public/assets/bonuses/bonus-speed.svg` bzw.
`public/assets/bonuses/bonus-cannon.svg` legen.

## Wichtige Design-Entscheidung: Kanone + Leertaste

Die Leertaste ist bereits belegt: Halten löst das Reinfahren/Zeichnen aus
(Instruktion 3). Da für die Kanone keine neue Taste genannt wurde, wird für
diesen Auftrag folgende Lösung umgesetzt — **bitte diesen Abschnitt zuerst
lesen, das ist eine Annahme, keine feste Vorgabe:**

> Solange der Kanone-Bonus aktiv ist UND sich der Spieler im `drawing`-Modus
> befindet (er hält also ohnehin gerade die Leertaste zum Zeichnen), feuert
> die Kanone **automatisch** in regelmässigen Abständen
> (`fireIntervalSeconds`) einen Schuss in die aktuelle Bewegungsrichtung ab
> — zusätzlich zum normalen Zeichnen, keine neue Tastenbelegung nötig. Die
> Kanone ist also ein "während des Zeichnens zusätzlich aktiv"-Bonus, kein
> separat auszulösender Angriff.

Falls das nicht der Vorstellung entspricht (z.B. gezieltes, manuelles
Abfeuern statt automatisch), bitte in einer Folge-Instruktion anpassen —
diese Lösung vermeidet nur den Tastenkonflikt mit minimalem Risiko, die
bestehende Zeichenlogik zu stören.

**Noch NICHT Teil dieses Auftrags:**
- Weitere Bonustypen über die zwei genannten hinaus
- Visuelle/akustische Vorwarnung kurz bevor ein Stein verschwindet (reines
  Verschwinden reicht, optionales Fade-Out siehe Punkt 4)

## Aufgaben

### 1. Konfiguration erweitern

- `src/levels/types.ts`: `LevelConfig` um `bonusStones` erweitern:
  ```ts
  interface BonusStoneSpawning {
    spawnIntervalSeconds: number;
    maxSimultaneous: number;
    lifetimeSeconds: number;     // wie lange ein Stein sichtbar bleibt, bevor er verschwindet
    radius: number;              // für Rendering + Kollision/Hindernis
  }

  interface SpeedBoostConfig {
    assetSrc: string;
    speedMultiplier: number;     // z.B. 2.0
    effectDurationSeconds: number;
  }

  interface CannonBoostConfig {
    assetSrc: string;
    effectDurationSeconds: number;
    fireIntervalSeconds: number;
    projectileSpeed: number;
    projectileSize: number;
    projectileAssetSrc: string;  // kann kugel.svg aus Instruktion 11 wiederverwenden
  }

  interface BonusStonesConfig {
    spawning: BonusStoneSpawning;
    speedBoost: SpeedBoostConfig;
    cannon: CannonBoostConfig;
  }
  ```
  als `bonusStones: BonusStonesConfig` in `LevelConfig`
- `src/levels/level1/index.ts`: Werte für Level 1 setzen (z.B. alle 8–12
  Sekunden ein neuer Stein, max. 2 gleichzeitig, 10 Sekunden Lebensdauer,
  Geschwindigkeits-Boost 2x für 5 Sekunden, Kanone mit moderatem
  Feuerintervall für 6 Sekunden — bitte Werte wählen, die sich beim Testen
  fair/spassig anfühlen, kurz begründen)

### 2. Bonusstein-Datenmodell

- `src/game/bonusStone.ts` (neu): Typ `BonusStone { id: string; type:
  'speedBoost' | 'cannon'; position: Point; spawnedAt: number }`
- Spielzustand um `bonusStones: BonusStone[]` erweitern

### 3. Spawning

- Timer-basiert (`spawnIntervalSeconds`), solange
  `bonusStones.length < maxSimultaneous`
- Position: zufälliger Punkt **innerhalb** des aktuellen Feld-Polygons
  (`isPointInPolygon` aus Instruktion 7), mit Mindestabstand zum
  Feldrand (damit der Stein nicht direkt auf der Kante erscheint) und
  idealerweise auch Mindestabstand zu bereits existierenden Steinen —
  bitte eine sinnvolle, nicht übermässig komplizierte Platzierungslogik
  wählen (z.B. mehrere zufällige Versuche, bis eine gültige Position
  gefunden ist, mit Obergrenze an Versuchen)
- Typ (`speedBoost` vs `cannon`) zufällig gewählt (z.B. 50/50, kann später
  gewichtet werden)

### 4. Rendering + Ablauf der Lebensdauer

- Jeder aktive Bonusstein wird mit seinem jeweiligen Asset gezeichnet
  (Grösse gemäss `radius`)
- Optional, aber empfohlen: in der letzten Sekunde vor Ablauf
  (`lifetimeSeconds`) sanftes Ausblenden (Opacity von 1 auf 0), damit das
  Verschwinden nicht abrupt wirkt
- Ist `spawnedAt + lifetimeSeconds` erreicht: Stein aus `bonusStones`
  entfernen

### 5. Hindernis-Verhalten (kein Durchfahren)

- In der Zeichenbewegung (Instruktion 3): bevor eine neue Position
  während `mode === 'drawing'` übernommen wird, prüfen, ob sie einen
  aktiven Bonusstein schneiden würde (Distanz zur Steinposition <
  `radius` + kleiner Sicherheitsabstand für den Spieler)
- Falls ja: Bewegung für diesen Frame **nicht** ausführen (Spieler bleibt
  auf der letzten gültigen Position stehen) — der Stein wirkt dadurch wie
  eine feste Wand, der Spieler muss die Richtung ändern, um
  weiterzukommen
- Kurzer Kommentar im Code: einfache "Bewegung blockieren"-Lösung, keine
  Ausweich-/Gleit-Physik in diesem Schritt

### 6. Einfangen (Bonus aktivieren)

- Nach jedem erfolgreichen Polygon-Split (analog zu Instruktion 10, Punkt
  5 für Mini-Gegner): prüfen, ob sich Bonussteine innerhalb des soeben
  eroberten Teilpolygons befinden
- Falls ja: Bonus-Effekt anwenden (siehe Punkt 7/8), Stein aus
  `bonusStones` entfernen, kurzen visuellen Aufnahme-Effekt zeigen —
  bestehendes `Explosion`-System aus Instruktion 12 wiederverwenden, dafür
  `Explosion` um ein optionales `color`-Feld erweitern (Default: bisherige
  warme Farbe für Gegner-Explosionen, für Bonussteine passende Farbe je
  Typ — Blau für Speed, Orange für Kanone), damit kein komplett neues
  Effekt-System gebaut werden muss

### 7. Geschwindigkeits-Boost-Effekt

- Spielzustand um `speedBoostRemainingSeconds: number` erweitern (0 =
  inaktiv)
- Bei Aktivierung: `speedBoostRemainingSeconds =
  speedBoost.effectDurationSeconds`
- Jeden Frame: `speedBoostRemainingSeconds -= dt`, minimal 0
- Solange `speedBoostRemainingSeconds > 0`: Bewegungsgeschwindigkeit
  (Rand-Bewegung aus Instruktion 2 UND Zeichen-Bewegung aus Instruktion 3)
  wird mit `speedBoost.speedMultiplier` multipliziert — bitte an der
  Stelle ansetzen, wo die Geschwindigkeits-Konstanten aktuell verwendet
  werden, nicht die Konstanten selbst verändern (sonst bleibt der Boost
  nach Ablauf nicht sauber rückgängig)

### 8. Kanone-Effekt

- Spielzustand um `cannonRemainingSeconds: number` und
  `timeSinceLastPlayerShot: number` erweitern
- Bei Aktivierung: `cannonRemainingSeconds = cannon.effectDurationSeconds`
- Solange `cannonRemainingSeconds > 0` UND `mode === 'drawing'`: gemäss
  der Design-Entscheidung oben automatisch Schüsse abfeuern (Cooldown wie
  bei der Gegner-Feuerlogik aus Instruktion 11, aber eigene, getrennte
  Projektil-Liste, z.B. `playerProjectiles: Projectile[]`, um sie klar von
  Gegner-Projektilen zu unterscheiden)
- Schussrichtung: aktuelle Bewegungsrichtung des Spielers (gleicher Vektor
  wie für die Sprite-Rotation aus Instruktion 13 verwendet)

### 9. Kollision: Spieler-Projektile vs. Mini-Gegner

- Neue Kollisionsprüfung: `playerProjectiles` gegen `miniEnemies` (NICHT
  gegen den Hauptgegner — der bleibt unverwundbar durch Spieler-Projektile,
  da er die Eroberungs-Seite bestimmt und nicht durch Beschuss aus dem
  Spiel entfernt werden soll)
- Bei Treffer: gleicher Ablauf wie beim Einschliessen eines Mini-Gegners
  (Instruktion 12) — Explosion, Punkte gemäss
  `defaultMiniEnemyDefeatedPoints`/`scoring.miniEnemyPoints`, Mini-Gegner
  entfernen, Spieler-Projektil ebenfalls entfernen
- Bestehende Logik aus Instruktion 12 (Mini-Gegner-Bonus) wiederverwenden,
  nicht duplizieren (z.B. eigene Funktion `defeatMiniEnemy(enemy)`, die
  von beiden Stellen — Einschliessen UND Spieler-Projektil-Treffer —
  aufgerufen wird)

### 10. Tests

- `src/game/bonusStone.test.ts`:
  - Spawning respektiert `maxSimultaneous`
  - Stein wird nach `lifetimeSeconds` entfernt
  - Stein innerhalb eines eroberten Teilpolygons löst den korrekten Bonus
    aus (je einen Test für `speedBoost` und `cannon`)
- `src/game/playerMovement.test.ts` (Erweiterung):
  - Bewegung wird blockiert, wenn die Zielposition einen aktiven
    Bonusstein schneiden würde
- `src/game/collision.test.ts` (Erweiterung):
  - Spieler-Projektil trifft Mini-Gegner → Mini-Gegner wird entfernt,
    Punkte vergeben
  - Spieler-Projektil trifft Hauptgegner → **keine** Wirkung (Regression-
    Test, damit das nicht versehentlich möglich wird)

## Was NICHT Teil dieses Auftrags ist
- Weitere Bonustypen
- Manuelles/gezieltes Abfeuern der Kanone über eine neue Taste (siehe
  Design-Entscheidung oben)
- Gewichtete Spawn-Wahrscheinlichkeiten zwischen den Bonustypen

## Nach Abschluss
Bitte kurz zusammenfassen:
- Ob die automatische Kanone-Lösung (siehe Design-Entscheidung) sich beim
  Testen sinnvoll spielt, oder ob sie eher seltsam/unkontrollierbar wirkt
- Welche Werte für Level 1 gewählt wurden (Spawn-Intervall, Boost-Stärke,
  Feuerintervall) und erste Einschätzung zum Spielgefühl
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt
