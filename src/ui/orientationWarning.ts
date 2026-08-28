import { isTouchCapable } from './touchControls';
import { t } from '../i18n';

/**
 * Blendet einen vollflächigen "Bitte Gerät drehen"-Hinweis ein, solange ein
 * Touch-Gerät im Hochformat gehalten wird (Nutzer-Feedback: Wormfied ist
 * fürs Querformat gedacht – im Hochformat ist auch mit der Skalierung aus
 * `render()` nicht genug Platz fürs ganze Spielfeld + die Touch-Steuerung).
 *
 * Nur auf touch-fähigen Geräten (siehe `touchControls.ts`): ein schmales
 * Desktop-Fenster soll NICHT zum Drehen aufgefordert werden – da gibt es
 * nichts zu drehen.
 *
 * Läuft für die gesamte Seiten-Lebensdauer (einmalig aus `main.ts`
 * aufgerufen, kein `dispose()` nötig – anders als `setupInput()`, das pro
 * Start-/Game-Over-Zyklus neu aufgesetzt wird).
 */
export function setupOrientationWarning(): void {
  if (!isTouchCapable()) return;

  const overlay = document.createElement('div');
  overlay.className = 'orientation-warning';
  overlay.textContent = t('rotateDeviceHint');
  overlay.hidden = true;
  document.body.append(overlay);

  const update = (): void => {
    overlay.hidden = window.innerWidth >= window.innerHeight;
  };

  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
}
