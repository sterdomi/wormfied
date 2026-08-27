# Projekt-Setup: Wormfied

## Kontext
"Wormfied" ist ein neues Browser-Spiel, inspiriert vom Qix/Volfied-Genre
(Taito, 1981/1989): Der Spieler bewegt sich am Rand eines rechteckigen
Spielfelds und ist dort sicher. Durch Vordringen ins Feld können Linien
gezogen werden, die das Feld Stück für Stück einschliessen und verkleinern.
Beim Zeichnen ist der Spieler verwundbar. In der Mitte befindet sich ein
wurm-/drachenartiger Gegner (eigenes Design, keine Kopie von Volfied).

**Wichtig:** Wormfied ist eine eigenständige Neuinterpretation der
Qix-Spielmechanik (die als reine Spielregel nicht schützbar ist), mit
komplett eigenem Namen, eigenem visuellem Konzept (Wurm/Drache statt
Sci-Fi-Alien) und eigener Story. Keine Assets, Namen oder Grafiken aus
Volfied oder Qix übernehmen.

**Dieser Auftrag umfasst NUR das Projekt-Setup inkl. Build-Pipeline und
Game-Loop-Grundgerüst — noch keine Spiellogik, keine Grafik-Assets, kein
Gegnerverhalten.**

## Ziel-Plattformen
Vorerst Desktop-Browser (Maus/Tastatur-Steuerung). PWA/Mobile-Unterstützung
ist bewusst NICHT Teil dieses Setups und wird erst ergänzt, wenn die
Kernmechanik steht und auf Touch getestet werden kann.

## Tech-Stack (bitte so umsetzen)
- **Build-Tool: Vite** (kein Webpack)
- **Sprache:** TypeScript (strict mode aktiviert)
- **Rendering:** HTML5 Canvas (2D-Context), kein Framework/Library für
  Rendering (kein PixiJS o.ä.) — reines Canvas API, ähnlich wie im
  bestehenden Scopa-Projekt
- **Game Loop:** `requestAnimationFrame`-basiert, analog zum `gameLoop` in
  Scopas `app.ts` (Delta-Time-Handling für flüssige, framerate-unabhängige
  Bewegung, da hier im Gegensatz zu Scopa kontinuierliche Bewegung und
  Kollisionserkennung pro Frame nötig sind)
- **Tests:** Jest, mit Fokus auf spätere Geometrie-Logik (Punkt-in-Polygon,
  Flächenberechnung, Linien-Kollision) — für dieses Setup reicht ein
  lauffähiges Jest-Grundgerüst mit einem Platzhalter-Test
- **Sprache/i18n:** Grundstruktur für DE/EN vorbereiten (Texte in separate
  JSON/TS-Dateien auslagern), aber noch keine vollständige Übersetzung —
  reicht ein Platzhalter mit 2–3 Beispieltexten

## Aufgaben für dieses Setup

1. **Projekt initialisieren**
   - Vite-Projekt mit TypeScript-Template aufsetzen (`npm create vite@latest`
     mit `vanilla-ts` Template)
   - `package.json` mit Namen `wormfied`

2. **Ordnerstruktur anlegen**
   ```
   src/
     app/            # Einstiegspunkt, Game-Loop-Orchestrierung
     engine/         # Kern-Engine: Game-Loop, Input-Handling, Canvas-Setup
     game/           # Spiellogik-Module (später: Field, Enemy, Player etc.)
     i18n/           # Sprachdateien (DE/EN), einfache Lookup-Funktion
     styles/         # CSS
     utils/
   public/
   ```

3. **TypeScript konfigurieren**
   - `tsconfig.json` mit `strict: true`, `target`/`lib` für moderne Browser
     (ES2020+)

4. **Canvas-Grundgerüst**
   - Vollflächiges (oder fest dimensioniertes, z.B. 800×600) `<canvas>`-Element
   - `src/engine/canvas.ts`: Setup-Funktion, die den 2D-Context liefert und
     bei Fenstergrösse-Änderung sauber skaliert (`devicePixelRatio`
     berücksichtigen für scharfe Darstellung)

5. **Game-Loop-Grundgerüst**
   - `src/engine/gameLoop.ts`: `requestAnimationFrame`-Loop mit
     Delta-Time-Berechnung, `update(dt)`- und `render(ctx)`-Callbacks als
     Parameter/Interface, sodass spätere Spiellogik sauber angehängt werden
     kann
   - Als Platzhalter-Inhalt: ein simpler, sich bewegender Testkreis (zeigt,
     dass Loop + Delta-Time + Rendering funktionieren), der in einem
     späteren Auftrag durch echte Spiellogik ersetzt wird

6. **i18n-Grundstruktur**
   - `src/i18n/de.ts`, `src/i18n/en.ts` mit 2–3 Beispiel-Keys (z.B.
     `startButton`, `gameTitle`)
   - Einfache `t(key)`-Lookup-Funktion, die aktuell fest auf Deutsch steht
     (später erweiterbar)

7. **Tooling**
   - ESLint + Prettier mit sinnvoller TypeScript-Konfiguration
   - `.gitignore` (node_modules, dist, .DS_Store etc.)
   - Git-Repo initialisieren, ersten Commit erstellen

8. **Jest-Setup**
   - Jest + ts-jest (oder vitest, falls das mit dem Vite-Setup besser
     harmoniert — bitte kurz begründen, welche Wahl getroffen wurde)
   - Ein Platzhalter-Test (z.B. für eine simple Utility-Funktion), der zeigt,
     dass das Test-Setup grundsätzlich läuft

9. **Build & Dev-Skripte prüfen**
   - `npm run dev` → lokaler Dev-Server läuft, Testkreis ist sichtbar und
     bewegt sich
   - `npm run build` → produktionsfähiger Build in `dist/`
   - `npm run preview` → Build lokal testen
   - `npm test` → Jest/Vitest läuft durch

10. **README.md**
    - Kurze Setup-Anleitung (Installation, Dev-Server starten, Build, Tests)
    - Kurzbeschreibung des Spielkonzepts (2–3 Sätze)
    - Hinweis auf Tech-Stack-Entscheidungen

## Was NICHT Teil dieses Auftrags ist
- Keine echte Spiellogik (Feld einschliessen, Flächenberechnung, Kollision
  mit Gegner)
- Kein Gegnerverhalten/KI
- Keine finalen Grafik-Assets (Wurm-/Drachen-Design etc.) — Platzhalter
  genügen vollauf
- Kein PWA-Setup
- Kein Deployment

## Nach Abschluss
Bitte kurz zusammenfassen: welche Entscheidungen getroffen wurden (v.a.
Jest vs. Vitest, falls davon abgewichen wurde), und was der sinnvolle
nächste Schritt wäre (vermutlich: Spielfeld-Datenmodell + Rand-Bewegung
des Spielers).
