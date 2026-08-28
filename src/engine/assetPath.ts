/**
 * Löst einen root-relativ geschriebenen Asset-Pfad (z.B. `/assets/foo.png`,
 * wie überall in `levels/*` und den Asset-Konstanten in `main.ts` üblich)
 * gegen die konfigurierte Vite-`base` auf (`import.meta.env.BASE_URL`).
 *
 * Standardmässig ist die `base` `/`, dann ändert sich nichts. Wird die App
 * aber unter einem Unterpfad deployt (z.B. `npm run build:wormfied-subpath`
 * → `--base=/wormfied/`, für https://sterchi.be/wormfied/), lösten
 * unveränderte `/…`-Pfade sonst IMMER vom Domain-Root statt vom Unterpfad
 * auf – das Spiel bootet zwar (index.html selbst rewritet Vite bereits
 * korrekt), aber jedes zur Laufzeit als String gesetzte `img.src`/
 * `fetch(...)` (Bilder, Sounds) würde 404en.
 *
 * Pfade OHNE führenden Slash (z.B. in Tests verwendete Kurz-Namen wie
 * `"a.png"`) bleiben unverändert – nur echte root-relative Pfade werden
 * umgeschrieben.
 */
export function resolveAssetPath(path: string): string {
  if (!path.startsWith('/')) return path;
  const base = import.meta.env.BASE_URL; // endet immer mit "/"
  return `${base}${path.slice(1)}`;
}
