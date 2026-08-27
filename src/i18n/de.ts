export const de = {
  gameTitle: 'Wormfied',
  startButton: 'Spiel starten',
  loading: 'Lädt …',
  gameOver: 'Game Over',
  levelComplete: 'Level geschafft!',
  restartHint: 'Enter drücken für Neustart',
} as const;

export type TranslationKey = keyof typeof de;
