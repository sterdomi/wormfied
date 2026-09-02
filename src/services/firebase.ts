import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase-Projektkonfiguration ("Flamel Surfer"-Projekt, Nutzer-Vorgabe).
 * Der API-Key hier ist NICHT geheim (Firebase-Webkonfiguration ist immer
 * clientseitig sichtbar) – der eigentliche Zugriffsschutz läuft über die
 * Firestore-Security-Rules (siehe `firestore.rules`), nicht über
 * Geheimhaltung dieser Werte.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyC9YKblERPI_xQz6to1r8UrYeGcJjdrz1s',
  authDomain: 'flamel-surfer.firebaseapp.com',
  projectId: 'flamel-surfer',
  storageBucket: 'flamel-surfer.firebasestorage.app',
  messagingSenderId: '734121837449',
  appId: '1:734121837449:web:a18bc1ac8f2f46eadad758',
};

const app = initializeApp(firebaseConfig);

/** Firestore-Instanz für den globalen Highscore (siehe `services/leaderboard.ts`). */
export const db = getFirestore(app);
