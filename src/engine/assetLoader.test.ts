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
  it('liefert Foreground und Background benannt', async () => {
    const promise = loadLevelImages({ foregroundSrc: 'fg.png', backgroundSrc: 'bg.png' });
    await flush();
    fakes().forEach((f) => f.onload?.());
    const images = await promise;

    expect((images.foreground as unknown as FakeImage).src).toBe('fg.png');
    expect((images.background as unknown as FakeImage).src).toBe('bg.png');
  });
});
