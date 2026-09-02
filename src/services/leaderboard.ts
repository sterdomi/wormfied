import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Firestore-Collection für den globalen Highscore. Eigener, spielspezifischer
 * Name (nicht einfach "scores") – das Firebase-Projekt `flamel-surfer` wird
 * bereits von einer anderen App (flamel) mit eigener Firestore-Nutzung
 * geteilt, ein Projekt hat aber nur EINE Firestore-Datenbank für alle darin
 * registrierten Apps. Ohne eigenen Namen würden sich die Highscores beider
 * Spiele in derselben Collection vermischen.
 */
const SCORES_COLLECTION = 'wormfied_scores';

/** Wie viele Plätze die globale Bestenliste anzeigt. */
export const LEADERBOARD_SIZE = 10;

/** Maximale Länge eines gespeicherten Spielernamens (siehe auch `firestore.rules`). */
export const PLAYER_NAME_MAX_LENGTH = 16;

export interface LeaderboardEntry {
  name: string;
  score: number;
}

/**
 * Übermittelt einen Score an die globale Bestenliste. Absichtlich
 * "fire-and-forget"-tauglich (wirft bei Netzwerk-/Rechteproblemen nicht bis
 * zum Aufrufer durch) – ein fehlgeschlagener Upload soll das lokale
 * Game-Over-Erlebnis nicht stören, siehe Aufruf in `app/main.ts`.
 */
export async function submitScore(name: string, score: number): Promise<void> {
  const trimmedName = name.trim().slice(0, PLAYER_NAME_MAX_LENGTH) || 'Anonym';
  try {
    await addDoc(collection(db, SCORES_COLLECTION), {
      name: trimmedName,
      score: Math.round(score),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[leaderboard] Score konnte nicht übermittelt werden:', error);
  }
}

/**
 * Lädt die Top `LEADERBOARD_SIZE` Einträge, absteigend nach Score. Gibt bei
 * Fehlern (z.B. Firestore noch nicht eingerichtet, siehe `firestore.rules`)
 * ein leeres Array zurück statt zu werfen – der Aufrufer zeigt dann einfach
 * keine Liste an.
 */
export async function fetchTopScores(): Promise<LeaderboardEntry[]> {
  try {
    const q = query(
      collection(db, SCORES_COLLECTION),
      orderBy('score', 'desc'),
      limit(LEADERBOARD_SIZE),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data() as { name?: unknown; score?: unknown };
      return {
        name: typeof data.name === 'string' ? data.name : 'Anonym',
        score: typeof data.score === 'number' ? data.score : 0,
      };
    });
  } catch (error) {
    console.error('[leaderboard] Bestenliste konnte nicht geladen werden:', error);
    return [];
  }
}
