# Instruktion 15: Andock/Abdock-Steuerung (Leertaste als Toggle)

## Kontext
Dieser Auftrag ändert das Grundprinzip der Leertaste von "halten, um zu
zeichnen" (Instruktion 3) zu einem **Toggle-basierten Andock/Abdock-System**.
Er **ersetzt Teile von Instruktion 3, 5 und 14** — bitte diesen Auftrag als
massgeblich für die betroffenen Punkte behandeln, auch wenn es dem
widerspricht, was dort ursprünglich stand.

**Neues Prinzip:**
- Kurzes Drücken der Leertaste, während der Spieler sicher ist (**"eigenes
  Terrain"** = auf dem Feld-Rand, bisher `mode === 'onEdge'`): Spieler ist
  ab jetzt **abgedockt**. Das ändert für sich genommen noch nichts an der
  Position — der Spieler kann sich weiterhin am Rand entlangbewegen (wie
  bisher), ist aber jetzt "bereit", ins Feld vorzudringen
- Sobald der Spieler (im abgedockten Zustand) per Richtungstaste tatsächlich
  vom Rand weg ins Feldinnere steuert, betritt er **feindliches Terrain**
  (bisher `mode === 'drawing'`) — ab hier gelten die bekannten
  Gefahren-Regeln (Linien-Kollision, kein Schild-Schutz)
- Der Spieler bewegt sich frei im Feldinneren (wie bisher in `drawing`,
  Instruktion 3) und zeichnet dabei eine Linie
- **Andocken passiert automatisch**, sobald die Linie geometrisch den Rand
  wieder erreicht — hier ändert sich gegenüber der bisherigen Instruktion 5
  nichts. Die Leertaste wird ausschliesslich für das **Abdocken** (und das
  Abbrechen eines noch nicht begonnenen Abdockens, siehe Punkt 5) sowie für
  das **Feuern der Kanone** gebraucht (siehe unten) — nicht fürs Andocken
- Solange der Spieler geometrisch auf dem Rand steht, bleibt er über das
  Schild geschützt — das ergibt sich automatisch, da `mode === 'onEdge'`
  weiterhin genau dann gilt, wenn die Position geometrisch auf dem Rand
  liegt (siehe Punkt 2), unabhängig vom neuen Abgedockt-Flag
- **Feuern mit der Kanone (Instruktion 14) wird neu an dieselbe Taste
  gebunden, aber kontextabhängig:** Drückt der Spieler die Leertaste,
  während er sich auf feindlichem Terrain befindet (`mode === 'drawing'`)
  UND der Kanone-Bonus aktiv ist, wird ein Schuss in die aktuelle
  Blickrichtung abgefeuert, **statt** anzudocken (Andocken ist von dort aus
  ohnehin nicht möglich, da nicht auf dem Rand) — das ersetzt die in
  Instruktion 14 beschriebene automatische Dauerfeuer-Lösung, die durch
  dieses neue Steuerungsmodell obsolet wird

**Damit obsolet/zu entfernen:**
- Instruktion 5, Punkt 5 ("Verhalten bei Loslassen der Leertaste mitten im
  Feld", automatisches Verbinden zum nächstgelegenen Randpunkt): Es gibt in
  einem Toggle-Modell kein "Loslassen" mehr, das eine Aktion auslöst — der
  Spieler bewegt sich frei weiter, bis er entweder selbst zum Rand
  zurückfindet (automatisches Andocken, siehe unten) oder kollidiert. Der
  bisherige "vorzeitiges Loslassen"-Mechanismus entfällt ersatzlos
- Instruktion 14s automatische Kanone-Dauerfeuer-Logik während des
  Zeichnens: wird durch das explizite Tap-to-Fire aus diesem Auftrag
  ersetzt (Andocken selbst bleibt aber wie gehabt automatisch, siehe unten
  — nur das Schiessen wird an die Leertaste gebunden)

## Aufgaben

### 1. Input-Abstraktion erweitern (Flankenerkennung statt nur Halten)

- `src/engine/input.ts` (Instruktion 3): `InputState` um `drawJustPressed:
  boolean` erweitern — `true` nur in dem einen Frame, in dem die Leertaste
  frisch gedrückt wurde (Flanken-/Edge-Erkennung: vorherigen Tastenzustand
  mit aktuellem vergleichen), nicht bei durchgehendem Halten
- Bestehendes `draw`-Feld (durchgehend "gehalten") kann bestehen bleiben,
  falls es an anderer Stelle noch sinnvoll genutzt wird — falls nicht mehr
  gebraucht, bitte kurz prüfen und ggf. entfernen, um keinen verwirrenden
  ungenutzten State zu hinterlassen
- Wichtig (siehe Instruktion 3, Architektur-Hinweis zu Input-Abstraktion):
  auch diese Flankenerkennung soll input-quellen-agnostisch funktionieren,
  damit spätere Eingabemethoden (Gamepad-Knopf, Touch-Tap) denselben
  `drawJustPressed`-Mechanismus bedienen können

### 2. Neuer Zustand: `isUndocked`

- Spieler-/Spielzustand um `isUndocked: boolean` erweitern (Startwert
  `false`)
- `mode` (`'onEdge' | 'drawing'`, Instruktion 3) bleibt weiterhin direkt an
  die **geometrische Position** gekoppelt: `onEdge`, solange der Spieler
  auf dem Feld-Rand steht, `drawing`, sobald er sich davon entfernt hat —
  das ändert sich durch diesen Auftrag nicht, `isUndocked` ist ein
  zusätzliches, unabhängiges Flag

### 3. Abdocken (Leertaste im `onEdge`-Zustand)

- Wird `inputState.drawJustPressed === true` UND `mode === 'onEdge'`:
  `isUndocked = true`
- Das allein bewirkt keine Positionsänderung — Rand-Bewegung (Instruktion
  2) funktioniert weiterhin normal, solange der Spieler nicht aktiv nach
  innen steuert

### 4. Übergang zu `drawing` (nur wenn abgedockt)

- Die bestehende Logik aus Instruktion 3, die bei Richtungseingabe nach
  innen den Wechsel `onEdge → drawing` auslöst, wird um die Bedingung
  `isUndocked === true` ergänzt: Ist der Spieler nicht abgedockt, hat
  Richtungseingabe nach innen **keine** Wirkung (Spieler bleibt auf der
  Rand-Bewegung wie in Instruktion 2 beschränkt)
- Ist `isUndocked === true` und der Spieler bewegt sich nach innen: Wechsel
  zu `mode = 'drawing'` wie bisher, Linie beginnt wie in Instruktion 3
  beschrieben

### 5. Abdocken abbrechen (erneuter Tastendruck, solange noch auf dem Rand)

- Ist `mode === 'onEdge'` UND `isUndocked === true` (der Spieler hat also
  abgedockt, sich aber noch nicht vom Rand wegbewegt) UND
  `inputState.drawJustPressed === true`: `isUndocked = false` — das ist
  ein reines Abbrechen/Zurücknehmen des Abdockens, bevor der Spieler
  tatsächlich ins Feld gefahren ist, keine Linie war ja noch nicht
  begonnen worden
- Das ist ein einfacher Toggle: Leertaste auf dem Rand schaltet
  `isUndocked` um, solange sich der Spieler nicht vom Rand entfernt hat

### 6. Automatisches Andocken bei Rückkehr auf den Rand

- **Wichtige Korrektur gegenüber einer früheren Überlegung:** Das Andocken
  nach einem Ausflug ins Feld passiert **automatisch**, sobald die Linie
  geometrisch den Feld-Rand wieder erreicht — genau wie ursprünglich in
  Instruktion 5 beschrieben, **kein** erneuter Tastendruck nötig
- D.h. die automatische Auslösung des Polygon-Splittings aus Instruktion 5
  (Integration in den Game-Loop, sobald die Linie den Rand berührt) bleibt
  **unverändert bestehen** — an dieser Stelle ändert dieser Auftrag nichts
- Einzige Ergänzung: sobald das automatische Andocken auslöst (`mode`
  wechselt zurück zu `'onEdge'`), wird zusätzlich `isUndocked = false`
  gesetzt — der Spieler ist wieder voll "angedockt" und muss die Leertaste
  erneut drücken, um beim nächsten Mal abzudocken

### 7. Obsoleten Code entfernen

- Den in Instruktion 5, Punkt 5 beschriebenen Mechanismus ("bei Loslassen
  der Leertaste automatisch zum nächstgelegenen Randpunkt verbinden")
  suchen und entfernen — in einem Toggle-Modell gibt es kein "Loslassen"
  mehr, das im Feldinneren etwas auslöst
- Zugehörige TODO-Kommentare/Tests, die sich auf dieses Verhalten bezogen,
  ebenfalls bereinigen

### 8. Kanone: Tap-to-Fire statt Dauerfeuer (löst Instruktion 14, Punkt 8
   ab)

- Neue Prüfung: Ist `mode === 'drawing'` UND `cannonRemainingSeconds > 0`
  UND `inputState.drawJustPressed === true`: einen Schuss abfeuern (gleiche
  Projektil-Logik wie in Instruktion 14 beschrieben — eigene
  `playerProjectiles`-Liste, Richtung = aktuelle Bewegungs-/
  Blickrichtung), **kein** Cooldown-Timer/Dauerfeuer mehr nötig, da jeder
  Tastendruck einen Schuss auslöst (kein Feuerintervall wie ursprünglich
  in `CannonBoostConfig.fireIntervalSeconds` vorgesehen — dieses Feld kann
  entweder entfernt oder als minimale Schuss-Abklingzeit zwischen zwei
  Tap-Schüssen uminterpretiert werden, um zu schnelles Spammen zu
  verhindern; bitte kurz begründen, wofür entschieden wurde)
- Ist `mode === 'drawing'` UND `inputState.drawJustPressed === true` UND
  **kein** aktiver Kanone-Bonus: keine Wirkung (weder Schuss noch
  Andock-Versuch, da Andocken von dort aus geometrisch nicht möglich ist)

### 9. Tests

- `src/engine/input.test.ts` (oder passend): Test, dass `drawJustPressed`
  nur im Frame des tatsächlichen Tastendrucks `true` ist, nicht bei
  fortgesetztem Halten
- `src/game/playerState.test.ts` (oder passend):
  - Test: `drawJustPressed` im `onEdge`-Zustand (noch nicht abgedockt)
    setzt `isUndocked = true`
  - Test: erneutes `drawJustPressed` im `onEdge`-Zustand, während bereits
    `isUndocked = true` (Spieler hat sich noch nicht wegbewegt), setzt
    `isUndocked` zurück auf `false` (Abbrechen)
  - Test: Richtungseingabe nach innen ohne `isUndocked` bewirkt **keinen**
    Wechsel zu `drawing`
  - Test: Richtungseingabe nach innen mit `isUndocked = true` bewirkt
    Wechsel zu `drawing` wie bisher
  - Test: Rückkehr auf den Rand (rein geometrisch, ohne weiteren
    Tastendruck) löst automatisch das Polygon-Splitting aus UND setzt
    `isUndocked` zurück auf `false`
- `src/game/collision.test.ts` (Erweiterung): Test, dass
  `drawJustPressed` in `drawing`-Modus mit aktivem Kanone-Bonus einen
  Schuss auslöst, ohne Modus-Wechsel zu bewirken

## Was NICHT Teil dieses Auftrags ist
- Änderungen an der eigentlichen Rand-Bewegung (Instruktion 2) oder der
  Zeichen-Bewegung im Feldinneren (Instruktion 3) selbst — nur die
  Übergangs-/Auslösebedingungen zwischen den Zuständen ändern sich
- Visuelle Kennzeichnung des `isUndocked`-Zustands (z.B. andere
  Spieler-Farbe, solange abgedockt aber noch auf dem Rand) — falls
  gewünscht, gerne als eigener kleiner Folgeauftrag

## Nach Abschluss
Bitte kurz zusammenfassen:
- Ob und wie `CannonBoostConfig.fireIntervalSeconds` uminterpretiert oder
  entfernt wurde
- Wie sich das neue Steuerungsgefühl beim Testen anfühlt (v.a. der
  "abgedockt, aber noch sicher auf dem Rand"-Zwischenzustand — fühlt er
  sich nachvollziehbar an, oder eher verwirrend?)
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: visuelles
  Feedback für den `isUndocked`-Zustand, damit für den Spieler erkennbar
  ist, ob er "scharf" ist oder nicht)
