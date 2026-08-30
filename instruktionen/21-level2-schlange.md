# Instruktion 21: Level 2 – Schlangen-Gegner

> **Hinweis (nachträglich):** Die Snake-Form wurde beim Umsetzen mehrfach
> umgeworfen. Der aktuelle Stand: Kopf = Level-2-Drache (`gegner.svg` /
> `gegner-walk.svg`), die **drei Mini-Gegner selbst** sind die Körperglieder
> (`gegner.svg` bei 75 %) und folgen dem Kopf auf dem Trail –
> `snakeBody.ts` positioniert sie pro Frame. Einkesseln/Abschiessen eines
> Glieds verkürzt die Kette. Die unten beschriebenen `snake_head_*` /
> `snake_body_*` / `snake_tail`-Assets und `extraEnemySprites` sind **nicht
> mehr aktuell**; die Kopf-Bewegung (`snakeMovement.ts`) und das
> `boot()`-/`LevelConfig`-Gerüst gelten weiter.

## Kontext
Aufbauend auf Instruktion 20 (Vollbild/PWA, bereits umgesetzt) und auf den
Vorbereitungs-Refactorings für Level 2, die inzwischen gelandet sind
(Level-Fortschritt-Gerüst mit `start()`/`boot()`, `LevelCarryOver`,
`level.updateEnemies()` als Gegenstück zu `level.renderEnemies()`,
Bewegungsmuster-Zustand raus aus `Enemy` → `RandomWalkState` in
`enemyMovement.ts`, in Level 1 über eine `WeakMap<Enemy, …>` gehalten).

Bisher gibt es genau **ein** befülltes Level (`src/levels/level1/`). Dieser
Auftrag legt **Level 2** an und gibt ihm seinen eigenen Gegnertyp: eine
**Schlange**. Sie besteht aus einem animierten Kopf, einer kurzen
Körperkette (ein grünes, ein rotes Segment) und einem Schwanz, und bewegt
sich schlangenartig (die Segmente folgen dem Kopf). Zusätzlich gibt es –
wie in Level 1 – **Mini-Gegner**, hier einzelne grüne bzw. rote
Körpersegmente.

**Assets liegen bereits bei** unter `public/assets/levels/level2/`:
- `snake_head_closed.svg` / `snake_head_open.svg` – Kopf, geschlossenes
  und offenes Maul (wechseln sich für die Animation ab). viewBox
  `0 0 140 130`; Schnauze/Nasenloch bei x≈110 – der Kopf zeigt im Sprite
  nach **rechts** (+x).
- `snake_body_green.svg` / `snake_body_red.svg` – Körpersegmente, viewBox
  `0 0 100 100`.
- `snake_tail.svg` – Schwanz-Endsegment, viewBox `0 0 100 100`.

**Reihenfolge der Schlange:** Kopf → `snake_body_green` →
`snake_body_red` → `snake_tail`. Die weiteren `snake_body_green` /
`snake_body_red` im Feld sind die Mini-Gegner.

**Wichtiger Hinweis zum Git-Zustand:** Die Kopf-Assets wurden im
Working Tree bereits von `snake_head_*_left.svg` auf `snake_head_*.svg`
umbenannt, im Index liegen aber noch die alten `_left`-Namen als
`A`-Einträge. Bitte den Index angleichen (die veralteten gestageten
Kopien entfernen, die aktuellen Dateinamen stagen), sodass am Ende genau
die fünf oben genannten Dateien versioniert sind.

## Aufgaben

### 1. Level-Package `src/levels/level2/`

