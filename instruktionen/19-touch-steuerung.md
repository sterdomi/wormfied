# Instruktion 19: Mobile Touch-Steuerung

## Kontext
Aufbauend auf Instruktion 18 (Sound-Integration, bereits umgesetzt). Dieser
Auftrag ergänzt eine Touch-Steuerung für Mobilgeräte: ein virtueller
**Joystick unten links** für die Bewegung, ein **Action-Button unten
rechts** für Abdocken/Andocken-Bestätigung/Feuern (die Leertaste-Funktion
aus Instruktion 15).

**Wichtig:** Das ist eine **zusätzliche** Eingabequelle, keine Ablösung der
Tastatursteuerung. Die bestehende `InputState`-Abstraktion aus Instruktion 3
wurde bewusst so gebaut, dass die Spiellogik nie direkt weiss, ob die Eingabe
von Tastatur, Touch oder später Gamepad kommt — genau dafür wird das jetzt
gebraucht. Bitte **keine** bestehende Bewegungs-/Zeichenlogik verändern, nur
eine neue Eingabequelle ergänzen, die denselben `InputState` befüllt.

**Wichtige Einordnung:** Dies bleibt ein **digitaler** Joystick (liefert
weiterhin nur `up/down/left/right`-Booleans, keine Analog-/
Geschwindigkeitswerte), passend zum bestehenden diskreten Bewegungsmodell —
kein Umbau der Bewegungslogik nötig.

## Aufgaben

### 1. Touch-Erkennung

- Touch-Steuerung nur anzeigen, wenn das Gerät tatsächlich Touch-fähig ist
  (z.B. `window.matchMedia('(pointer: coarse)').matches` kombiniert mit
  `'ontouchstart' in window`) — **nicht** anhand der Bildschirmbreite
  entscheiden, das schliesst z.B. grosse Tablets fälschlich aus bzw.
  schmale Desktop-Fenster fälschlich ein
- Bei Nicht-Touch-Geräten bleibt die Oberfläche unverändert (kein leerer
  Platz, keine unsichtbaren Hitboxen)

### 2. UI-Elemente

- `src/ui/touchControls.ts` (oder passend platziert, evtl. eigener
  `src/ui/`-Ordner falls noch nicht vorhanden): zwei visuelle Elemente,
  als HTML-Overlay über dem Canvas (nicht ins Canvas gezeichnet, einfacher
  zu positionieren/stylen):
  - **Joystick unten links:** ein feststehender "Basis"-Kreis (leicht
    halbtransparent) plus ein kleinerer "Knüppel"-Kreis, der der
    Fingerposition innerhalb eines Radius folgt
  - **Action-Button unten rechts:** ein einzelner, gut daumenerreichbarer
    Kreis-Button (halbtransparent, mit einem einfachen Icon oder Text als
    Platzhalter — Icon-Feintuning ist kein Muss in diesem Schritt)
- Beide Elemente mit `env(safe-area-inset-bottom)`/`env(safe-area-inset-left/right)`
  in der Positionierung berücksichtigen (iPhone-Notch/Home-Indicator-
  Bereich), damit sie nicht unter der System-UI verschwinden
- `touch-action: none` auf beiden Elementen setzen, um Scrollen/Zoomen
  während der Bedienung zu verhindern

### 3. Joystick-Logik

