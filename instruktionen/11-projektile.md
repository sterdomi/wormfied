# Instruktion 11: Gegner-Projektile (Kugeln)

## Kontext
Aufbauend auf Instruktion 10 (Level-Architektur + Mini-Gegner, bereits
umgesetzt). Gegner (Hauptgegner und/oder Mini-Gegner) können jetzt in
konfigurierbaren Abständen einzelne, runde Projektile ("Kugeln") abfeuern.
Eine Berührung durch ein Projektil hat **die gleiche Konsequenz wie eine
Berührung durch den Gegner selbst** (Instruktion 7/8) — es gelten dieselben
Regeln (Linien-Kollision während des Zeichnens, ungeschildete Rand-Kollision
bei `shield <= 0`).

**Neues Asset (liegt bei):** `kugel.svg` — gelbe Kugel mit Glüh-Effekt.
Bitte nach `public/assets/projectiles/kugel.svg` legen.

**Noch NICHT Teil dieses Auftrags:**
- Eigene Projektil-Grafiken pro Level (nur die eine gelbe Kugel als
  Beispiel/Default für Level 1)
- Spieler-eigene Projektile/Angriffsmöglichkeit (nur Gegner schiessen)
- Soundeffekte

## Aufgaben

### 1. Konfiguration erweitern

- `src/levels/types.ts`: `EnemyConfig` um optionales Feld `shooting?:
  ShootingConfig` erweitern:
  ```ts
  interface ShootingConfig {
    enabled: boolean;
    cooldownSeconds: number;   // Zeit zwischen zwei Schüssen
    projectileSpeed: number;   // Pixel/Sekunde
    projectileSize: number;    // Rendergrösse (Durchmesser) in Pixel
    projectileAssetSrc: string;
  }
  ```
- Falls `shooting` fehlt oder `enabled: false`: der jeweilige Gegner
  schiesst nicht (Standardverhalten, kein Bruch für bestehende Level-
  Konfigurationen)
- `src/levels/level1/index.ts` aktualisieren: `mainEnemy.shooting` mit
  sinnvollen Startwerten aktivieren (z.B. alle 2–3 Sekunden ein Schuss,
  moderate Geschwindigkeit — bitte eine Einschätzung treffen, die sich
  beim Testen fair anfühlt, nicht zu aggressiv für den Einstieg); für die
  Mini-Gegner in Level 1 `shooting` vorerst deaktiviert lassen (Architektur
  unterstützt es, aber Level 1 nutzt es bewusst nur beim Hauptgegner, um
  den Schwierigkeitsgrad überschaubar zu halten)

### 2. Projektil-Datenmodell

- `src/game/projectile.ts` (neu): Typ `Projectile` mit Position (`Point`),
  Geschwindigkeitsvektor, Radius/Grösse, Asset-Referenz
- Spielzustand um `projectiles: Projectile[]` erweitern

### 3. Feuerlogik

- Jeder Gegner (Hauptgegner und Mini-Gegner, dort wo `shooting.enabled`)
  bekommt einen eigenen Cooldown-Timer (z.B. als Teil des `Enemy`-Zustands,
  `timeSinceLastShot: number`)
- Jeden Frame: `timeSinceLastShot += dt`; sobald der konfigurierte
  `cooldownSeconds` erreicht ist, wird ein neues Projektil erzeugt und der
  Timer zurückgesetzt
- Schussrichtung: **auf die aktuelle Spielerposition gezielt** (Vektor vom
  Gegner zur Spielerposition im Moment des Abschusses, normalisiert,
  multipliziert mit `projectileSpeed`) — kein Nachjustieren nach dem
  Abschuss, das Projektil fliegt geradlinig weiter
- Neues Projektil wird der `projectiles`-Liste hinzugefügt

### 4. Projektil-Bewegung & Aufräumen

- `update(dt)`: alle Projektile bewegen sich entsprechend ihres
  Geschwindigkeitsvektors weiter
- Projektile, die den sichtbaren Spielbereich deutlich verlassen (z.B.
  ausserhalb des Canvas plus kleiner Toleranzrand), werden aus der Liste
  entfernt (Performance, keine unbegrenzt wachsende Liste)

### 5. Kollisionserkennung (gleiche Regeln wie Gegner-Berührung)

- `src/game/collision.ts` erweitern: neue Funktion(en), die für jedes
  Projektil prüfen:
  - Während `mode === 'drawing'`: berührt das Projektil die aktive
    gezeichnete Linie? → gleicher Ablauf wie `checkLineCollision`
    (Instruktion 7/8) — Linie verwerfen, Foreground-Snapshot
    zurücksetzen, Lebensverlust-Ablauf (Instruktion 8)
  - Während `mode === 'onEdge'` UND `shield <= 0`: berührt das Projektil
    direkt den Spieler? → gleicher Ablauf wie
    `checkUnshieldedPlayerCollision` (Instruktion 8)
  - Bitte bestehende Kollisions-Funktionen wiederverwenden/generalisieren
    (z.B. eine gemeinsame Hilfsfunktion für "Punkt X berührt Linie/Spieler
    mit Toleranzradius Y"), statt die Logik für Projektile zu duplizieren
- Bei Kollision: betroffenes Projektil wird ebenfalls aus der Liste
  entfernt (verschwindet beim Einschlag)

### 6. Rendering

- Projektile werden mit dem konfigurierten Asset gezeichnet (Grösse gemäss
  `projectileSize`), Render-Reihenfolge: nach den Gegnern, vor
  Spielfigur/aktueller Linie (damit Projektile nicht hinter der Spielfigur
  verschwinden)

### 7. Tests

- `src/game/projectile.test.ts` (oder passend benannt):
  - Test: nach Ablauf von `cooldownSeconds` (simulierte `dt`-Summe) wird
    genau ein Projektil erzeugt, nicht mehrere auf einmal
  - Test: Schussrichtung zeigt korrekt (normalisiert) auf die
    Spielerposition zum Zeitpunkt des Abschusses
  - Test: Projektil ausserhalb des Spielbereichs wird beim nächsten
    Update entfernt
- `src/game/collision.test.ts` (Erweiterung):
  - Test: Projektil auf der aktiven Linie löst denselben Ablauf aus wie
    eine Linien-Kollision mit dem Gegner
  - Test: Projektil trifft ungeschildeten Spieler auf dem Rand → gleicher
    Ablauf wie direkte Gegner-Berührung
  - Test: Projektil trifft geschildeten Spieler auf dem Rand → **keine**
    Konsequenz (Schild schützt weiterhin)

## Was NICHT Teil dieses Auftrags ist
- Level-spezifische Projektil-Grafiken über die eine Beispiel-Kugel hinaus
- Spieler-Angriffsmöglichkeiten
- Soundeffekte/Treffer-Animation über das Verschwinden hinaus

## Nach Abschluss
Bitte kurz zusammenfassen:
- Welche Cooldown-/Geschwindigkeitswerte für den Level-1-Hauptgegner
  gewählt wurden und ob sich das beim Testen fair anfühlt
- Wie die Kollisionslogik wiederverwendet/generalisiert wurde, um
  Duplikation mit der bestehenden Gegner-Kollision zu vermeiden
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt
