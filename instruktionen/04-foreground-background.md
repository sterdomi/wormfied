# Instruktion 4: Foreground/Background-Bilder + visuelles Ausschneiden

## Kontext
Aufbauend auf Instruktion 3 (Reinfahren/Linie zeichnen, bereits umgesetzt und
mit eigenen Anpassungen gepusht). Ab jetzt bekommt das Spielfeld zwei Bild-
Ebenen:

- **Background**: liegt unter allem, wird sichtbar, sobald der Foreground an
  einer Stelle entfernt wurde
- **Foreground**: liegt über dem Background, deckt das Spielfeld initial
  komplett ab

Beide Bilder werden später **pro Level** bereitgestellt (unterschiedliche
Motive je Level) — für diesen Schritt reichen Platzhalter-Bilder.

**Kernmechanik dieses Schritts:** Während der Spieler im `drawing`-Modus ist
(aus Instruktion 3) und sich ins Feld hineinbewegt, wird der **befahrene
Pfad** direkt aus dem Foreground ausgeschnitten — der Background wird an
dieser Stelle sichtbar. Das ist zu diesem Zeitpunkt ein rein visueller Effekt
entlang des gefahrenen Pfads (mit einer gewissen Breite), **nicht** die
tatsächliche geometrische Flächenberechnung des eingeschlossenen Bereichs —
die kommt erst in Instruktion 5 und wird das Ausschneiden dann exakt auf
Basis des berechneten Polygons vornehmen (inkl. korrekter Behandlung dessen,
was beim Loslassen der Leertaste passiert).

**Noch NICHT Teil dieses Auftrags:**
- Geometrische Flächenberechnung / Erkennung, welcher Teil "eingeschlossen"
  ist
- Exaktes, polygon-basiertes Ausschneiden (dieser Schritt macht ein
  pfadbasiertes Ausschneiden mit fester Breite, als Übergangslösung)
- Verhalten bei Loslassen der Leertaste mitten im Feld (→ Instruktion 5)
- Gegner, Kollision, Zeitlimit

## Aufgaben

### 1. Level-/Asset-Datenmodell

- `src/game/level.ts`: Typ `Level` mit mindestens
  `{ foregroundSrc: string; backgroundSrc: string }` (Pfade zu Bilddateien)
- Struktur bewusst so anlegen, dass später problemlos weitere Level-Level-
  Eigenschaften ergänzt werden können (z.B. Gegnertyp, Zeitlimit) — für
  jetzt nur die zwei Bildpfade

### 2. Platzhalter-Assets

- Zwei einfache Platzhalter-Bilder unter `public/assets/levels/level1/`
  anlegen: `foreground.png` und `background.png`
- Falls keine echten Grafiken vorhanden sind: programmatisch einfache,
  klar unterscheidbare Platzhalter erzeugen (z.B. Foreground = einfarbige
  Fläche oder Karo-Muster, Background = andersfarbiges Muster/Farbverlauf),
  Hauptsache visuell klar erkennbar, dass "etwas entfernt wurde"
- Ziel ist die Ladepipeline zu etablieren, nicht die finale Optik

### 3. Asset-Loader

- `src/engine/assetLoader.ts`: Funktion, die ein oder mehrere Bilder
  asynchron lädt (`HTMLImageElement`, `Promise`-basiert) und erst
  auflöst, wenn alle Bilder geladen sind
- Game-Start wartet auf den Abschluss des Ladens (einfacher "Loading..."-
  Zustand reicht, kein aufwändiger Ladebildschirm nötig)

### 4. Layered Rendering

- Background wird als unterste Ebene über die gesamte Spielfeld-Fläche
  (das initiale Rechteck) gezeichnet
- Foreground wird darüber gezeichnet, ebenfalls über die gesamte
  Spielfeld-Fläche, initial vollständig deckend
- Render-Reihenfolge: Background → Foreground → Feld-Rand/Spielfigur/
  aktuelle Linie (aus Instruktion 2/3) obenauf

### 5. Foreground als eigene Maskier-Ebene (Kern dieser Instruktion)