Analog zu `src/levels/level1/`:
```
src/levels/level2/
  index.ts        # exportiert das LevelConfig-Objekt für Level 2
  render.ts       # renderLevel2Enemies (erfüllt LevelEnemyRenderer)
  behavior.ts     # updateLevel2Enemies (erfüllt LevelEnemyUpdater)
  snakeMovement.ts# Kopf-Bewegung (schlangenartig, im Feld gehalten)
  snakeBody.ts    # Körperkette (Trail + Segment-Platzierung), von
                  # behavior.ts UND render.ts genutzt
  *.test.ts       # siehe Punkt 12
```
- `src/levels/index.ts`: `level2` importieren und ans `levels`-Array
  anhängen (`levels: LevelConfig[] = [level1, level2]`). Nach Abschluss
  von Level 1 (Levelabschluss + Enter) muss Level 2 also **tatsächlich
  spielbar** starten – bitte end-to-end durchspielen.

### 2. `boot()`: Bilder + Musik des AKTIVEN Levels laden

- `main.ts` lädt heute in `boot()` fest `levels[0]` (`// TODO(Level 2):
  Levelbilder + Musik pro Level laden …`, um Zeile 1400). Diesen TODO
  auflösen: Beim Betreten eines Levels die Bilder (`loadLevelImages`) und
  ggf. `musicSrc` **dieses** Levels laden, nicht mehr fest die von Level
  1. Einfachster Ansatz: das Laden in die `boot()`-Schleife ziehen (pro
  Level einmal, Ergebnis kurz cachen, damit ein wiederholtes Level nicht
  neu lädt) – Umsetzung frei, Hauptsache Level 1 verhält sich exakt wie
  bisher.
- Level 2 hat (noch) keine eigene Musik → `musicSrc` weglassen, es bleibt
  still. Kein Ladefehler wegen fehlender Datei.

### 3. Kopf = `mainEnemy`, Maul-Animation über Sprite-Swap

- Der Schlangenkopf belegt den bestehenden `mainEnemy`-Slot der
  `LevelConfig` (keine Struktur­änderung, siehe Punkt 4). Damit bleiben
  alle Hauptgegner-Mechaniken unverändert an ihn geknüpft: er bestimmt
  beim Polygon-Split die eroberte Seite (`applyCompletedLine(field,
  linePoints, mainEnemy.position)`), er bekommt den Einkesselungs-
  Schrumpf (`mainEnemyScale`, `enemyEncirclement.ts`) und er wird beim
  Levelabschluss ausgeblendet (`hideMainEnemy`).
- Maul auf/zu: die bestehende Zwei-Bild-Mechanik wiederverwenden –
  `mainEnemy.assetSrc = '/assets/levels/level2/snake_head_closed.svg'`,
  `mainEnemy.walkAssetSrc = '/assets/levels/level2/snake_head_open.svg'`.
  Der Renderer schaltet bereits anhand von `state.useWalkFrame` (dem
  gemeinsamen `WALK_FRAME_INTERVAL_MS`-Takt aus `main.ts`) zwischen
  `assetSrc` und `walkAssetSrc` um – das ergibt das „Schnappen" gratis.
- Falls sich der gemeinsame Lauf-Takt fürs Maul unpassend schnell/langsam
  anfühlt: **in diesem Schritt so lassen** und als
  `// TODO(später): eigener Maul-Takt` vermerken, keinen zweiten Timer
  einbauen.

### 4. Schlangenkörper als level-interne Kette (KEINE zentrale Änderung)

Der zentrale Gegner-Zustand bleibt `mainEnemy: Enemy` + `miniEnemies:
Enemy[]` (die im Refactor-Plan angedachte Verallgemeinerung zu einem
echten „Gegner-Set" bleibt offen – hier nur so weit gehen, wie die
Snake-Form es zwingend braucht). Der Körper lebt **ausschliesslich im
Level-2-Package**:

- `snakeBody.ts`: ein Zustandstyp `SnakeBody` mit
  - einem **Breadcrumb-Trail** der letzten Kopf-Positionen (Liste von
    `Point`, nach Weglänge begrenzt),
  - der festen Segmentliste `['green', 'red', 'tail']` mit je einem
    Ziel-Abstand (Bogenlänge) hinter dem Kopf,
  - dem Abbiege-Zustand der Kopf-Bewegung (Punkt 5) – oder dieser liegt in
    einem Geschwister-Typ; jedenfalls **nicht auf `Enemy`** (vgl. den
    Docstring in `enemy.ts`, der genau diesen Fall – „Snake-Abbiegetakt" –
    als level-lokalen Zustand nennt).
