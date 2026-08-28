import { resolveAssetPath } from './assetPath';

export interface PlayOptions {
  /** 0–1, relativ zur Master-Lautstärke. Default 1. */
  volume?: number;
  /** Endlosschleife (z.B. der Zeichnen-Loop) statt einmaligem Abspielen. */
  loop?: boolean;
}

export interface AudioManager {
  /** Lädt eine Audiodatei per `fetch` + `decodeAudioData`, dekodiert unter `key` abrufbar. */
  loadSound: (key: string, src: string) => Promise<void>;
  /** Lädt mehrere Sounds parallel (analog zu `loadImages` in `assetLoader.ts`). */
  loadAll: (sounds: Record<string, string>) => Promise<void>;
  /**
   * Spielt einen geladenen Sound ab. `null`, wenn `key` (noch) nicht geladen
   * ist – bewusst kein Fehler, damit ein fehlender/verspäteter Sound nie das
   * Spiel blockiert. Der zurückgegebene Node wird nur für Loops gebraucht
   * (siehe `stop`), einmalige Sounds können ihn ignorieren.
   */
  play: (key: string, options?: PlayOptions) => AudioBufferSourceNode | null;
  /** Stoppt einen per `play` gestarteten (typischerweise Loop-)Sound. */
  stop: (node: AudioBufferSourceNode | null) => void;
  setMasterVolume: (value: number) => void;
  setMuted: (muted: boolean) => void;
}

/**
 * Web-Audio-basierter Sound-Manager (Instruktion 18). Fabrikfunktion mit
 * Closure-Zustand, wie `setupCanvas`/`setupInput`/`createHud` es in diesem
 * Projekt bereits vormachen.
 *
 * Der `AudioContext` wird beim ersten Laden erzeugt (wird für
 * `decodeAudioData` gebraucht, auch schon vor jeder Nutzer-Interaktion –
 * reines Dekodieren ist von der Autoplay-Sperre nicht betroffen), aber erst
 * bei der ersten Tastatur-/Zeige-Interaktion per `.resume()` fortgesetzt.
 * Ohne diesen Schritt bleiben Browser mit Autoplay-Sperre sonst dauerhaft
 * stumm, selbst wenn `play()` aufgerufen wird.
 */
export function createAudioManager(): AudioManager {
  let audioContext: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  const buffers = new Map<string, AudioBuffer>();
  let masterVolume = 1;
  let muted = false;

  function attachResumeOnFirstInteraction(ctx: AudioContext): void {
    const resume = (): void => {
      void ctx.resume();
      window.removeEventListener('keydown', resume);
      window.removeEventListener('pointerdown', resume);
    };
    window.addEventListener('keydown', resume);
    window.addEventListener('pointerdown', resume);
  }

  function ensureContext(): { ctx: AudioContext; destination: GainNode } {
    if (!audioContext || !masterGain) {
      audioContext = new AudioContext();
      masterGain = audioContext.createGain();
      masterGain.gain.value = muted ? 0 : masterVolume;
      masterGain.connect(audioContext.destination);
      attachResumeOnFirstInteraction(audioContext);
    }
    return { ctx: audioContext, destination: masterGain };
  }

  async function loadSound(key: string, src: string): Promise<void> {
    const { ctx } = ensureContext();
    const response = await fetch(resolveAssetPath(src));
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    buffers.set(key, buffer);
  }

  async function loadAll(sounds: Record<string, string>): Promise<void> {
    await Promise.all(Object.entries(sounds).map(([key, src]) => loadSound(key, src)));
  }

  function play(key: string, options: PlayOptions = {}): AudioBufferSourceNode | null {
    const buffer = buffers.get(key);
    if (!buffer) return null;

    const { ctx, destination } = ensureContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? false;

    // Eigener Gain-Node pro Wiedergabe (statt direkt auf `destination`), damit
    // sich einzelne Sounds unabhängig von der Master-Lautstärke abmischen
    // liessen – hier nur für den `volume`-Parameter genutzt.
    const gain = ctx.createGain();
    gain.gain.value = options.volume ?? 1;
    source.connect(gain);
    gain.connect(destination);

    source.start();
    return source;
  }

  function stop(node: AudioBufferSourceNode | null): void {
    if (!node) return;
    try {
      node.stop();
    } catch {
      // Bereits gestoppt/durchgelaufen (z.B. ein kurzer, nicht geloopter
      // Sound) – kein Fehlerfall, `AudioBufferSourceNode.stop()` wirft dann.
    }
  }

  function setMasterVolume(value: number): void {
    masterVolume = Math.max(0, Math.min(1, value));
    if (masterGain) masterGain.gain.value = muted ? 0 : masterVolume;
  }

  function setMuted(value: boolean): void {
    muted = value;
    if (masterGain) masterGain.gain.value = muted ? 0 : masterVolume;
  }

  return { loadSound, loadAll, play, stop, setMasterVolume, setMuted };
}