- Der Foreground wird **nicht** direkt in den Haupt-Canvas gezeichnet,
  sondern zunächst auf einen **Offscreen-Canvas** derselben Grösse wie das
  Spielfeld gerendert (`src/engine/offscreenCanvas.ts` oder integriert in
  `level.ts`/`rendering`-Modul, bitte sinnvoll platzieren)
- Dieser Offscreen-Canvas repräsentiert den aktuellen Zustand des
  Foregrounds (initial: komplett das Foreground-Bild)
- Beim Rendern wird dieser Offscreen-Canvas als Ganzes auf den Haupt-Canvas
  gezeichnet (an Stelle des Foreground-Bilds direkt)

### 6. Ausschneiden während des Zeichnens

- Solange `mode === 'drawing'` (aus Instruktion 3) und sich der Spieler
  jeden Frame weiterbewegt: An der neuen Position wird auf dem
  Offscreen-Foreground-Canvas mit `globalCompositeOperation = 'destination-out'`
  ein Kreis oder eine kurze Strecke (mit definierter Pinselbreite, z.B. als
  Konstante `carveWidth`) "ausgeschnitten" — dadurch wird an dieser Stelle
  der Offscreen-Canvas transparent und der darunterliegende Background
  wird beim nächsten Render-Durchlauf sichtbar
- Das Ausschneiden geschieht **einmalig und dauerhaft** pro besuchter
  Position (nicht nur als Vorschau wie die Linie aus Instruktion 3 — hier
  wird tatsächlich aus dem Foreground entfernt), damit der Effekt bestehen
  bleibt, auch wenn der Spieler später an dieser Stelle nochmal vorbeikommt
- Kurzer Code-Kommentar an dieser Stelle: dieses pfadbasierte Ausschneiden
  ist eine Übergangslösung; Instruktion 5 wird es durch ein exaktes,
  polygon-basiertes Ausschneiden des tatsächlich eingeschlossenen Bereichs
  ersetzen bzw. ergänzen

### 7. TODOs aus Instruktion 3 aktualisieren

- Codebase nach TODO-Kommentaren durchsuchen, die im Rahmen von
  Instruktion 3 gesetzt wurden (insbesondere zum Verhalten beim Loslassen
  der Leertaste mitten im Feld)
- Diese TODOs so umformulieren/kennzeichnen, dass klar ist, dass sie in
  **Instruktion 5** aufgegriffen werden (z.B. `// TODO(Instruktion 5): ...`
  statt generischem `// TODO: ...`), damit sie nicht versehentlich in
  diesem oder einem falschen Schritt mit-erledigt werden

### 8. Tests

- `src/engine/assetLoader.test.ts`: Test, dass der Loader mit mehreren
  Bildern korrekt erst nach Laden aller Bilder auflöst (Bilder können im
  Test gemockt werden, kein echtes Canvas-Rendering nötig)
- Canvas-Compositing selbst ist schwer sinnvoll unit-testbar — dafür reicht
  manuelle Verifikation im Dev-Server; bitte keine aufwändigen Canvas-Mocks
  bauen, das lohnt sich hier nicht

## Was NICHT Teil dieses Auftrags ist
- Geometrische Flächenberechnung oder Erkennung "eingeschlossener" Bereiche
- Endgültiges, polygon-exaktes Ausschneiden
- Verhalten bei Loslassen der Leertaste mitten im Feld
- Mehrere Level / Level-Wechsel-Logik (nur das Datenmodell dafür, keine
  Auswahl-/Wechsel-UI)
- Finale, künstlerisch gestaltete Assets

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wo/wie der Offscreen-Foreground-Canvas eingebunden wurde
- Welche `carveWidth` gewählt wurde und ob sie leicht anpassbar ist
  (Konstante, kein Magic Number verstreut im Code)
- Welche TODOs auf Instruktion 5 verschoben wurden (kurze Liste)
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für Instruktion 5 (vermutlich: geometrische Flächenberechnung,
  Erkennung des eingeschlossenen Bereichs, exaktes Ausschneiden, Verhalten
  bei Loslassen der Leertaste)
