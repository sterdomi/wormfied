/**
 * Service Worker (Instruktion 20, Punkt 2) – von Hand geschrieben statt via
 * `vite-plugin-pwa`: Wormfied bleibt bewusst bei reinem Vanilla-TS/Vite ohne
 * Framework-Plugins (siehe README, "Tech-Stack-Entscheidungen"), und die
 * Cache-Anforderung hier ist einfach genug ("keine komplexe
 * Cache-Invalidierungsstrategie nötig", siehe Instruktion), dass ein
 * zusätzliches Build-Plugin plus dessen generiertem Precache-Manifest mehr
 * Komplexität hinzufügen würde, als es abnimmt.
 *
 * Strategie: Cache-first mit Laufzeit-Auffüllung – ABER Network-first für
 * die Navigation (die HTML-Seite selbst, siehe `isNavigationRequest` im
 * `fetch`-Handler). Grund: `CACHE_NAME` bleibt zwischen Deploys meist
 * unverändert (kein Versions-Bump bei jedem kleinen Feature), Cache-first
 * hätte die HTML-Seite (und damit den Verweis auf den von Vite gehashten
 * JS-Bundle-Namen) sonst auf einem Gerät, das die Seite schon einmal
 * geladen hat, DAUERHAFT eingefroren – neue Deploys wären dort unsichtbar
 * geblieben, ohne dass die Cache-Storage manuell geleert wird (genau das
 * ist einem Test auf einem echten Gerät nach dem Cyborg-Sprite-Feature so
 * passiert). `CORE_ASSETS` (feste, unter `public/` unveränderte
 * Dateinamen – NICHT die gehashten JS/CSS-Bundles) werden beim Install
 * vorab gecacht (inkl. `./` als Offline-Fallback, siehe unten); alles
 * andere landet beim ersten Abruf automatisch im selben Cache. Ein neuer
 * `CACHE_NAME` (Versionsnummer erhöhen) verwirft beim nächsten Seitenaufruf
 * zusätzlich den kompletten alten Cache (`activate`-Handler) – nützlich als
 * expliziter Cutover, aber wegen des Network-first-Verhaltens für die
 * Navigation nicht mehr die einzige Absicherung gegen veraltetes HTML.
 *
 * Alle Pfade sind bewusst RELATIV (ohne führenden Slash): sie lösen sich
 * gegen die eigene Position dieser Datei auf, die immer im Wurzelverzeichnis
 * der deployten `base` liegt (`/` im Normalfall, `/wormfied/` beim
 * Subpath-Build) – funktioniert dadurch ohne Anpassung in beiden Fällen,
 * genau wie `resolveAssetPath` im App-Code (siehe `src/engine/assetPath.ts`).
 */
const CACHE_NAME = 'wormfied-v17';

const CORE_ASSETS = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './apple-touch-icon.png',
  './assets/player.svg',
  './assets/player-walk.svg',
  './assets/player-cyborg.svg',
  './assets/player-walk-cyborg.svg',
  './assets/wormfied-logo.svg',
  './assets/bonuses/bonus-cannon.svg',
  './assets/bonuses/bonus-speed.svg',
  './assets/projectiles/kugel.svg',
  './assets/levels/level1/background.png',
  './assets/levels/level1/foreground.png',
  './assets/levels/level1/gegner.svg',
  './assets/levels/level1/gegner-walk.svg',
  './assets/levels/level1/gegner-mini.svg',
  './assets/levels/level1/gegner-mini-walk.svg',
  './assets/levels/level1/arcade-music-loop.wav',
  './assets/levels/level2/background.png',
  './assets/levels/level2/foreground.png',
  './assets/levels/level2/gegner.png',
  './assets/levels/level2/gegner_walk.png',
  './assets/sound/undock.wav',
  './assets/sound/dock.wav',
  './assets/sound/draw_loop.wav',
  './assets/sound/player_cannon_shot.wav',
  './assets/sound/enemy_shot.wav',
  './assets/sound/mini_enemy_explosion.wav',
  './assets/sound/main_enemy_explosion.wav',
  './assets/sound/pickup_speed.wav',
  './assets/sound/pickup_cannon.wav',
  './assets/sound/life_loss.wav',
  './assets/sound/game_over.wav',
  './assets/sound/level_complete.wav',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // Nur GET cachen – POST/etc. (kommt hier aktuell nicht vor) unverändert
  // durchreichen, `cache.put` würde bei anderen Methoden ohnehin fehlschlagen.
  if (event.request.method !== 'GET') return;

  // Top-Level-Navigation (die HTML-Seite selbst) IMMER zuerst übers Netz
  // versuchen, nur bei einem Fehler (offline) auf den Cache zurückfallen –
  // siehe Begründung oben. `destination === 'document'` zusätzlich zu
  // `mode === 'navigate'`, da nicht jeder Browser bei jeder Navigationsart
  // zuverlässig `mode: 'navigate'` setzt.
  const isNavigationRequest =
    event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Alles andere (Bilder, Sounds, gehashte JS/CSS-Bundles, Manifest, Icons):
  // Cache-first mit Laufzeit-Auffüllung – diese URLs sind entweder
  // inhaltlich stabil (`public/`-Dateien) oder tragen einen Content-Hash im
  // Namen (Vite-Bundles), ändern sich unter derselben URL also nie.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Nur erfolgreiche, "einfache" (same-origin) Antworten cachen –
          // opake Cross-Origin-Antworten liessen sich später nicht sinnvoll
          // validieren, kommen hier aber ohnehin nicht vor (keine externen
          // Assets).
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline + nicht gecacht: liefert `undefined` (Browser-Standardfehler)
    }),
  );
});