- Gehalten in einer modul-lokalen `WeakMap<Enemy, SnakeBody>` mit
  `mainEnemy` als Key – **exakt das Muster von Level 1** (`walkStates` in
  `level1/behavior.ts`): ein bei `rebuildField` frisch erzeugter
  `mainEnemy` bekommt beim ersten Frame automatisch einen frischen
  `SnakeBody`, der alte wird mitsamt Eintrag vom GC eingesammelt. Kein
  Lebenszyklus-Code in `main.ts`.
- Das Modul `snakeBody.ts` exportiert sowohl die Fortschreibe-Funktion
  (für `behavior.ts`) als auch einen Lese-Zugriff auf die aktuellen
  Segment-Positionen/-Winkel (für `render.ts`). `render.ts` bekommt über
  `LevelEnemyRenderState` nur `mainEnemy` – die Segmente holt es sich aus
  demselben `WeakMap`-Modul.
- **Segment-Platzierung:** jedes Frame, nachdem der Kopf bewegt wurde,
  die neue Kopf-Position vorne an den Trail anhängen, Trail auf
  Maximallänge kappen, dann jedes Segment auf seinen Ziel-Abstand entlang
  des Trails setzen (zwischen zwei Breadcrumbs interpolieren). Abstand ≈
  Segmentgrösse (satt aneinander, aber nicht überlappend – beim Testen
  feinjustieren).
- **Erstes Frame** (Trail noch leer): alle Segmente knapp hinter dem Kopf
  stapeln (entlang `-kopfRichtung`), damit sie nicht aus dem Ursprung
  `(0,0)` „hereinfliegen".

### 5. Kopf-Bewegung: schlangenartig, im Feld gehalten

Der Kopf nutzt **nicht** `moveEnemy`/`moveEnemies` (das ist die
achsparallele, erratische Lauf-Bewegung von Level 1). Neu in
`snakeMovement.ts`:

- Der Kopf läuft kontinuierlich in Richtung eines Heading-Einheitsvektors
  mit `mainEnemy.speed` (delta-time-basiert).
- **Abbiegetakt:** in Intervallen (mit etwas Zufalls-Jitter, damit es
  nicht mechanisch wirkt) ein neues Ziel-Heading wählen = aktuelles
  Heading um einen zufälligen, begrenzten Winkel gedreht. Zwischen den
  Takten dreht der Kopf mit einer **maximalen Drehrate pro Sekunde** aufs
  Ziel-Heading zu – dadurch kurvt die Schlange weich statt abrupt
  abzuknicken. Keine Achs-Beschränkung wie bei `randomDirection`
  (Diagonalen sind hier erwünscht).
- **Im Feld bleiben:** die nächste Kopf-Position mit
  `fitsInPolygon(nextPos, field, enemyMovementMargin(mainEnemy))` prüfen
  (beide Helfer aus `enemyMovement.ts` sind exportiert). Passt sie nicht,
  vom Rand wegdrehen: ein paar Kandidaten-Headings testen (aktuelles ±
  wachsende Winkel, zuletzt Kehrtwende) und das erste nehmen, das passt.
  Findet sich keins, als Fallback – analog zu `moveEnemy` – die Richtung
  mit dem grössten echten Abstandsgewinn zum Rand nehmen; hilft auch das
  nicht, diesen Frame stehen bleiben. Ein Feld-Split kann den Rand
  schlagartig nah an den Kopf rücken – der „Abstandsgewinn"-Fallback muss
  den Kopf da genauso zuverlässig wieder herausführen wie bei Level 1.
