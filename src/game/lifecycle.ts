import { STARTING_SHIELD, type PlayerState } from './playerState';

/**
 * Kern des Lebensverlust-Ablaufs: ein Leben abziehen, Schild wieder auffüllen
 * und – falls keine Leben mehr übrig sind – Game Over setzen.
 *
 * Bewusst OHNE die Kanone anzutasten (Nutzer-Feedback: "Wenn man einmal die
 * Kanone erhalten hat, verliert man sie nicht wieder im Level" – einmal
 * eingesammelt gilt sie für den Rest des Levels, auch über Treffer hinweg,
 * siehe `applyBonusStoneEffect` in `bonusStone.ts`).
 *
 * Die Rückgängig-Effekte (laufende Linie verwerfen, Foreground-Snapshot
 * zurückschreiben, Spielfigur zurück auf den Rand) und das visuelle Feedback
 * macht der Aufrufer – die hängen an Rendering-/Feld-Ressourcen und gehören
 * nicht in diese reine Zustandsfunktion.
 */
export function handleLifeLoss(state: PlayerState): void {
  state.lives = Math.max(0, state.lives - 1);
  state.shield = STARTING_SHIELD;
  if (state.lives <= 0) {
    state.isGameOver = true;
  }
}
