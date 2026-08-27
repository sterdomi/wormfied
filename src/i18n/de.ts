export const de = {
  gameTitle: 'Wormfied',
  startButton: 'Spiel starten',
  loading: 'Lädt …',
  gameOver: 'Game Over',
  restartHint: 'Enter drücken für Neustart',
} as const;

export type TranslationKey = keyof typeof de;
