export const de = {
  gameTitle: 'Wormfied',
  startButton: 'Spiel starten',
  loading: 'Lädt …',
} as const;

export type TranslationKey = keyof typeof de;
