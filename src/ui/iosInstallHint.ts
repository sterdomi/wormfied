import { isIPhone, isStandaloneDisplayMode } from '../engine/platform';
import { t } from '../i18n';

/**
 * "Zum Home-Bildschirm hinzufügen"-Hinweis (Instruktion 20, Punkt 3): die
 * Fullscreen API funktioniert auf iOS-Safari (und jedem anderen
 * iOS-Browser, da alle auf WebKit aufsetzen müssen) nicht – der PWA-Install
 * ist dort der einzige zuverlässige Weg zu einer Ansicht ohne Browser-Chrome.
 * iOS erlaubt es Web-Seiten nicht, diesen Vorgang programmatisch auszulösen,
 * daher nur ein Hinweis-Text, keine automatische Aktion.
 *
 * Nutzer-Feedback: die konkrete Anleitung ("Teilen-Symbol → Zum
 * Home-Bildschirm") gilt NUR fürs iPhone – auf dem Mac heisst der
 * entsprechende Weg "Zum Dock hinzufügen", auf Windows/Android ist der Weg
 * unklar/anders, daher `isIPhone()` statt des breiteren `isIOS()` (das auch
 * iPads einschliessen würde). Ausserdem sitzt der Hinweis (statt als
 * separates, permanent sichtbares Banner) direkt im Game-Over-Screen, wo
 * noch Platz ist – dort bekommt man ihn ohnehin nur zu sehen, wenn man
 * gerade nicht mitten im Spiel ist.
 *
 * `container` ist das `#gameover`-Element aus `hud.ts`; wird von dort bei
 * jedem `createHud()`-Aufruf neu befüllt (das Overlay selbst wird davor per
 * `replaceChildren()` geleert), ein eigenes `dispose()` ist daher nicht nötig.
 */
const DISMISSED_KEY = 'wormfied.iosInstallHintDismissed';

export function setupIosInstallHint(container: HTMLElement): void {
  if (!isIPhone() || isStandaloneDisplayMode()) return;
  if (readDismissed()) return;

  const hint = document.createElement('p');
  hint.className = 'overlay__ios-hint';

  const text = document.createElement('span');
  text.textContent = t('iosInstallHint');

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'overlay__ios-hint-close';
  closeButton.textContent = '✕';
  closeButton.setAttribute('aria-label', t('iosInstallDismiss'));
  closeButton.addEventListener('click', () => {
    hint.remove();
    writeDismissed();
  });

  hint.append(text, closeButton);
  container.append(hint);
}

/** `localStorage` kann in privaten/eingeschränkten Kontexten werfen – der
 *  Hinweis soll dann einfach jedes Mal erscheinen statt das Spiel zu blockieren. */
function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // Ignorieren – rein kosmetisches "nicht mehr anzeigen", kein Datenverlust.
  }
}
