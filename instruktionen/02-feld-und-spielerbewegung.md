# Instruktion 2: Spielfeld-Datenmodell + Rand-Bewegung des Spielers

## Kontext
Aufbauend auf dem bestehenden Vite + TypeScript + Canvas Setup (Instruktion 1,
bereits umgesetzt: Game-Loop mit `update`/`render`, Testkreis als Platzhalter).

Dieser Auftrag legt das Datenmodell für das Spielfeld an und implementiert die
Bewegung des Spielers **entlang des Feldrands** — das ist die Basis-Steuerung,
bevor überhaupt ans Reinfahren/Linienziehen gedacht wird.

**Noch NICHT Teil dieses Auftrags:**
- Ins Feld hineinfahren / Linien zeichnen
- Flächenberechnung oder Einschliessen von Bereichen
- Gegner (Wurm/Drache)
- Kollisionserkennung
- Zeitlimit/Timer

## Spielkonzept-Rekap (nur der für diesen Schritt relevante Teil)
Das Spielfeld ist ein Rechteck. Der Spieler bewegt sich zunächst ausschliesslich
auf dem **Rand** dieses Rechtecks (oben/unten/links/rechts entlang der Kanten,
inkl. Ecken). Der Spieler kann sich in diesem Schritt noch nicht ins Innere des
Feldes bewegen — das kommt erst in einer späteren Instruktion, wenn das
"Reinfahren + Linie ziehen"-Feature ansteht.

Wichtig für die Architektur: Das Spielfeld wird später nicht immer ein simples
Rechteck bleiben (nach dem Einschliessen von Bereichen wird die "offene Fläche"
zu einem komplexeren Polygon). Das Datenmodell sollte das jetzt schon
berücksichtigen, auch wenn in diesem Schritt nur ein Rechteck als Spezialfall
existiert.

## Aufgaben

### 1. Datenmodell für das Spielfeld

- `src/game/field.ts`:
  - Typ `Point { x: number; y: number }`
  - Das offene Spielfeld wird als geordnete Liste von `Point`s modelliert,
    die ein geschlossenes Polygon bilden (aktuell: die 4 Ecken des
    Rechtecks, im Uhrzeigersinn)
  - Funktion `createRectangularField(width: number, height: number): Point[]`
    liefert das initiale Rechteck-Polygon
  - Kurzer Kommentar im Code, der erklärt, dass dieses Polygon später durch
    das Einschliessen von Bereichen seine Form ändert (Kontext für später,
    nicht implementieren)

### 2. Spieler-Datenmodell

- `src/game/player.ts`:
  - Typ/Klasse `Player` mit aktueller Position (`Point`), aktuellem
    Rand-Segment (Index des Polygon-Segments, auf dem er sich befindet) und
    Fortschritt auf diesem Segment (0–1 oder absolute Distanz)
  - Der Spieler-Zustand muss eindeutig aus "auf welchem Segment + wie weit"
    ableitbar sein, nicht nur aus x/y-Koordinaten — das macht "entlang des
    Rands bewegen" einfacher, als es aus rohen Koordinaten neu zu berechnen

### 3. Rand-Bewegung (Kernlogik)

- `src/game/playerMovement.ts` (oder direkt in `player.ts`, bitte sinnvoll
  strukturieren):
  - Funktion, die den Spieler basierend auf Eingaberichtung
    (links/rechts/hoch/runter, siehe Input-Handling unten) **entlang des
    aktuellen Polygon-Rands** bewegt, inkl. korrektem Übergang über Ecken
    hinweg (z.B. am Rechteck: von der oberen Kante nach rechts weiterlaufen
    biegt an der Ecke automatisch auf die rechte Kante ab)
  - Geschwindigkeit als Konstante (Pixel/Sekunde), Bewegung muss
    Delta-Time-basiert sein (Nutzung des `dt` aus dem bestehenden
    Game-Loops), nicht Frame-abhängig
  - Für das Rechteck reicht eine Bewegungsrichtung "im Uhrzeigersinn /
    gegen den Uhrzeigersinn" pro Tastendruck, abgeleitet aus der
    gedrückten Pfeiltaste relativ zur aktuellen Kantenausrichtung (z.B.
    auf der oberen Kante bewegt Pfeil-rechts den Spieler nach rechts,
    auf der rechten Kante bewegt Pfeil-runter den Spieler weiter im
    Uhrzeigersinn) — bitte eine klare, nachvollziehbare Logik wählen und
    im Code kommentieren, das ist der kniffligste Teil dieses Auftrags

### 4. Input-Handling

- `src/engine/input.ts`:
  - Einfacher Keyboard-Listener für Pfeiltasten (und optional WASD), der
    den aktuell gedrückten Zustand hält (z.B. `{ up: boolean, down: boolean,
    left: boolean, right: boolean }`)
  - Kein Diagonal-Handling nötig, da Bewegung nur entlang der Kanten läuft

### 5. Integration in Game-Loop

- Testkreis aus Instruktion 1 entfernen
- Spielfeld wird als Rechteck-Umriss gezeichnet (einfache Linie, Farbe via
  CSS-Variable/Konstante)
- Spieler wird als kleiner Kreis oder Dreieck an seiner aktuellen Position
  gezeichnet
- `update(dt)` ruft die Rand-Bewegungslogik basierend auf aktuellem
  Input-Zustand auf

### 6. Tests

- `src/game/field.test.ts`: Test für `createRectangularField` (korrekte
  Anzahl Punkte, korrekte Koordinaten für gegebene width/height)
- `src/game/playerMovement.test.ts`: Mindestens 2–3 Tests für die
  Rand-Bewegung, insbesondere der Ecken-Übergang (z.B. Spieler bewegt sich
  über eine Ecke hinweg, Segment-Index und Position sind danach korrekt)

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie die Rand-Bewegungslogik über Ecken hinweg genau gelöst wurde (kurz,
  in eigenen Worten, damit ich es nachvollziehen kann ohne den ganzen Code
  zu lesen)
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: Ins Feld
  reinfahren / Linie zeichnen als neues, gefährliches Segment)
