import { db } from './memoryService.js';

class LearningService {
  // --- LANGUAGE LEARNING METHODS ---
  async addVocab(chatId, word, translation, notes = '') {
    try {
      const colRef = db.collection('users').doc(chatId).collection('vocabulary');
      const docRef = await colRef.add({
        word,
        translation,
        notes,
        createdAt: new Date()
      });
      return { success: true, id: docRef.id, word, translation, notes };
    } catch (error) {
      console.error('Error adding vocabulary:', error.message);
      return { success: false, error: error.message };
    }
  }

  async listVocab(chatId) {
    try {
      const colRef = db.collection('users').doc(chatId).collection('vocabulary');
      const snapshot = await colRef.orderBy('createdAt', 'desc').get();
      const vocab = [];
      snapshot.forEach(doc => {
        vocab.push({ id: doc.id, ...doc.data() });
      });
      return vocab;
    } catch (error) {
      console.error('Error listing vocabulary:', error.message);
      return [];
    }
  }

  // --- MUSIC PRACTICE LOG METHODS ---
  async logMusicPractice(chatId, instrument, durationMinutes, notes = '') {
    try {
      const colRef = db.collection('users').doc(chatId).collection('musicPractice');
      const docRef = await colRef.add({
        instrument,
        durationMinutes: parseInt(durationMinutes) || 0,
        notes,
        timestamp: new Date()
      });
      return { success: true, id: docRef.id, instrument, durationMinutes, notes };
    } catch (error) {
      console.error('Error logging music practice:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getMusicPracticeLogs(chatId) {
    try {
      const colRef = db.collection('users').doc(chatId).collection('musicPractice');
      const snapshot = await colRef.orderBy('timestamp', 'desc').limit(20).get();
      const logs = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      return logs;
    } catch (error) {
      console.error('Error getting music practice logs:', error.message);
      return [];
    }
  }

  // --- PROMPT ORCHESTRATION HELPERS ---
  getPersonaPrompt(mode) {
    if (mode === 'language') {
      return `
You are Zeppelin, acting as a supportive Language Learning Tutor.
- Practice conversation, correct grammar gently, translate terms, and explain sentence structures.
- Store new words in the user's vocabulary list using the 'addVocab' tool when they express interest in remembering a word.
- Translate Hebrew expressions to the target language and vice versa.
      `.trim();
    }
    if (mode === 'music') {
      return `
You are Zeppelin, acting as a Music Practice Coach.
- Guide practice sessions, suggest metronome drills, structure exercises, and answer music theory queries.
- Help log sessions using 'logMusicPractice'.
      `.trim();
    }
    return '';
  }
}

export const learningService = new LearningService();
