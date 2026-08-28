import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveAssetPath } from './assetPath';

afterEach(() => vi.unstubAllEnvs());

describe('resolveAssetPath', () => {
  it('lässt Pfade ohne führenden Slash unverändert', () => {
    expect(resolveAssetPath('assets/foo.png')).toBe('assets/foo.png');
    expect(resolveAssetPath('a.png')).toBe('a.png');
  });

  it('hängt root-relative Pfade an die Standard-base "/" an (unverändert)', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(resolveAssetPath('/assets/foo.png')).toBe('/assets/foo.png');
  });

  it('löst root-relative Pfade gegen eine Subpath-base auf (z.B. build:wormfied-subpath)', () => {
    vi.stubEnv('BASE_URL', '/wormfied/');
    expect(resolveAssetPath('/assets/levels/level1/background.png')).toBe(
      '/wormfied/assets/levels/level1/background.png',
    );
  });
});