- **Ausrichtung des Sprites:** `enemyFacingAngle(direction)` nimmt an, das
  Sprite zeige lokal nach **oben** `(0, -1)`. Der Schlangenkopf zeigt im
  SVG nach **rechts** `(+1, 0)` – also `atan2(dir.y, dir.x)` statt
  `enemyFacingAngle`. Die „Vorne"-Richtung pro Sprite-Art an EINER Stelle
  als Winkel-Offset halten (`SPRITE_FORWARD_OFFSET`), damit ein späterer
  Art-Umbau (z.B. Kopf gespiegelt) ein Einzeiler bleibt. Der Schwanz-SVG
  hat sein Anschlussende bei x=0 und die Spitze bei x=100 → Offset `+π`
  (Anschlussende zeigt kopfwärts). Körper- und Schwanz-Segmente entlang
  der lokalen Trail-Tangente ausrichten (Richtung vom Segment zum
  nächst-inneren Breadcrumb).

### 6. Mini-Gegner: einzelne grüne/rote Segmente

- `miniEnemies.count` für Level 2 z.B. **4**. Sie behalten die
  **geteilte** erratische Bewegung (`moveEnemies` + `RandomWalkState` in
  einer `WeakMap`, wie in `level1/behavior.ts`) – **keine**
  Snake-Bewegung für Mini-Gegner in diesem Schritt.
- Rendering: abwechselnd `snake_body_green` / `snake_body_red` nach Index
  (`i % 2`). Beide Sprites müssen dem Renderer zur Verfügung stehen
  (Punkt 7).
- Sie lösen wie gehabt dieselben Kollisionen aus wie in Level 1
  (aktive Linie / Spieler auf dem Rand) – das läuft bereits zentral über
  `[mainEnemy, ...miniEnemies]`, hier ist nichts zu tun.
- Mini-Gegner beeinflussen den Polygon-Split weiterhin **nicht**.

### 7. Zusätzliche Sprites in die Asset-Pipeline

Der Renderer braucht drei Bilder mehr, als `LevelEnemyAssets` heute
bereitstellt (`mainEnemy`/`mainEnemyWalk`, `miniEnemy`/`miniEnemyWalk`):
`snake_body_green`, `snake_body_red`, `snake_tail`. Diese müssen im
Ladebildschirm **mit abgewartet** werden (kein Nachladen-Flackern im
ersten Frame).

**Empfohlener minimaler, generischer Weg:**
- `LevelConfig` um ein optionales `extraEnemySprites?: Record<string,
  string>` (logischer Name → Pfad) erweitern.
- `loadLevelImages` (`engine/assetLoader.ts`) lädt diese Map mit und legt
  sie als `LevelImages.extraEnemySprites?: Record<string,
  HTMLImageElement>` ab; `LevelEnemyAssets` bekommt dasselbe optionale
  Feld, `main.ts` reicht sein `assets`-Objekt unverändert durch (wie
  heute).
- Level 2 deklariert `extraEnemySprites: { bodyGreen, bodyRed, tail }`.
  Die zwei Kopf-Posen bleiben in `mainEnemy.assetSrc`/`.walkAssetSrc`;
  `miniEnemies.config.assetSrc` zeigt auf `snake_body_green` (die
  Pflicht-`miniEnemy`-Textur), der Renderer holt sich `bodyRed` für
  ungerade Indizes aus der Map.
- Namen **generisch** halten (`extraEnemySprites`, nicht `snakeBody…`),
  damit der zentrale Code level-agnostisch bleibt.

Zulässige Alternative, falls bevorzugt: das Level-2-Package lädt seine
drei Sprites selbst vor und stellt ein `Promise` bereit, das `boot()`
abwartet. Bitte die getroffene Wahl kurz begründen.

### 8. `render.ts`: `renderLevel2Enemies`

- Erfüllt `LevelEnemyRenderer`, wird pro Frame über `level.renderEnemies`
  aufgerufen.
- Wenn `!hideMainEnemy`: die Schlange **von hinten nach vorne** zeichnen
  (Schwanz → rot → grün → Kopf), damit der Kopf den „Hals" überdeckt.
  Jedes Segment mit seinem Sprite an Segment-Position/-Winkel aus
  `snakeBody.ts`, skaliert auf seine konfigurierte Grösse.
