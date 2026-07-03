import { Firestore } from '@google-cloud/firestore';
import crypto from 'crypto';
import fs from 'fs';

// Initialize Firestore
// In production GCP, it will pick up project credentials automatically.
// For local emulation, we can configure project ID and use default settings or local emulator.
let db;
const projectId = process.env.FIRESTORE_PROJECT_ID || '';
const isPlaceholder = !projectId || 
                      projectId.includes('שם_הפרויקט') || 
                      projectId === 'your_gcp_project_id_here';

if (process.env.NODE_ENV === 'test' || isPlaceholder) {
  if (isPlaceholder) {
    console.warn('⚠️ FIRESTORE_PROJECT_ID is empty or a placeholder. Falling back to Mock In-Memory Database for local testing.');
  }
  // Lightweight mock of Firestore to prevent connection/auth errors during simulation tests and local runs
  const mockDb = {
    collection: () => mockDb,
    doc: () => mockDb,
    add: async (data) => ({ id: 'mock-doc-123', ...data }),
    get: async () => ({
      exists: false,
      forEach: () => {},
      data: () => ({})
    }),
    gather: async () => ({}),
    set: async () => ({ success: true }),
    update: async () => ({ success: true }),
    delete: async () => ({ success: true }),
    orderBy: () => mockDb,
    limit: () => mockDb,
    limitToLast: () => mockDb
  };
  db = mockDb;
} else {
  const firestoreOpts = { projectId };
  if (fs.existsSync('./service-account-creds.json')) {
    firestoreOpts.keyFilename = './service-account-creds.json';
  }
  db = new Firestore(firestoreOpts);
}

const ALGORITHM = 'aes-256-cbc';
const SALT = 'zeppelin-salt';

// Securely derive a 32-byte key from whatever ENCRYPTION_KEY is provided
const getEncryptionKey = () => {
  const userKey = process.env.ENCRYPTION_KEY || 'zeppelin-default-secret-key-32-chars';
  return crypto.scryptSync(userKey, SALT, 32);
};

class MemoryService {
  /**
   * Helper to encrypt text.
   * @param {string} text 
   * @returns {{ iv: string, ciphertext: string }}
   */
  encrypt(text) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let ciphertext = cipher.update(text, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    return {
      iv: iv.toString('hex'),
      ciphertext: ciphertext
    };
  }

  /**
   * Helper to decrypt text.
   * @param {string} ciphertext 
   * @param {string} ivHex 
   * @returns {string}
   */
  decrypt(ciphertext, ivHex) {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Get the last 10 messages for a specific chatId.
   * @param {string} chatId 
   * @returns {Promise<Array<{ role: string, content: string, timestamp: any }>>}
   */
  async getShortTermContext(chatId) {
    try {
      const messagesRef = db.collection('users').doc(chatId).collection('messages');
      const snapshot = await messagesRef.orderBy('timestamp', 'desc').limit(10).get();
      
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          role: data.role,
          content: data.content,
          timestamp: data.timestamp
        });
      });
      
      // Return in chronological order (oldest to newest)
      return messages.reverse();
    } catch (error) {
      console.error(`Error fetching short-term memory for ${chatId}:`, error.message);
      return [];
    }
  }

  /**
   * Append a new message to the short-term context.
   * @param {string} chatId 
   * @param {string} role - 'user' | 'assistant'
   * @param {string} content 
   */
  async addShortTermMessage(chatId, role, content) {
    try {
      const messagesRef = db.collection('users').doc(chatId).collection('messages');
      await messagesRef.add({
        role,
        content,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`Error saving short-term message for ${chatId}:`, error.message);
    }
  }

  /**
   * Get decrypted long-term memory for a user.
   * @param {string} chatId 
   * @returns {Promise<Object>} The parsed long-term memory object
   */
  async getLongTermMemory(chatId) {
    try {
      const docRef = db.collection('users').doc(chatId).collection('profile').doc('longTermMemory');
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return {};
      }

      const { ciphertext, iv } = doc.data();
      if (!ciphertext || !iv) {
        return {};
      }

      const decryptedStr = this.decrypt(ciphertext, iv);
      return JSON.parse(decryptedStr);
    } catch (error) {
      console.error(`Error fetching long-term memory for ${chatId}:`, error.message);
      return {};
    }
  }

  /**
   * Save long-term memory for a user by encrypting it first.
   * @param {string} chatId 
   * @param {Object} memoryObject - The data to encrypt and save
   */
  async saveLongTermMemory(chatId, memoryObject) {
    try {
      const docRef = db.collection('users').doc(chatId).collection('profile').doc('longTermMemory');
      const jsonStr = JSON.stringify(memoryObject);
      const { ciphertext, iv } = this.encrypt(jsonStr);

      await docRef.set({
        ciphertext,
        iv,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error(`Error saving long-term memory for ${chatId}:`, error.message);
    }
  }
}

export const memoryService = new MemoryService();
export { db };
