import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase-Projektkonfiguration ("flamel-surfer"-Projekt, Nutzer-Vorgabe) aus
 * `import.meta.env` (Vite). Die echten Werte stehen in `.env` (nicht im Repo,
 * siehe `.gitignore`); `.env.example` listet die benötigten Variablen.
 *
 * Hinweis: In einem reinen Client-Build landen diese Werte trotzdem im
 * ausgelieferten JS-Bundle – der Firebase-Web-API-Key ist ein öffentlicher
 * Projekt-Identifier, kein Geheimnis. Der eigentliche Zugriffsschutz läuft
 * über die Firestore-Security-Rules (`firestore.rules`) und die
 * API-Key-Restriktionen in der Google-Cloud-Console, nicht über Geheimhaltung.
 * Die Werte liegen nur deshalb in `.env`, damit der Key nicht im Git-Verlauf
 * steht (GitHub-Secret-Scanning).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

/** Firestore-Instanz für den globalen Highscore (siehe `services/leaderboard.ts`). */
export const db = getFirestore(app);