- `hideMainEnemy` (Levelabschluss) blendet die **ganze** Schlange aus
  (Kopf + Körper + Schwanz), damit sie geschlossen mit der
  Hauptgegner-Explosion verschwindet.
- `mainEnemyScale` (Einkesselungs-Schrumpf) in diesem Schritt **nur auf
  den Kopf** anwenden; Körper/Schwanz folgen nur der Position. Kurz
  kommentieren, dass ein mitschrumpfender Körper später nachgezogen
  werden kann.
- Danach die Mini-Gegner (Punkt 6).
- Der pulsierende Augen-Glow aus `level1/render.ts` (`EyeSpot`-Werte) ist
  artwork-spezifisch. Für Level 2 entweder frische `EyeSpot`s aus
  `snake_head_*.svg` ableiten (empfohlen, kleiner Aufwand, hält den Look
  konsistent) **oder** den Glow für diesen Schritt weglassen – in beiden
  Fällen level-lokal halten, nicht nach `visualEffectsConfig.ts` ziehen.

### 9. `behavior.ts`: `updateLevel2Enemies`

- Erfüllt `LevelEnemyUpdater`, Aufruf pro Frame über
  `level.updateEnemies(...)` (nur wenn nicht eingefroren).
- Reihenfolge: (1) Kopf schlangenartig bewegen (`snakeMovement.ts`),
  (2) Körperkette fortschreiben (`snakeBody.ts`), (3) Mini-Gegner mit
  `moveEnemies` bewegen.
- Schiessen: für Level 2 in diesem Schritt **keiner** schiesst
  (`mainEnemy.shooting`/`miniEnemies.config.shooting` weglassen) – hält
  den Level-Einstieg lesbar. Die Funktion gibt entsprechend `[]` zurück.
  Als `// TODO(später): Kopf spuckt (snake_head_open als Spuck-Frame)`
  vermerken.
- Mutiert die Gegner aus dem Kontext in place (wie Level 1).

### 10. Level-2-Config-Werte (`index.ts`)

Platzhalter, wo Artwork fehlt – klar als solche kommentieren:
- `backgroundSrc`/`foregroundSrc`: vorerst die **Level-1-PNGs**
  wiederverwenden (`// TODO(später): eigenes Level-2-Artwork`), finales
  Bild-Design ist eine spätere Instruktion.
- Kopf: `speed` ~ wie Level-1-Hauptgegner (240) oder leicht höher; `size`
  ~120–140. Körpersegment `size` ~90–100, Schwanz ~80, Segment-Abstand so
  gewählt, dass die Kette verbunden wirkt (beim Testen justieren, Wahl
  kurz im Code begründen – analog zum Kommentar in `level1/index.ts`).
- Mini-Gegner: `count` 4, `size` ~40, `speed` ~ wie Level-1-Mini (240).
- `bonusStones`: vorerst den Block aus `level1/index.ts` unverändert
  übernehmen (`// TODO(später): Level-2-Balancing`).
- `scoring` / `shieldDecayPerSecond`: wie Level 1 / Defaults, explizit
  gesetzt (wie in `level1/index.ts`).
- Docstring am `level2`-Objekt im Stil von `level1/index.ts`: welche
  Werte warum gewählt wurden.

### 11. Schlangenkörper-Kollision – bewusste Abgrenzung

Die zentrale Linien-/Spieler-Kollision läuft über `allEnemies =
[mainEnemy, ...miniEnemies]` (`main.ts` um Zeile 876). Die
Körper-/Schwanz-Segmente stehen **nicht** in diesem Array – sie sind in
dieser Instruktion also **sichtbar, aber nicht gefährlich**: nur der Kopf
und die freien Mini-Segmente schaden dem Spieler.