- Feste Basis-Position (nicht "erscheint dort, wo der Finger zuerst
  aufsetzt" — feste Position ist für ein Arcade-Spiel vorhersehbarer)
- Bei `touchstart` innerhalb der Basis-Zone: Touch-`identifier` merken
  (siehe Punkt 5, Multi-Touch)
- Bei `touchmove` mit passendem `identifier`: Vektor von Basis-Mittelpunkt
  zu aktueller Touch-Position berechnen, Knüppel-Position auf einen
  Maximalradius begrenzen (klemmen, falls der Finger weiter als der
  Radius vom Zentrum entfernt ist)
- Richtung ableiten: Winkel des Vektors in eine der vier
  `up/down/left/right`-Richtungen übersetzen (z.B. die dominante Achse
  wählen, wenn der Vektor diagonal ist — analog zur bestehenden
  Vier-Wege-Bewegung, keine 8-Wege-Logik nötig, das Spiel kennt aktuell
  keine Diagonalbewegung)
- **Toter Bereich (Dead Zone)** nahe der Mitte (z.B. innerhalb von 15% des
  Radius): keine Richtung aktiv, verhindert ungewolltes Zittern bei
  minimalen Fingerbewegungen
- Bei `touchend`/`touchcancel` mit passendem `identifier`: Knüppel springt
  zurück zur Mitte, alle Richtungs-Flags auf `false`

### 4. Action-Button-Logik

- Bei `touchstart` innerhalb der Button-Zone: Touch-`identifier` merken,
  UND — passend zum Toggle-/Tap-Modell aus Instruktion 15 — ein
  `drawJustPressed`-Ereignis für genau einen Frame auslösen (gleicher
  Mechanismus wie die Tastatur-Flankenerkennung aus Instruktion 15, Punkt 1)
- Solange der Finger auf dem Button bleibt: `draw`-Flag (durchgehend,
  falls dieses Feld aus Instruktion 3/15 noch irgendwo verwendet wird) auf
  `true`
- Bei `touchend`/`touchcancel`: `draw`-Flag zurück auf `false`, **kein**
  erneutes `drawJustPressed` beim Loslassen (nur beim Antippen, analog zur
  Tastatur)

### 5. Multi-Touch-Handling

- Beide Bedienelemente müssen **gleichzeitig** aktiv sein können (z.B.
  Joystick halten UND Action-Button antippen, während man sich bewegt und
  schiesst)
- Dafür pro Element den zugehörigen `touch.identifier` separat tracken
  (aus `TouchEvent.changedTouches`/`TouchEvent.touches`), nicht nur einen
  globalen "letzten Touch" verwenden — sonst überschreiben sich Joystick-
  und Button-Touch gegenseitig

### 6. Zusammenführen mit bestehender Input-Abstraktion

- `src/engine/input.ts` (Instruktion 3/15): der finale `InputState`, den
  die Spiellogik jeden Frame liest, muss Tastatur- **und** Touch-Zustand
  kombinieren (z.B. `up = keyboardState.up || touchState.up`, analog für
  die anderen Felder, sowie `drawJustPressed` aus beiden Quellen
  zusammengeführt für den jeweiligen Frame)
- Bitte sicherstellen, dass die Spiellogik selbst weiterhin nur den einen,
  zusammengeführten `InputState` kennt — keine Verzweigungen "falls Touch,
  dann..." ausserhalb der Input-Schicht

### 7. Tests

- Reine Touch-Interaktion ist im Test-Setup schwer sinnvoll automatisiert
  zu testen (kein echtes Touch-Event-System in Jest/Vitest ohne echten
  Browser) — bitte **keine** aufwändigen Touch-Event-Mocks bauen
- Falls die Winkel-zu-Richtung-Umrechnung (Punkt 3) als reine Funktion
  ausgelagert wird (z.B. `vectorToDirection(dx, dy, deadZoneRadius):
  {up,down,left,right}`), dafür gerne 3–4 einfache Tests ergänzen (z.B.
  reiner Rechts-Vektor → nur `right: true`, Vektor innerhalb Dead Zone →
  alle `false`, diagonaler Vektor → dominante Achse gewählt)

## Was NICHT Teil dieses Auftrags ist
- Analoge Geschwindigkeitsabstufung über die Joystick-Auslenkung
- Kipp-/Gyroskop-Steuerung (bewusst nicht gewählt, siehe vorherige
  Absprache)
- Individuell konfigurierbare Button-Positionen/-Grössen (Einstellungsmenü)
- Finales Icon-Design für den Action-Button (Platzhalter reicht)
- Haptisches Feedback (Vibration)

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie die Winkel-zu-Richtung-Umrechnung konkret gelöst wurde
- Wie sich die gleichzeitige Bedienung (Joystick + Button) beim Testen auf
  einem echten Touch-Gerät oder im Browser-Touch-Emulator angefühlt hat
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt
