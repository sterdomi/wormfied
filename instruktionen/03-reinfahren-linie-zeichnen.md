# Instruktion 3: Ins Feld reinfahren / Linie zeichnen

## Kontext
Aufbauend auf Instruktion 1 (Setup) und Instruktion 2 (Spielfeld-Datenmodell +
Rand-Bewegung, bereits umgesetzt: Spieler bewegt sich entlang des
Feld-Polygons über Segment-Index + Fortschritt).

Dieser Auftrag ist der Kern der Spielmechanik: Der Spieler fährt vom Rand aus
ins Feldinnere und zeichnet dabei eine Linie.

**Steuerungs-Modell (wichtig, hier korrigiert gegenüber einer früheren Fassung):**

- Solange der Spieler auf dem Rand ist, ist er **rot** und bewegt sich mit den
  Pfeiltasten am Rand entlang (Instruktion 2).
- Die **Leertaste löst nur das Lösen vom Rand aus** (steigende Flanke). Beim
  Drücken auf dem Rand wird der Spieler **grün**, **bewegt sich aber NICHT**.
  Er wartet auf Cursor-Eingabe.
- **Nur die Cursor bewegen** den Spieler. Drückt man keinen Cursor und lässt
  die Leertaste wieder los, wird man **wieder rot** – man ist ja noch auf dem
  Rechteck. (Solange sich der Spieler noch nicht gelöst hat, ist eine
  Cursor-Richtung **aus dem Feld hinaus** blockiert; erlaubt sind ins Feld
  hinein und an der Kante entlang.)
- Bewegt man einen Cursor ins Feld, verlässt der Spieler das Rechteck und die
  Linie, die er fährt, ist **grün** (Kennzeichnung: hier ist er später
  verwundbar).
- Im Feld steuert der Spieler **nur mit hoch / runter / links / rechts**, und
  zwar **achsparallel – keine Diagonale**. Er fährt also „Rechtecke": geradeaus
  oder 90°-Abbiegen. Kein Cursor gedrückt → **keine Bewegung** (kein
  Auto-Weiterfahren). Eine 180°-Wende (zurück auf die eigene Linie) ist nicht
  erlaubt.
- Der Spieler darf **die eigene Linie nicht kreuzen**.
- Trifft die Linie wieder auf den Feld-Rand, **dockt der Spieler dort an**,
  wird wieder **rot** und bewegt sich wieder am Rand entlang. Um erneut ins
  Feld zu fahren, muss die Leertaste **neu gedrückt** werden (blosses
  Gedrückthalten löst nach dem Andocken nichts aus).

**Noch NICHT Teil dieses Auftrags:**
- Flächenberechnung / tatsächliches Einschliessen und Verkleinern des Feldes
  (kommt in Instruktion 4)
- Gegner (Wurm/Drache) und Kollision mit der Linie
- Verhalten, wenn die Leertaste **im Feldinneren losgelassen** wird (Spieler
  hat sich schon vom Rand gelöst), bevor die Linie den Rand wieder erreicht.
  Später soll das eine Konsequenz haben (Spieler **stirbt** – oder bleibt
  stehen, noch nicht entschieden); wird in Instruktion 4 spezifiziert. Für
  jetzt: einfacher Platzhalter (Spieler bleibt stehen) mit TODO-Kommentar.
  (Loslassen, **bevor** man sich gelöst hat, ist dagegen definiert: → wieder
  rot / andocken, siehe oben.)
- Zeitlimit/Timer
- Gamepad/Touch/Gesten-Input (aber: siehe Architektur-Hinweis, das MUSS hier
  schon berücksichtigt werden, auch wenn nur Keyboard implementiert wird)

## Wichtiger Architektur-Hinweis: Input-Abstraktion

Aktuell ist nur Keyboard implementiert. Später kommen Gamepad, Touch-Gesten und
Joystick dazu. Damit das nicht zu einem Umbau der Kernlogik führt:

- Die Spiellogik (Rand-Bewegung, Reinfahren/Zeichnen) darf **nicht** direkt auf
  Keyboard-Events oder Tastencodes zugreifen.
- Stattdessen: ein abstrakter `InputState` in `src/engine/input.ts`, erweitert
  um ein Feld für „Zeichnen-Trigger", z.B. `{ up, down, left, right, draw: boolean }`.
- Der Keyboard-Handler übersetzt Leertaste → `draw: true/false`; die Spiellogik
  kennt nur `InputState`, nicht „Leertaste".
- Das **Auslösen** des Reinfahrens läuft über die **steigende Flanke** von
  `draw` (nicht über den gehaltenen Zustand). Ein kleiner, wiederverwendbarer
  Flankendetektor kapselt das und ist von der Eingabequelle unabhängig – ein
  späterer Gamepad-/Touch-Handler liefert einfach denselben Boolean.

## Aufgaben

### 1. Zeichenzustand einführen

- Spieler bekommt `mode: 'onEdge' | 'drawing'` (`src/game/player.ts`).
- Wechsel `onEdge` → `drawing`, sobald die Leertaste **neu gedrückt** wurde UND
  der Spieler auf dem Rand ist. **Ohne Positionsänderung** – der Spieler wird
  nur „grün".
- Wechsel `drawing` → `onEdge`:
  - Linie erreicht den Rand → andocken an der Trefferstelle, oder
  - Leertaste losgelassen, **bevor** der Spieler je losgefahren ist → andocken
    an der aktuellen (unveränderten) Randstelle, Linie verwerfen.
