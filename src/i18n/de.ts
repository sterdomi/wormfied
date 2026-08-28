export const de = {
  gameTitle: 'Wormfied',
  startButton: 'Spiel starten',
  loading: 'Lädt …',
  pressEnterToPlay: 'Enter drücken zum Spielen',
  gameOver: 'Game Over',
  levelComplete: 'Level geschafft!',
  restartHint: 'Enter drücken für Neustart',
  backToStartHint: 'Enter drücken oder warten – zurück zum Start',
  muteLabel: 'Ton stummschalten',
  unmuteLabel: 'Ton aktivieren',
  rotateDeviceHint: '📱 Bitte Gerät drehen – im Querformat spielen',
  controlsHintDesktop: 'Pfeiltasten/WASD bewegen · Leertaste andocken/abdocken/feuern',
  controlsHintTouch: 'Joystick bewegen · Knopf andocken/abdocken/feuern',
} as const;

export type TranslationKey = keyof typeof de;
