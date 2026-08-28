# Instruktion 16: Bein-Lauf-Animation (Sprite-Swap)

## Kontext

Gegner (`gegner.svg`/`gegner-mini.svg`, Instruktion 7/10) und Spieler
(`player.svg`, Instruktion 13) sind spinnenartige Figuren mit gezeichneten
Beinen, wirken aber bisher wie eingefroren — pro Figur gibt es nur ein
einziges, statisches SVG-Sprite, das `main.ts` jeden Frame unverändert
zeichnet (nur als Ganzes rotiert, siehe `drawEnemySprite` /
`playerFacingAngle`).

Statt einer prozeduralen Bein-Animation (Gelenkwinkel pro Frame per Code
berechnet — flexibler, aber deutlich mehr Aufwand und ein Bruch mit dem
bisherigen "fertiges SVG pro Figur"-Muster) wird hier bewusst der einfachere
Weg gewählt: **Sprite-Swap zwischen zwei Bein-Posen**, im Stil eines
klassischen 2-Bild-Walk-Cycles.

**Punkt 1 (Gegner) wurde bereits ad-hoc umgesetzt** (ausserhalb des
nummerierten Instruktionsflusses, direkt im Gespräch angefragt) und wird
hier nur nachträglich dokumentiert; Punkt 2 (Spieler) zieht mit demselben
Muster nach.

## Aufgaben

### 1. Gegner (bereits umgesetzt)

- Neue Asset-Varianten `gegner-walk.svg` / `gegner-mini-walk.svg`: Kopien
  der bestehenden Sprites, Beine (Knie- und Fusspunkte, jeweils relativ zum
  fixen Hüftpunkt) Richtung Körper skaliert (~78/75 % der Originallänge) —
  Körper, Augen, Zeichnung unverändert
- `EnemyConfig` (`src/levels/types.ts`) um optionales `walkAssetSrc?:
  string` erweitert; fehlt es, wird nur `assetSrc` gezeichnet (kein
  Bein-Wechsel)
- `level1/index.ts`: `walkAssetSrc` für `mainEnemy` und
  `miniEnemies.config` gesetzt
- `assetLoader.ts`: `walkAssetSrc` wird, falls vorhanden, parallel mit den
  übrigen Level-Bildern geladen (`loadOptionalImage`, liefert `undefined`
  ohne Ladefehler, wenn kein Pfad konfiguriert ist); `LevelImages` bekommt
  `mainEnemyWalk?` / `miniEnemyWalk?`
- `main.ts`: `drawEnemySprite` bekommt zusätzlich die optionale Lauf-Pose
  und ein `useWalkFrame`-Flag, wählt danach das aktive Sprite

### 2. Spieler (neu in diesem Auftrag)

- Analoge zweite Bein-Pose `player-walk.svg` aus `player.svg` ableiten
  (gleiche Skalierungslogik wie bei den Gegnern, auf die 8
  Bézier-Kurven-Beine angewendet)
- Eigene Konstante `PLAYER_WALK_ASSET_SRC` in `main.ts` (wie
  `PLAYER_ASSET_SRC` NICHT Teil von `LevelConfig`, da levelübergreifend
  gleich, siehe Instruktion 13), parallel zum bestehenden Spieler-Sprite in
  `boot()` geladen
- Render-Aufruf des Spielers wählt wie bei den Gegnern zwischen Standbild
  und Lauf-Pose

### 3. Gemeinsamer Animations-Takt

- EIN gemeinsamer, wanduhrzeitbasierter Takt (`WALK_FRAME_INTERVAL_MS`,
  `performance.now()`) für Gegner UND Spieler — kein Zustand pro Figur
  nötig, analog zum bestehenden `damageFlashUntil`-Muster
- Bewusst nicht an die tatsächliche Bewegung (Distanz/Geschwindigkeit)
  gekoppelt: alle Figuren "wackeln" synchron im selben Takt, unabhängig
  davon, ob und wie schnell sie sich gerade bewegen

## Was NICHT Teil dieses Auftrags ist

- Prozedurale Bein-Animation (individuelle Gelenkwinkel per Code) — bewusst
  die einfachere Sprite-Swap-Variante gewählt
- Alternierender/biomechanisch korrekter Gang (z.B. Tripod-Gait bei echten
  Spinnen) — die Bein-Pose ist eine einzige zusätzliche Variante, kein
  Mehr-Phasen-Zyklus
- Kopplung der Animationsgeschwindigkeit an die tatsächliche
  Bewegungsgeschwindigkeit der Figur (z.B. schnellerer Bein-Wechsel bei
  Geschwindigkeits-Boost, Instruktion 14)
- Animation der Mini-Spinne im Logo (`wormfied-logo.svg`) — rein
  dekoratives Detail, separates Thema

## Nach Abschluss

Bitte kurz zusammenfassen:
- Wie der gemeinsame Animations-Takt gewählt wurde (Intervall,
  Begründung)
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (z.B. Kopplung an
  Bewegungsgeschwindigkeit, alternierender Gang mit mehr Phasen)