- Die Zeichen-Ablauflogik in einer eigenen Datei (`src/game/drawing.ts`).

### 2. Bewegung beim Zeichnen

- Bewegung **nur bei gedrücktem Cursor**. Kein Cursor → Spieler steht (grün).
  Kein Auto-Weiterfahren.
- **Richtungswahl** (achsparallel, **keine Diagonale**):
  - noch keine Richtung gewählt (gerade gelöst) → gedrückte Cursor-Richtung;
    bei diagonaler Eingabe gewinnt die vertikale (senkrecht zu den waagrechten
    Start-Kanten → ins Feld)
  - Taste quer zur Fahrtrichtung → 90°-Abbiegen
  - Taste in Fahrtrichtung → geradeaus weiter
  - nur Taste gegen die Fahrtrichtung (180°) → ignoriert (kein Zurück auf die
    eigene Linie)
- Solange der Spieler **noch nicht losgefahren** ist (noch auf dem Rand): eine
  Cursor-Richtung, die **aus dem Feld hinaus** zeigt, wird verworfen (Prüfung
  gegen die Einwärts-Normale der Start-Kante). Entlang der Kante und ins Feld
  hinein ist erlaubt.
- Geschwindigkeit als eigene Konstante (`DRAW_SPEED`), Delta-Time-basiert.

### 3. Eigene Linie nicht kreuzen

- Würde der Bewegungsschritt eines Frames eine bereits gezeichnete Kante der
  eigenen Linie schneiden, wird der Schritt verworfen (Spieler bleibt stehen).
- Das zuletzt gezeichnete Segment wird dabei ausgeklammert (dort hängt der
  aktuelle Schritt zwangsläufig an; 90°-Abbiegen muss erlaubt bleiben).

### 4. Linie aufzeichnen

- `src/game/line.ts` mit `DrawnLine { points: Point[] }`.
- Startpunkt: der Rand-Punkt, an dem `drawing` begann. Danach die
  Zwischenpunkte der Bewegung.
- Punktesammlung **distanzbasiert** (Mindestabstand zwischen Punkten), nicht
  ein Punkt pro Frame – framerate-unabhängig und kompakt. Kurz begründen.

### 5. Rand-Erkennung & Andocken

- Sobald der Bewegungsschritt den Feld-Rand schneidet (erst prüfen, wenn der
  Spieler sich vom Rand gelöst hat – sonst zählt der Startpunkt sofort):
  Spieler an die Trefferstelle setzen (Segment-Index + Fortschritt),
  `mode = 'onEdge'`, wieder rot.
- Für diesen Schritt reicht das Erkennen **irgendeines** Rand-Segments (keine
  Flächenberechnung).
- Fertige Linie in eine Liste `completedLines: DrawnLine[]` (Feld- oder
  Spielzustand) legen – noch ohne Einrechnen ins Feld.
- „Losgelassen, bevor gefahren": kein Eintrag in `completedLines`, der Spieler
  dockt an der nächstgelegenen Randstelle wieder an.

### 6. Rendering

- `mode === 'drawing'`: aktuelle Linie live vom Startpunkt bis zur
  Spielerposition zeichnen, **grün**.
- Spieler-Marker: **rot** im `onEdge`-Modus, **grün** im `drawing`-Modus.
- Abgeschlossene Linien (`completedLines`) dauerhaft mitzeichnen (eigene Farbe,
  abgesetzt vom Feld-Rand und von der aktiven Linie).

### 7. Tests

- Flankendetektor: Drücken löst aus, Halten nicht, nach Loslassen wieder.
- `beginDrawing`: auf dem Rand + Trigger → `mode = 'drawing'`, **keine
  Bewegung**, Startpunkt auf dem Rand, Richtung noch offen.
- Richtungswahl: 90°-Abbiegen, Geradeaus, 180° ignoriert, keine Diagonale,
  kein Cursor → keine Bewegung.
- „Grün, aber nur Cursor bewegen": Leertaste gedrückt ohne Cursor → Spieler
  bleibt stehen; Cursor nach aussen (auf dem Rand) → blockiert.
- Leertaste loslassen: ohne je gefahren zu sein → wieder `onEdge` (rot),
  Position unverändert, keine Linie in `completedLines`. Im Feldinneren
  losgelassen → Platzhalter (bleibt stehen, `mode` bleibt `drawing`).
- Linie darf eigene Linie nicht kreuzen (Schritt wird verworfen).
- Rand-Erkennung: Linie erreicht ein anderes Segment → `onEdge`, Linie in
  `completedLines`, Spielerposition/Segment korrekt.
- Input-Abstraktion: der Trigger ist ein reiner Boolean, unabhängig von der
  Eingabequelle.

## Was NICHT Teil dieses Auftrags ist
- Flächenberechnung, Verkleinern/Einschliessen des Feld-Polygons
- Konsequenz beim Loslassen der Leertaste im Feldinneren (Instruktion 4) – hier
  nur Platzhalter (Spieler bleibt stehen) + TODO
- Gegner, Kollisionslogik, Zeitlimit
- Tatsächliche Gamepad/Touch-Implementierung (nur die Abstraktion muss stehen)

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie die Input-Abstraktion inkl. Flankendetektor aussieht
- Welcher Ansatz für die Punktesammlung der Linie gewählt wurde und warum
- Wie „achsparallel fahren + 90°-Abbiegen + eigene Linie nicht kreuzen" gelöst
  wurde
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: Instruktion 4 —
  Flächenberechnung/Einschliessen, danach Gegner)
