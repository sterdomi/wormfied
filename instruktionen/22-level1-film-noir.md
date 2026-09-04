# Instruktion 22: Level 1 – Film-Noir-Redesign

> **Stand:** Punkt 1 (Spinne weiss) und Punkt 2 (weisses Projektil
> `kugel-weiss.svg`) sind umgesetzt. Finale Palette Spinne:
> Körperverlauf `#f2f2f2`→`#c7c7cc`→`#5c5c66`, Beine `#c2c2c8`
> (Highlight-Kontur `#f5f5f8`), alle Kontur-/Fangzahn-Striche `#17171d`;
> roter Augen-Glow, Sanduhr-Zeichnung und Fangzahn-Spitzen unverändert als
> einziger Farbakzent. Projektil-Verlauf `#ffffff`→`#e6e6ea`→`#b7b7c2`→
> `#7d7d8a`. Punkt 3 (`background.png`/`foreground.png`) ist ebenfalls
> ersetzt (Regen-Gasse-Motiv wie in `level1-film-noir-assets.md`
> vorgeschlagen). Zusätzlich, über die ursprüngliche Instruktion hinaus
> (Nutzer-Wunsch): Musik auf `film_noire.mp3` umgestellt, altes
> `arcade-music-loop.wav` entfernt (war nirgends sonst referenziert). `sw.js`
> → `wormfied-v40`. Punkt 4 (Regen+Blitz) ist ebenfalls umgesetzt:
> `src/levels/level1/rain.ts` (`renderLevel1Rain`), gesäte Tropfen-Parameter +
> deterministische Blitz-Zeitachse (`lightningIntensity`, 42s-Zyklus, alle
> ~6–14s ein Doppel-Zucken). Den `rng.ts`-Helfer gleich nach
> `src/levels/rng.ts` verschoben statt erneut zu duplizieren (wurde jetzt von
> Level 1, 2 UND 3 gebraucht – Level 3 importierte ihn zuvor schon
> umständlich aus `../level2/rng`). Punkt 5 (Tests) ist mit erledigt
> (`rain.test.ts`, 8 neue Tests, u.a. für `lightningIntensity`). Kein
> `sw.js`-Bump nötig – `rain.ts` ist reiner Code, kein neues Asset. Offen
> bleibt nur noch, das im Spiel/Browser gegenzuschauen (siehe „Nach
> Abschluss" unten).

## Kontext
Level 1 ist das älteste Level und optisch inzwischen das schwächste im
Vergleich zu 2–4 (Nutzer-Feedback): der Hauptgegner ist eine braune Spinne
(`gegner.svg`/`gegner-walk.svg`, Mini-Pendant `gegner-mini(-walk).svg`,
gleiche Verlaufsfarben `#5a4030`/`#2e1f16`/`#120b07`), `background.png` ist
nur der generische Platzhalter-Farbverlauf (den sich aktuell noch alle Level
teilen, siehe unten) und `foreground.png` ein schlichtes hellblaues
Spinnennetz.

**Ziel:** Level 1 in eine **Film-Noir-Atmosphäre** tauchen – Spinne weiss statt
braun, Hintergrund/Vordergrund als düstere Regen-Gassen-Szene, dazu Regen und
gelegentliche Blitze als Ambiente-Effekt. Rein visuelles Redesign, keine
Änderung an Spielmechanik/Balancing.

**Wie Hintergrund/Vordergrund technisch funktionieren** (wichtig für Punkt 2):
`background.png` wird 1:1 auf `FIELD_WIDTH×FIELD_HEIGHT` (960×540) gezeichnet
(`main.ts`, `ctx.drawImage(assets.background, 0, 0, FIELD_WIDTH,
FIELD_HEIGHT)`) und zusätzlich weichgezeichnet/abgedunkelt als Letterbox-
Backdrop verwendet (`getBackdrop()`) – es ist die meiste Zeit unter dem
Foreground verdeckt und blitzt nur durch bereits ausgeschnittene Stellen.
`foreground.png` liegt sichtbar obendrauf und wird beim Spielen entlang der
gezogenen Linie **ausgeschnitten** (`createForegroundLayer`,
`globalCompositeOperation='destination-out'`) – es MUSS deshalb auch in
Fetzen/Fragmenten gut aussehen: gleichmässige Dichte, kein einzelner
Blickfang, keine Vignette, kein Rahmen, voll deckend (siehe bereits gelöste
Anforderung an `level4/foreground.png`).

Level 2 hat als Präzedenzfall bereits einen rein dekorativen Wetter-/Ambiente-
Überzug: `LevelConfig.renderDecoration` (`types.ts`), gezeichnet NACH dem
Foreground und VOR der Spiel-Ebene, zustandslos aus `state.now` (siehe
`src/levels/level2/water.ts` + `bubbles.ts`, gesäter `mulberry32`-PRNG in
`src/levels/level2/rng.ts` für feste Parameter). Regen + Blitz für Level 1
sollten nach demselben Muster gebaut werden.

Bild-Prompts für die neuen `background.png`/`foreground.png` stehen in
[`level1-film-noir-assets.md`](./level1-film-noir-assets.md) – **kein**
Prompt für die Spinne, die wird direkt per Farb-Edit umgesetzt (Punkt 1).

## Aufgaben

### 1. Spinne weiss (direkter Code-Edit, kein Bildgenerator)
In `public/assets/levels/level1/gegner.svg`, `gegner-walk.svg`,
`gegner-mini.svg`, `gegner-mini-walk.svg`: die gemeinsame Körper-
Verlaufsfarbe (`bodyGrad`/`miniBodyGrad`: `#5a4030` → `#2e1f16` → `#120b07`)
sowie die Bein-/Kontur-Farben (`#5a4a3a`, `#8a7660`, `#0a0603` etc.) auf ein
**weisses/helles Grau** umstellen (z.B. hell → mittel → fast-schwarz-Kontur,
Werte beim Testen im Spiel gegenfarben). Geometrie/Pfade NICHT anfassen, nur
Farbwerte. Empfehlung: den roten Augen-Glow (`eyeGlow`/`miniEyeGlow`,
`#ffe066`→`#e63946`) UND die Sanduhr-Zeichnung auf dem Hinterleib als
**einzigen Farbakzent** stehen lassen (klassischer Film-Noir-Trick: eine
gesättigte Farbe in einem sonst entsättigten Bild) – im Spiel gegentesten, ob
das gegen den neuen Hintergrund gut lesbar bleibt. Alle vier SVGs müssen
dieselbe neue Palette verwenden.

### 2. Neues Projektil (weiss) – NICHT `kugel.svg` anfassen
`kugel.svg` (gelb-orange Glüh-Kugel) wird levelübergreifend geteilt – Level 4
(`level4/index.ts`) UND der Kanonen-Bonusstein aller Level
(`defaultBonusStones.ts`) referenzieren dieselbe Datei. Für Level 1 deshalb
**nicht** `kugel.svg` selbst ändern, sondern eine neue Datei
`public/assets/projectiles/kugel-weiss.svg` anlegen: exakt dieselbe Form/
Geometrie (äusseres Glühen + Kugelkörper + Glanzpunkt, `viewBox 0 0 40 40`),
nur die Farbverläufe auf Weiss/Hellgrau umgestellt (statt
`#fff9c4`→`#ffd60a`→`#f77f00`→`#c1440e` z.B. `#ffffff`→`#e8e8ec`→`#b8bcc4`
o.ä., Kontur/Glow entsprechend entsättigt) – im Spiel gegentesten, dass das
Projektil vor dem neuen dunklen Hintergrund gut sichtbar bleibt. Danach in
`src/levels/level1/index.ts` NUR
`mainEnemy.shooting.projectileAssetSrc` auf den neuen Pfad umstellen; der
Spieler-Kanonen-Bonusstein bleibt levelübergreifend bei `kugel.svg`
(`defaultBonusStones.ts` gehört nicht zu diesem Auftrag).

### 3. Neue `background.png` / `foreground.png`
Mit den Prompts aus `level1-film-noir-assets.md` generieren, dann unter den
bestehenden Pfaden `public/assets/levels/level1/background.png` bzw.
`foreground.png` ablegen (Dateiname/Pfad bleibt gleich, nur Bildinhalt neu).

Empfohlene Auflösung **1920×1080** (16:9) für beide – das bisherige
`background.png` ist ein 512×512-Quadrat und wird dadurch beim Rendern
sichtbar non-uniform auf 960×540 gestreckt (die Diagonalstreifen wirken
verzerrt); mit einer nativen 16:9-Quelle verschwindet dieser Nebeneffekt
gleich mit.

### 4. Regen + Blitz als neue `renderDecoration`
Neues Modul `src/levels/level1/rain.ts`, analog zu `level2/water.ts`:

- **Regen**: viele kurze, leicht schräge, halbtransparente Striche, die von
  oben nach unten über das Feld fallen. Parameter je Tropfen (x-Startposition,
  Länge, Fallgeschwindigkeit, Deckkraft, Phasenversatz) einmalig über einen
  gesäten `mulberry32`-PRNG erzeugt (reproduzierbar, testbar), Position pro
  Frame **zustandslos** aus `state.now` berechnet (`y = (now * speed +
  phase) % (height + länge)`, modulo-Wrap wie die Level-2-Deko) – kein
  `update()`/Teardown nötig, passt zum bestehenden `LevelDecorationRenderer`-
  Vertrag. Dichte/Geschwindigkeit im Spiel gegentesten (spürbar Regen, aber
  Spielfeld weiter gut lesbar – Priorität liegt klar bei der Spielbarkeit).
- **Blitz**: seltener, kurzer weisser Flash über das GANZE Feld (einfaches
  `ctx.fillRect` mit Deckkraft-Kurve über die Zeit statt Sprite/Bild) – alle
  ~6–14 s, Dauer ~150–250 ms, gerne mit einem kurzen Doppel-Zucken statt
  einer einzelnen Kurve (wirkt eher wie ein echter Blitz). Zeitpunkte
  ebenfalls deterministisch aus dem gesäten PRNG vorab als feste Zeitachse
  berechnen (nicht `Math.random()` pro Frame) – reproduzierbar bei jedem
  Levelstart, testbar ("bei t=X aktiv, bei t=Y nicht").
- Kleinen `src/levels/level1/rng.ts` mit `mulberry32`/`lerp`/`clamp01`
  anlegen ODER (sauberer, da jetzt zum zweiten Mal gebraucht) den
  bestehenden `level2/rng.ts`-Helfer nach `src/levels/rng.ts` verschieben und
  von beiden Levels importieren – bitte kurz abwägen und die Wahl im
  Abschluss-Kommentar begründen.

`src/levels/level1/index.ts`: neues `renderDecoration: renderLevel1Weather`
eintragen (Name frei wählbar, an `renderLevel2Water` angelehnt).

### 5. Tests
Mindestens ein Test für `renderLevel1Weather`, der mit ein paar `now`-Werten
aufruft und prüft, dass er nicht wirft (Canvas-Mock wie in den bestehenden
Level-Tests, falls vorhanden – kurz nachsehen, welches Test-Setup Level 2
dafür schon nutzt). Zusätzlich gezielte Tests für die Blitz-Zeitachsen-
Funktion (ausgelagert, reine Funktion `now → intensity`), z.B. "kein Blitz
kurz nach Levelstart", "ein erzeugter Blitz-Zeitpunkt liefert Intensität >
0".

### 6. Service Worker
`sw.js`: `CACHE_NAME` hochzählen und die neue `kugel-weiss.svg` in
`CORE_ASSETS` aufnehmen (Cache-Busting für `background.png`/`foreground.png`
unter gleichem Dateinamen, plus das neue Projektil-Asset) – wie bei den
bisherigen Level-2-Asset-Wechseln (siehe `level2-prep`-Historie, dort
jeweils `CACHE_NAME` hochgezählt statt Dateien umzubenennen).

## Was NICHT Teil dieses Auftrags ist
- Musiktrack ist mittlerweile getauscht (`film_noire.mp3`, siehe Stand oben) –
  aber kein Donner-Sound zum Blitz, kein sonstiges neues Sound-Design (falls
  gewünscht, eigener Folgeauftrag).
- `kugel.svg` selbst bleibt unverändert (weiterhin von Level 4 und dem
  Kanonen-Bonusstein genutzt) – Level 1 bekommt eine eigene neue Datei,
  siehe Punkt 2.
- Level 2/3/4 unberührt.
- Keine neue Spiellogik/kein neues Gameplay-Verhalten – Blitz/Regen sind rein
  dekorativ, beeinflussen keine Kollision/Sichtbarkeit von Spielelementen.
- Kein automatisches Donner-Timing an den Blitz gekoppelt (Sound-Sync wäre
  ein eigener Schritt).

## Nach Abschluss
Kurz zusammenfassen: gewählte Palette für die weisse Spinne (finale Hex-
Werte), Entscheidung rng.ts duplizieren vs. teilen, und ob die neue
16:9-Hintergrund-Auflösung die Streifen-Verzerrung tatsächlich behoben hat.
Vor dem Mergen bitte der Nutzer selbst kurz im Browser gegenschauen (siehe
Team-Konvention: kein automatisches Screenshot-Verifizieren durch Claude) –
v.a. Regen-Dichte/Blitz-Timing sind Geschmackssache und eher iterativ per
Feedback zu justieren als beim ersten Wurf zu treffen.
