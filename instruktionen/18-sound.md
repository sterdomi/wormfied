# Instruktion 18: Sound-Integration

## Kontext
Aufbauend auf Instruktion 16 (Glow-Effekte, bereits umgesetzt). Dieser
Auftrag bindet Soundeffekte an bestehende Spielereignisse. Hintergrundmusik
ist bewusst **nicht** Teil dieses Auftrags (kommt später, siehe frühere
Absprache).

**Neue Assets (liegen bei, synthetisch erzeugt, keine Lizenzfragen):**

| Datei | Verwendung |
|---|---|
| `undock.wav` | Abdocken (Leertaste auf dem Rand, Instruktion 15) |
| `dock.wav` | Automatisches Andocken bei Rückkehr auf den Rand (Instruktion 15) |
| `draw_loop.wav` | Loop während `mode === 'drawing'` (Instruktion 3) |
| `player_cannon_shot.wav` | Spieler feuert mit Kanone-Bonus (Instruktion 14/15) |
| `enemy_shot.wav` | Gegner feuert Projektil (Instruktion 11) |
| `mini_enemy_explosion.wav` | Mini-Gegner besiegt (Instruktion 12) |
| `main_enemy_explosion.wav` | Hauptgegner-Explosion beim Levelabschluss (Instruktion 12) |
| `pickup_speed.wav` | Geschwindigkeits-Bonus eingesammelt (Instruktion 14) |
| `pickup_cannon.wav` | Kanone-Bonus eingesammelt (Instruktion 14) |
| `pickup_generic.wav` | Reserve/generischer Pickup-Sound, aktuell ungenutzt, siehe Punkt 4 |
| `life_loss.wav` | Lebensverlust (Instruktion 8) |
| `game_over.wav` | Game Over (Instruktion 8) |
| `level_complete.wav` | Levelabschluss (Instruktion 9) |

Bitte alle Dateien nach `public/assets/sounds/` legen.

## Aufgaben

### 1. AudioManager

- `src/engine/audioManager.ts` (neu): zentrale Stelle für alles
  Sound-bezogene, basierend auf der Web Audio API
- Funktionen mindestens:
  - `loadSound(key: string, src: string): Promise<void>` — lädt eine
    Audiodatei per `fetch` + `AudioContext.decodeAudioData`, speichert den
    dekodierten Buffer unter `key`
  - `loadAll(sounds: Record<string, string>): Promise<void>` — lädt mehrere
    Sounds parallel (analog zum bestehenden Bild-Asset-Loader aus
    Instruktion 4, gleiches Prinzip: erst weiterspielen, wenn alles geladen
    ist)
  - `play(key: string, options?: { volume?: number; loop?: boolean }):
    AudioBufferSourceNode | null` — spielt einen geladenen Sound ab, gibt
    den Source-Node zurück (wichtig für `draw_loop.wav`, siehe Punkt 3, da
    der Loop gezielt gestoppt werden muss)
  - `stop(node: AudioBufferSourceNode | null): void`
  - `setMasterVolume(value: number): void` (0–1)
  - `setMuted(muted: boolean): void`
- `AudioContext` erst bei der ersten Benutzerinteraktion erzeugen/fortsetzen
  (Browser blockieren Autoplay ohne Interaktion — bitte sicherstellen, dass
  der Context z.B. beim ersten Tastendruck/Klick initialisiert bzw. per
  `.resume()` fortgesetzt wird, sonst bleibt der Sound stumm)

### 2. Laden beim Spielstart

- Alle Sounds aus der Tabelle oben beim App-Start laden (analog zum
  bestehenden Bild-Asset-Ladevorgang aus Instruktion 4/13 — gerne im
  selben Ladebildschirm-Zustand mit abwarten, damit Bilder und Sounds
  gemeinsam bereitstehen, bevor das Spiel startet)

### 3. Verknüpfung mit Spielereignissen

Bitte an folgenden bestehenden Stellen den jeweiligen Sound auslösen (nur
den Aufruf ergänzen, keine bestehende Logik verändern):