Beim Aufbau der Körperkette vermerken:
```
// TODO(Instruktion 22+): Schlangenkörper-Segmente sollten die aktive
// Linie / den Spieler ebenfalls treffen können – braucht einen
// generischen „zusätzliche Gefahrenpunkte pro Level"-Haken in der
// zentralen Kollision (Refactor-Plan „Gegner-Set"), und die Andock-/
// Wachs-Mechanik (nächste Instruktion) legt Länge/Verlauf des Körpers
// ohnehin erst fest.
```
Falls beim Umsetzen ein sauberer, kleiner generischer Haken dafür
auffällt: als Vorschlag im Abschlussbericht festhalten, aber in diesem
Schritt nicht mehr einbauen.

### 12. Tests

- `src/levels/levelConfig.test.ts` (Erweiterung): `levels` enthält
  `level2`; dessen Config ist plausibel (`miniEnemies.count > 0`, Kopf
  hat `assetSrc` **und** `walkAssetSrc`, `extraEnemySprites` enthält die
  drei erwarteten Keys).
- `src/levels/level2/snakeMovement.test.ts`:
  - Der Kopf bleibt über viele Frames innerhalb eines einfachen Rechteck-
    Polygons.
  - Ein Schritt, der aus dem Polygon führen würde, resultiert in einer
    Heading-Änderung (Kopf bleibt drin).
  - Die Drehrate ist begrenzt (Heading-Delta pro Frame ≤ Maximum).
- `src/levels/level2/snakeBody.test.ts`:
  - Bei bekanntem Kopf-Trail sitzen die Segmente auf den konfigurierten
    Bogenlängen-Abständen.
  - Erstes Frame: Segmente hinter dem Kopf gestapelt, nicht bei `(0,0)`.
  - Der Trail wird auf Maximallänge gekappt.
- `src/levels/level2/behavior.test.ts`: `updateLevel2Enemies` bewegt in
  **einem** Aufruf Kopf **und** Körper, mutiert in place, gibt `[]`
  zurück (niemand schiesst); Mini-Gegner bewegen sich über die geteilte
  `moveEnemies`-Funktion.

## Was NICHT Teil dieses Auftrags ist
- **Andocken/Wachsen der Schlange** – dass sich Mini-Segmente mit der
  Schlange verbinden und sie länger wird. Nächste Instruktion.
- **Neue Spieler-Waffe** (3-fach Dauer-Laser für Level 2) – eigene
  Instruktion (siehe Vorbereitungs-Plan). Der Spieler behält in Level 2
  vorerst die bestehende Bewaffnung/Bonussteine.
- **Finales Level-2-Artwork** (Background/Foreground) und **Level-2-
  Musik** – vorerst Platzhalter bzw. still.
- **Schlangenkörper als Kollisionsgefahr** – nur TODO (Punkt 11).
- **Vollständige Verallgemeinerung** von `mainEnemy + miniEnemies[]` zu
  einem echten „Gegner-Set" – nur so weit, wie die Snake-Form es zwingend
  braucht (Kopf = `mainEnemy`, Körper level-intern).
- **Gegner-Schiessen in Level 2** – in diesem Schritt bewusst aus.

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie die Körperkette modelliert ist (Trail + Bogenlängen-Segmente,
  `WeakMap<Enemy, SnakeBody>`) und wie `behavior.ts` und `render.ts` sich
  denselben Zustand teilen.
- Wie die schlangenartige Kopf-Bewegung im Feld-Polygon gehalten wird
  (Abbiegetakt, maximale Drehrate, Rand-Ausweichen, Split-Fallback).
- Welcher Weg für die drei Extra-Sprites gewählt wurde
  (`extraEnemySprites`-Map vs. package-eigenes Vorladen) und warum.
- Wie `boot()` jetzt die Bilder/Musik des aktiven Levels lädt und dass
  Level 1 unverändert läuft.
- Welche Startwerte Level 2 bekommen hat (Kopf/Segmente/Mini-Gegner) und
  wie sich die Schlange beim Testen anfühlt (verbundene Kette? weiches
  Kurven? Maul-Animation?).
- Ob und warum von obigen Vorgaben abgewichen wurde.
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: Andock-/
  Wachs-Mechanik der Schlange, danach die Level-2-Spieler-Waffe).
