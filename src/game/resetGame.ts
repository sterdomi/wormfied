import type { Point } from './field';
import type { Player } from './player';
import { resetPlayerState, type PlayerState } from './playerState';

/**
 * Kompletter Neustart nach Game Over – inhaltlich identisch zum Level-Start.
 *
 * `rebuildLevel` ist die (auch vom Resize genutzte) Level-Initialisierung:
 * setzt Feld-Polygon, Foreground (auf das Originalbild), Scoring und Gegner
 * zurück und liefert das frische Feld-Polygon. Danach werden Spielfigur und
 * Leben/Schild/Game-Over auf die Startwerte gesetzt. `finalize` räumt das
 * Übrige auf, das nur der Aufrufer kennt (HUD, laufende Zeichen-Session,
 * Foreground-Snapshot).
 */
export function resetGame(
  player: Player,
  playerState: PlayerState,
  rebuildLevel: () => Point[],
  finalize: () => void,
): void {
  const field = rebuildLevel();

  resetPlayerState(playerState);
  player.segmentIndex = 0;
  player.segmentProgress = 0;
  player.mode = 'onEdge';
  player.isUndocked = false;
  player.syncPosition(field);

  finalize();
}
