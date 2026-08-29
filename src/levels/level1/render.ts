import { enemyFacingAngle, type Enemy } from '../../game/enemy';
import { enemyEyeGlowBlur } from '../../game/visualEffects';
import { ENEMY_EYE_GLOW_COLOR } from '../../game/visualEffectsConfig';
import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';

/**
 * Augenposition eines Gegners als Bruchteil der Sprite-Grösse relativ zum
 * Mittelpunkt (0,0) – aus den `cx`/`cy`/`r`-Werten der beiden grossen Augen
 * in `gegner.svg` (viewBox 220) bzw. `gegner-mini.svg` (viewBox 90)
 * abgeleitet, für den pulsierenden Glow-Überzug in `drawEnemySprite`
 * (Instruktion 17, Punkt 4). Rein artwork-abhängig und damit level-spezifisch,
 * deshalb hier statt in `visualEffectsConfig.ts`.
 */
interface EyeSpot {
  x: number;
  y: number;
  radiusFraction: number;
}
const MAIN_ENEMY_EYE_SPOTS: readonly EyeSpot[] = [
  { x: 98 / 220 - 0.5, y: 72 / 220 - 0.5, radiusFraction: 8 / 220 },
  { x: 122 / 220 - 0.5, y: 72 / 220 - 0.5, radiusFraction: 8 / 220 },
];
const MINI_ENEMY_EYE_SPOTS: readonly EyeSpot[] = [
  { x: 40 / 90 - 0.5, y: 30 / 90 - 0.5, radiusFraction: 3.5 / 90 },
  { x: 50 / 90 - 0.5, y: 30 / 90 - 0.5, radiusFraction: 3.5 / 90 },
];

function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  walkSprite: HTMLImageElement | undefined,
  useWalkFrame: boolean,
  e: Enemy,
  eyeSpots: readonly EyeSpot[],
  now: number,
  /** Zusätzlicher Render-Skalierungsfaktor über `e.size` hinaus (Nutzer-
   *  Feedback: Hauptgegner schrumpft, wenn ihm wenig erreichbarer Raum
   *  bleibt, siehe `enemyEncirclement.ts`) – Default 1 für Mini-Gegner,
   *  die davon unberührt bleiben. */
  sizeScale: number = 1,
): void {
  // In Bewegungsrichtung ausrichten (Sprite-Kopf zeigt lokal nach oben).
  const activeSprite = useWalkFrame && walkSprite ? walkSprite : sprite;
  const renderSize = e.size * sizeScale;
  ctx.save();
  ctx.translate(e.position.x, e.position.y);
  ctx.rotate(enemyFacingAngle(e.direction));
  ctx.drawImage(activeSprite, -renderSize / 2, -renderSize / 2, renderSize, renderSize);

  // Pulsierender Glow auf den Augen (Instruktion 17, Punkt 4). `shadowBlur`
  // ist hier unproblematisch (siehe Performance-Hinweis der Instruktion):
  // nur auf die zwei kleinen Augen-Kreise angewendet, nicht auf den ganzen
  // Gegner oder eine grosse Fläche.
  ctx.shadowColor = ENEMY_EYE_GLOW_COLOR;
  ctx.shadowBlur = enemyEyeGlowBlur(now);
  ctx.fillStyle = ENEMY_EYE_GLOW_COLOR;
  for (const spot of eyeSpots) {
    ctx.beginPath();
    ctx.arc(
      spot.x * renderSize,
      spot.y * renderSize,
      spot.radiusFraction * renderSize,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  ctx.restore();
}

/**
 * Gegner-Ebene von Level 1: Hauptgegner (sofern nicht beim Levelabschluss
 * ausgeblendet) + alle Mini-Gegner, jeweils mit ihrem SVG-Sprite in
 * konfigurierter Grösse, Bein-Pose im gemeinsamen Takt (`useWalkFrame`) und
 * pulsierendem Augen-Glow. Der Hauptgegner rendert zusätzlich mit
 * `mainEnemyScale` (Einkesselung), Mini-Gegner immer bei 1.
 *
 * Erfüllt `LevelEnemyRenderer` und wird pro Frame aus `render()` in `main.ts`
 * aufgerufen (`level.renderEnemies(...)`).
 */
export function renderLevel1Enemies(
  ctx: CanvasRenderingContext2D,
  assets: LevelEnemyAssets,
  state: LevelEnemyRenderState,
): void {
  const { mainEnemy, miniEnemies, mainEnemyScale, hideMainEnemy, useWalkFrame, now } = state;

  if (!hideMainEnemy) {
    drawEnemySprite(
      ctx,
      assets.mainEnemy,
      assets.mainEnemyWalk,
      useWalkFrame,
      mainEnemy,
      MAIN_ENEMY_EYE_SPOTS,
      now,
      mainEnemyScale,
    );
  }

  for (const mini of miniEnemies) {
    drawEnemySprite(
      ctx,
      assets.miniEnemy,
      assets.miniEnemyWalk,
      useWalkFrame,
      mini,
      MINI_ENEMY_EYE_SPOTS,
      now,
    );
  }
}
