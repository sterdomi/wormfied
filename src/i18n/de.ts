export const de = {
  gameTitle: 'Wormfied',
  startButton: 'Spiel starten',
  loading: 'Lädt …',
  pressEnterToPlay: 'Enter drücken zum Spielen',
  gameOver: 'Game Over',
  levelComplete: 'Level geschafft!',
  restartHint: 'Enter drücken für Neustart',
  backToStartHint: 'Enter drücken oder warten – zurück zum Start',
} as const;

export type TranslationKey = keyof typeof de;