- **Abdocken** (Instruktion 15, Punkt 3): `play('undock')`
- **Automatisches Andocken** (Instruktion 15, Punkt 6): `play('dock')`
- **Zeichnen-Loop** (Instruktion 3): beim Wechsel `onEdge → drawing`
  `draw_loop` mit `loop: true` starten, den zurückgegebenen Node im
  Spielzustand halten; beim Wechsel zurück zu `onEdge` (oder bei
  Lebensverlust mitten im Zeichnen) den Node über `stop()` beenden — bitte
  sicherstellen, dass der Loop nicht doppelt gestartet wird, falls der
  Zustand aus irgendeinem Grund mehrfach durchlaufen wird
- **Spieler-Kanone feuert** (Instruktion 15, Punkt 8): `play('player_cannon_shot')`
- **Gegner feuert** (Instruktion 11, Feuerlogik): `play('enemy_shot')`
- **Mini-Gegner besiegt** (Instruktion 12, sowohl beim Einschliessen als
  auch beim Treffer durch Spieler-Projektil aus Instruktion 14):
  `play('mini_enemy_explosion')`
- **Hauptgegner-Explosion beim Levelabschluss** (Instruktion 12):
  `play('main_enemy_explosion')`
- **Speed-Bonus eingesammelt** (Instruktion 14, Punkt 6/7): `play('pickup_speed')`
- **Kanone-Bonus eingesammelt** (Instruktion 14, Punkt 6/8): `play('pickup_cannon')`
- **Lebensverlust** (Instruktion 8, `handleLifeLoss`): `play('life_loss')`
- **Game Over** (Instruktion 8, beim Wechsel zu `isGameOver = true`):
  `play('game_over')`
- **Levelabschluss** (Instruktion 9, beim Wechsel zu `isLevelComplete =
  true`): `play('level_complete')`

### 4. `pickup_generic.wav`

- Aktuell ohne festen Verwendungszweck — bitte **nicht** verwenden, falls
  keine passende Stelle offensichtlich ist (lieber ungenutzt lassen als
  einen unpassenden Sound irgendwo einzubauen). Als Vorschlag im
  Abschluss-Bericht gerne notieren, ob eine sinnvolle Verwendung
  aufgefallen ist (z.B. als Fallback-Sound, falls in Zukunft ein dritter
  Bonustyp ohne eigenen Sound dazukommt)

### 5. Lautstärke-Balance

- Die Dateien sind bereits grob aufeinander abgestimmt (Explosionen/
  Stinger lauter als kurze UI-Klicks), aber bitte beim Testen im
  Zusammenspiel prüfen, ob sich etwas unangenehm laut/leise anfühlt, und
  bei Bedarf über den `volume`-Parameter von `play()` pro Sound
  nachjustieren (nicht die Dateien selbst verändern)

### 6. Mute-Toggle (minimal)

- Ein einfacher, sichtbarer Mute-Button im HUD (Instruktion 6/8/9) — reicht
  als simples Icon/Text-Toggle, das `audioManager.setMuted()` aufruft,
  keine aufwändige Einstellungs-UI in diesem Schritt
- Zustand (`muted`) muss nicht persistiert werden (kein LocalStorage o.ä.
  nötig für diesen Schritt)

### 7. Tests

- Reine Audio-Wiedergabe ist im Test-Setup (Jest/Vitest ohne echten
  Browser-Audio-Kontext) schwer sinnvoll zu testen — bitte **keine**
  aufwändigen Web-Audio-Mocks bauen
- Falls sich einzelne reine Hilfsfunktionen ohne direkte Web-Audio-
  Abhängigkeit auslagern lassen (z.B. eine Funktion, die aus Spielzustand
  ableitet, welcher Sound-Key ausgelöst werden soll), dafür gerne 1–2
  einfache Tests ergänzen — ansonsten reicht manuelle Verifikation im
  Dev-Server

## Was NICHT Teil dieses Auftrags ist
- Hintergrundmusik/Loop-Track
- Persistierte Lautstärke-/Mute-Einstellungen
- Räumlicher/positionsabhängiger Sound (Stereo-Panning je nach
  Spielerposition o.ä.)
- Aufwändiges Audio-Einstellungsmenü

## Nach Abschluss
Bitte kurz zusammenfassen:
- Ob der `AudioContext`-Autoplay-Block sauber gehandhabt werden konnte
  (an welcher Stelle wird er initialisiert/fortgesetzt)
- Ob beim Testen Lautstärke-Anpassungen nötig waren, und welche
- Ob eine sinnvolle Verwendung für `pickup_generic.wav` aufgefallen ist
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich:
  Hintergrundmusik, wie besprochen)
