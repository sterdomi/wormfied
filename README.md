# Wormfied

Wormfied ist ein Browser-Spiel im Geist des Qix/Volfied-Genres: Man bewegt sich
am Rand eines rechteckigen Spielfelds (dort sicher) und schliesst durch Vorstösse
ins Innere Stück für Stück Fläche ein, während man beim Zeichnen verwundbar ist.
In der Feldmitte lauert ein wurm-/drachenartiger Gegner. Es ist eine
eigenständige Neuinterpretation mit eigenem Namen, eigenem visuellem Konzept und
eigener Story – ohne Assets, Namen oder Grafiken aus Volfied oder Qix.

> **Stand:** Projekt-Setup mit Build-Pipeline und Game-Loop-Grundgerüst.
> Noch keine Spiellogik, keine finalen Grafiken, kein Gegnerverhalten.

## Setup

Voraussetzung: Node.js ≥ 20.

```bash
npm install
```

## Skripte

| Befehl               | Zweck                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`        | Vite-Dev-Server (http://localhost:5173) mit HMR. Zeigt einen bewegten Testkreis. |
| `npm run build`      | Typecheck (`tsc`) + Produktions-Build nach `dist/`.                              |
| `npm run preview`    | Den Produktions-Build lokal ausliefern (http://localhost:4173).                  |
| `npm test`           | Testlauf mit Vitest.                                                             |
| `npm run test:watch` | Vitest im Watch-Modus.                                                           |
| `npm run lint`       | ESLint über das Projekt.                                                         |
| `npm run format`     | Prettier schreibt Formatierung.                                                  |

## Projektstruktur

```
src/
  app/       Einstiegspunkt, Game-Loop-Orchestrierung (main.ts)
  engine/    Kern-Engine: Canvas-Setup, Game-Loop, Input-Handling
  game/      Spiellogik-Module (später: Field, Player, Enemy, Collision)
  i18n/      Sprachdateien DE/EN + t()-Lookup
  styles/    CSS
  utils/     Hilfsfunktionen (Mathe etc.)
public/      Statische Assets
```

## Tech-Stack-Entscheidungen

- **Vite** als Build-Tool (kein Webpack): schneller Dev-Server, natives
  ESM/TypeScript, `dev` / `build` / `preview` out of the box.
- **TypeScript im strict mode**, Target ES2020 – moderne Desktop-Browser.
- **Rendering: reines HTML5-Canvas-2D-API**, kein Framework/keine Render-Library
  (kein PixiJS o. ä.) – analog zum Scopa-Projekt.
- **Game Loop:** `requestAnimationFrame` mit Delta-Time
  (`src/engine/gameLoop.ts`). `update(dt)` bekommt die Frame-Zeit in Sekunden,
  damit die (später kontinuierliche) Bewegung und Kollisionsprüfung
  framerate-unabhängig bleiben; grosse Sprünge nach Tab-Wechseln werden geklammert.
- **Tests: Vitest statt Jest.** Bewusst abgewichen: Vitest nutzt dieselbe
  Vite-/esbuild-Transform-Pipeline, versteht TS + ESM ohne `ts-jest`/Babel, die
  Konfiguration liegt in derselben `vite.config.ts`, und die API
  (`describe`/`it`/`expect`) ist Jest-kompatibel. Ein Umstieg auf Jest wäre
  hier zusätzliche, redundante Toolchain. `jsdom` ist bereits als Dev-Dependency
  vorhanden – die spätere Geometrie-Logik braucht kein DOM (Test-Environment
  steht auf `node`), für DOM-nahe Tests genügt ein Wechsel auf `environment: 'jsdom'`.
- **ESLint (Flat Config) + Prettier** mit TypeScript-Regeln; Prettier-Konflikte
  via `eslint-config-prettier` abgeschaltet.
- **i18n:** Texte in `src/i18n/de.ts` / `en.ts` ausgelagert, `t(key)` steht
  vorerst fest auf Deutsch (`setLocale` vorbereitet).

## Nicht Teil dieses Setups

Echte Spiellogik (Fläche einschliessen/berechnen, Kollision), Gegner-KI, finale
Grafik-Assets, PWA/Mobile-Support, Deployment.
