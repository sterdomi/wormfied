import { resolveAssetPath } from '../../engine/assetPath';
import type { GorillaFrame } from './drumming';

/**
 * Die sechs Gorilla-Trommel-Frames – zu viele für die drei Gegner-Slots der
 * Engine, daher level-lokal und **lazy** als `HTMLImageElement` geladen (erst
 * wenn `render.ts` sie anfordert, also nur im Browser, nicht beim Importieren
 * des Level-Moduls in Node/Tests). `render.ts` zeichnet erst, wenn
 * `img.complete && img.naturalWidth`.
 */

const DIR = '/assets/levels/level4';

const FRAME_SRC: Record<GorillaFrame, string> = {
  bereit: `${DIR}/gorilla_bereit.png`,
  haende_hoch: `${DIR}/gorilla_haende_hoch.png`,
  schlag_beide: `${DIR}/gorilla_schlag_beide.png`,
  schlag_links: `${DIR}/gorilla_schlag_links.png`,
  schlag_rechts: `${DIR}/gorilla_schlag_rechts.png`,
  bruellen: `${DIR}/gorilla_bruellen.png`,
};

const cache = new Map<GorillaFrame, HTMLImageElement>();

export function gorillaSprite(frame: GorillaFrame): HTMLImageElement {
  let el = cache.get(frame);
  if (!el) {
    el = new Image();
    el.src = resolveAssetPath(FRAME_SRC[frame]);
    cache.set(frame, el);
  }
  return el;
}
