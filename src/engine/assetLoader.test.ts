import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadImage, loadImages, loadLevelImages } from './assetLoader';

/**
 * Minimaler `Image`-Ersatz: merkt sich jede Instanz und feuert `onload` /
 * `onerror` erst, wenn der Test es explizit auslöst.
 */
class FakeImage {
  static instances: FakeImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = '';

  set src(value: string) {
    this.#src = value;
    FakeImage.instances.push(this);
  }
  get src(): string {
    return this.#src;
  }
}

const fakes = () => FakeImage.instances;

beforeEach(() => {
  FakeImage.instances = [];
  vi.stubGlobal('Image', FakeImage);
});
afterEach(() => vi.unstubAllGlobals());

const flush = () => Promise.resolve();

describe('loadImages', () => {
  it('löst erst auf, wenn ALLE Bilder geladen sind – in Eingabereihenfolge', async () => {
    let settled = false;
    const promise = loadImages(['a.png', 'b.png', 'c.png']).then((imgs) => {
      settled = true;
      return imgs;
    });

    await flush();
    expect(fakes()).toHaveLength(3);
    expect(fakes().map((f) => f.src)).toEqual(['a.png', 'b.png', 'c.png']);
    expect(settled).toBe(false);

    fakes()[0].onload?.();
    fakes()[2].onload?.();
    await flush();
    expect(settled).toBe(false); // b.png fehlt noch

    fakes()[1].onload?.();
    const imgs = await promise;
    expect(settled).toBe(true);
    expect(imgs.map((i) => (i as unknown as FakeImage).src)).toEqual(['a.png', 'b.png', 'c.png']);
  });
});

describe('loadImage', () => {
  it('lehnt ab, wenn das Bild nicht geladen werden kann', async () => {
    const promise = loadImage('kaputt.png');
    fakes()[0].onerror?.();
    await expect(promise).rejects.toThrow('kaputt.png');
  });
});

describe('loadLevelImages', () => {
  it('lädt Foreground, Background, Gegner- und Bonusstein-Sprites, benannt zurückgegeben', async () => {
    const promise = loadLevelImages({
      id: 'l',
      name: 'L',
      foregroundSrc: 'fg.png',
      backgroundSrc: 'bg.png',
      mainEnemy: { assetSrc: 'main.svg', speed: 90, size: 40 },
      miniEnemies: { count: 3, config: { assetSrc: 'mini.svg', speed: 120, size: 22 } },
      bonusStones: {
        spawning: { spawnIntervalSeconds: 10, maxSimultaneous: 2, lifetimeSeconds: 10, radius: 16 },
        speedBoost: { assetSrc: 'speed.svg', speedMultiplier: 2, effectDurationSeconds: 5 },
        cannon: {
          assetSrc: 'cannon.svg',
          fireIntervalSeconds: 0.35,
          projectileSpeed: 260,
          projectileSize: 14,
          projectileAssetSrc: 'playerBullet.svg',
        },
        freeze: { assetSrc: 'freeze.svg', effectDurationSeconds: 5 },
      },
    });
    await flush();
    fakes().forEach((f) => f.onload?.());
    const images = await promise;

    expect((images.foreground as unknown as FakeImage).src).toBe('fg.png');
    expect((images.background as unknown as FakeImage).src).toBe('bg.png');
    expect((images.mainEnemy as unknown as FakeImage).src).toBe('main.svg');
    expect((images.miniEnemy as unknown as FakeImage).src).toBe('mini.svg');
    expect((images.bonusSpeed as unknown as FakeImage).src).toBe('speed.svg');
    expect((images.bonusCannon as unknown as FakeImage).src).toBe('cannon.svg');
    expect((images.bonusFreeze as unknown as FakeImage).src).toBe('freeze.svg');
    expect((images.playerProjectile as unknown as FakeImage).src).toBe('playerBullet.svg');
    // Keine Lauf-Pose konfiguriert → nicht geladen, bleibt undefined.
    expect(images.mainEnemyWalk).toBeUndefined();
    expect(images.miniEnemyWalk).toBeUndefined();
  });

  it('lädt die optionale zweite Bein-Pose (Lauf-Animation), falls im Level konfiguriert', async () => {
    const promise = loadLevelImages({
      id: 'l',
      name: 'L',
      foregroundSrc: 'fg.png',
      backgroundSrc: 'bg.png',
      mainEnemy: { assetSrc: 'main.svg', walkAssetSrc: 'main-walk.svg', speed: 90, size: 40 },
      miniEnemies: {
        count: 3,
        config: { assetSrc: 'mini.svg', walkAssetSrc: 'mini-walk.svg', speed: 120, size: 22 },
      },
      bonusStones: {
        spawning: { spawnIntervalSeconds: 10, maxSimultaneous: 2, lifetimeSeconds: 10, radius: 16 },
        speedBoost: { assetSrc: 'speed.svg', speedMultiplier: 2, effectDurationSeconds: 5 },
        cannon: {
          assetSrc: 'cannon.svg',
          fireIntervalSeconds: 0.35,
          projectileSpeed: 260,
          projectileSize: 14,
          projectileAssetSrc: 'playerBullet.svg',
        },
        freeze: { assetSrc: 'freeze.svg', effectDurationSeconds: 5 },
      },
    });
    await flush();
    fakes().forEach((f) => f.onload?.());
    const images = await promise;

    expect((images.mainEnemyWalk as unknown as FakeImage).src).toBe('main-walk.svg');
    expect((images.miniEnemyWalk as unknown as FakeImage).src).toBe('mini-walk.svg');
  });
});
