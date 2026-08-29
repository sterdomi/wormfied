/**
 * Service Worker (Instruktion 20, Punkt 2) – von Hand geschrieben statt via
 * `vite-plugin-pwa`: Wormfied bleibt bewusst bei reinem Vanilla-TS/Vite ohne
 * Framework-Plugins (siehe README, "Tech-Stack-Entscheidungen"), und die
 * Cache-Anforderung hier ist einfach genug ("keine komplexe
 * Cache-Invalidierungsstrategie nötig", siehe Instruktion), dass ein
 * zusätzliches Build-Plugin plus dessen generiertem Precache-Manifest mehr
 * Komplexität hinzufügen würde, als es abnimmt.
 *
 * Strategie: Cache-first mit Laufzeit-Auffüllung. `CORE_ASSETS` (feste,
 * unter `public/` unveränderte Dateinamen – NICHT die von Vite gehashten
 * JS/CSS-Bundles, deren Namen erst beim Build feststehen) werden beim
 * Install vorab gecacht; alles andere (inkl. der gehashten Bundles, HTML)
 * landet beim ersten Abruf automatisch im selben Cache. Ein neuer
 * `CACHE_NAME` (Versionsnummer erhöhen) verwirft beim nächsten Seitenaufruf
 * automatisch den kompletten alten Cache (`activate`-Handler) – mehr
 * Invalidierung ist für diesen Schritt nicht gefordert.
 *
 * Alle Pfade sind bewusst RELATIV (ohne führenden Slash): sie lösen sich
 * gegen die eigene Position dieser Datei auf, die immer im Wurzelverzeichnis
 * der deployten `base` liegt (`/` im Normalfall, `/wormfied/` beim
 * Subpath-Build) – funktioniert dadurch ohne Anpassung in beiden Fällen,
 * genau wie `resolveAssetPath` im App-Code (siehe `src/engine/assetPath.ts`).
 */

const CACHE_NAME = 'wormfied-v1';

const CORE_ASSETS = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './apple-touch-icon.png',
  './assets/player.svg',
  './assets/player-walk.svg',
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
