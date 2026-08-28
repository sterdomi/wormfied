# Instruktion 13: Spieler-Sprite (Marienkäfer) einbinden

## Kontext
Aufbauend auf Instruktion 12 (Punkte + Explosionen, bereits umgesetzt). Der
Spieler wird bisher nur als einfacher Platzhalter (Kreis/Dreieck, aus
Instruktion 2) gerendert. Ab jetzt wird dafür das mitgelieferte
`player.svg` verwendet (liegt bereits unter `public/assets/player.svg` —
**nicht** levelspezifisch, da der Spieler-Marienkäfer über alle Level hinweg
gleich aussieht, im Gegensatz zu den Level-Assets aus Instruktion 4/10).

**Noch NICHT Teil dieses Auftrags:**
- Unterschiedliche Spieler-Skins pro Level oder Freischaltung
- Animation über reine Rotation hinaus (z.B. Flügelschlag, Lauf-Zyklus)

## Aufgaben

### 1. Asset laden

- Bestehenden Asset-Loader (`src/engine/assetLoader.ts`, Instruktion 4)
  nutzen, um `public/assets/player.svg` zu laden
- Da der Spieler nicht Teil von `LevelConfig` ist, das Laden getrennt vom
  levelspezifischen Laden anstossen (z.B. beim App-Start, einmalig, analog
  zum bisherigen Ladevorgang, einfach mit einer zusätzlichen, fest
  hinterlegten Asset-Referenz statt aus der Level-Konfiguration)

### 2. Platzhalter-Rendering ersetzen

- Bestehende Kreis-/Dreieck-Darstellung des Spielers (Instruktion 2)
  entfernen
- Stattdessen: `player.svg`-Bild an der aktuellen Spielerposition
  zentriert zeichnen
- Neue Konstante `playerSize` (Durchmesser/Kantenlänge in Pixel, ähnlich
  zu `size` bei den Gegner-Configs aus Instruktion 10) definieren, zentral
  platziert, nicht als Magic Number verstreut

### 3. Ausrichtung/Rotation

- Der Marienkäfer soll sich sichtbar in seine aktuelle Bewegungsrichtung
  drehen — sowohl während der Rand-Bewegung (Instruktion 2) als auch beim
  Reinfahren/Zeichnen (Instruktion 3)
- Aktuellen Bewegungsvektor (aus der jeweils aktiven Bewegungslogik) in
  einen Rotationswinkel umrechnen (`Math.atan2`), Canvas vor dem Zeichnen
  des Sprites um diesen Winkel rotieren (`ctx.save()` /
  `ctx.translate(...)` / `ctx.rotate(...)` / Bild zeichnen /
  `ctx.restore()`)
- **Ausrichtung des Artworks:** `player.svg` zeigt den Marienkäfer
  standardmässig nach **oben** (0°/Blickrichtung "Norden" im Bild). Da
  `Math.atan2(dy, dx)` einen Winkel liefert, bei dem 0 = "nach rechts
  zeigend" ist, muss der berechnete Bewegungswinkel um **90° (`Math.PI /
  2`)** ergänzt werden, damit "oben" im Artwork mit der tatsächlichen
  Bewegungsrichtung übereinstimmt
- Bitte trotzdem eine benannte Konstante `spriteBaseRotationOffset =
  Math.PI / 2` einführen (nicht die 90° direkt im Rotationsaufruf
  verstecken), und nach dem Einbinden im Dev-Server kurz visuell
  bestätigen, dass der Käfer korrekt in Bewegungsrichtung schaut — falls
  die Achsen doch anders herum interpretiert werden (z.B. durch
  Y-Achsen-Richtung im Canvas), den Wert entsprechend auf `-Math.PI / 2`
  korrigieren
- Falls der Spieler kurzzeitig stillsteht (z.B. exakt beim Wechsel
  zwischen Rand- und Zeichenmodus) reicht es, die zuletzt bekannte
  Bewegungsrichtung beizubehalten, statt auf 0 zurückzufallen — kurz
  kommentieren, wo dieser Zustand gehalten wird

### 4. Kollisions-Radius abgleichen

- Bestehende Kollisions-Toleranzradien, die sich auf die Spielerposition
  beziehen (aus Instruktion 7/8/11 — z.B. `checkUnshieldedPlayerCollision`,
  Projektil-Trefferprüfung), kurz mit `playerSize` abgleichen: der
  Trefferbereich sollte optisch einigermassen zur neuen Sprite-Grösse
  passen (nicht zwingend pixelgenau, aber nicht offensichtlich zu klein/
  zu gross wirken)
- Falls nötig, bestehende Radius-Konstanten anpassen und kurz begründen,
  welcher Wert gewählt wurde

### 5. Tests

- Bestehende Tests, die sich auf die (bisher rein geometrische)
  Spielerposition beziehen, sollten unverändert weiter funktionieren, da
  sich nur das Rendering ändert — bitte kurz sicherstellen, dass keine
  Tests direkt an die alte Kreis-/Dreieck-Darstellung gekoppelt waren
  (unwahrscheinlich, aber zur Sicherheit prüfen)
- Kein neuer dedizierter Test nötig für reines Rendering/Rotation (visuell
  schwer sinnvoll automatisiert zu testen) — falls eine reine
  Hilfsfunktion für "Vektor → Rotationswinkel" ausgelagert wird, dafür
  gerne 1–2 einfache Tests ergänzen

## Was NICHT Teil dieses Auftrags ist
- Levelspezifische Spieler-Skins
- Erweiterte Sprite-Animation (Flügelschlag etc.)
- Anpassung der Gegner-Hitboxen (nur die des Spielers)

## Nach Abschluss
Bitte kurz zusammenfassen:
- Welcher `spriteBaseRotationOffset`-Wert sich als korrekt herausgestellt
  hat (damit nachvollziehbar ist, wie das Artwork ausgerichtet ist)
- Welcher `playerSize`-Wert gewählt wurde und ob die Kollisions-Radien
  angepasst wurden
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt
