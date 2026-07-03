import { Firestore } from '@google-cloud/firestore';
import crypto from 'crypto';
import fs from 'fs';

// Lightweight drop-in replacement for Firestore using local JSON file
class FileDb {
  constructor() {
    this.filePath = './db.json';
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}));
    }
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch {
      return {};
    }
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  collection(name) {
    return new FileCollection(this, name);
  }
}

class FileCollection {
  constructor(db, name) {
    this.db = db;
    this.name = name;
  }

  doc(id) {
    return new FileDoc(this.db, this.name, id);
  }

  async add(data) {
    const id = crypto.randomUUID();
    const doc = new FileDoc(this.db, this.name, id);
    await doc.set(data);
    return { id, ...data };
  }

  orderBy(field, direction) {
    return this;
  }

  limit(num) {
    return this;
  }

  async get() {
    const data = this.db._read();
    const collectionData = data[this.name] || {};
    const docs = Object.keys(collectionData).map(id => ({
      id,
      exists: true,
      data: () => collectionData[id]
    }));
    return {
      forEach: (callback) => docs.forEach(callback)
    };
  }
}

class FileDoc {
  constructor(db, collectionName, id) {
    this.db = db;
    this.collectionName = collectionName;
    this.id = id;
  }

  collection(name) {
    return new FileCollection(this.db, `${this.collectionName}/${this.id}/${name}`);
  }

  async get() {
    const data = this.db._read();
    const docData = data[this.collectionName]?.[this.id];
    return {
      exists: !!docData,
      data: () => docData || {}
    };
  }

  async set(data) {
    const dbData = this.db._read();
    if (!dbData[this.collectionName]) {
      dbData[this.collectionName] = {};
    }
    dbData[this.collectionName][this.id] = data;
    this.db._write(dbData);
    return { success: true };
  }

  async update(data) {
    const dbData = this.db._read();
    if (!dbData[this.collectionName]) {
      dbData[this.collectionName] = {};
    }
    const current = dbData[this.collectionName][this.id] || {};
    dbData[this.collectionName][this.id] = { ...current, ...data };
    this.db._write(dbData);
    return { success: true };
  }

  async delete() {
    const dbData = this.db._read();
    if (dbData[this.collectionName]?.[this.id]) {
      delete dbData[this.collectionName][this.id];
      this.db._write(dbData);
    }
    return { success: true };
  }
}

let db;
let isFileDb = false;

const projectId = process.env.FIRESTORE_PROJECT_ID || '';
const isPlaceholder = !projectId || 
                      projectId.includes('שם_הפרויקט') || 
                      projectId === 'your_gcp_project_id_here';

if (process.env.NODE_ENV === 'test' || isPlaceholder) {
  if (isPlaceholder) {
    console.warn('⚠️ FIRESTORE_PROJECT_ID is empty or a placeholder. Falling back to local JSON FileDb.');
  }
  db = new FileDb();
  isFileDb = true;
} else {
  try {
    const firestoreOpts = { projectId };
    if (fs.existsSync('./service-account-creds.json')) {
      firestoreOpts.keyFilename = './service-account-creds.json';
    }
    db = new Firestore(firestoreOpts);
  } catch (err) {
    console.error('Failed to initialize Firestore, falling back to local JSON FileDb:', err.message);
    db = new FileDb();
    isFileDb = true;
  }
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
      
      return messages.reverse();
    } catch (error) {
      console.error(`Error fetching short-term memory for ${chatId}:`, error.message);
      if (!isFileDb) {
        console.warn('⚠️ Switching database to local JSON FileDb fallback...');
        db = new FileDb();
        isFileDb = true;
        return this.getShortTermContext(chatId);
      }
      return [];
    }
  }

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
      if (!isFileDb) {
        console.warn('⚠️ Switching database to local JSON FileDb fallback...');
        db = new FileDb();
        isFileDb = true;
        return this.addShortTermMessage(chatId, role, content);
      }
    }
  }

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
      if (!isFileDb) {
        console.warn('⚠️ Switching database to local JSON FileDb fallback...');
        db = new FileDb();
        isFileDb = true;
        return this.getLongTermMemory(chatId);
      }
      return {};
    }
  }

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
      if (!isFileDb) {
        console.warn('⚠️ Switching database to local JSON FileDb fallback...');
        db = new FileDb();
        isFileDb = true;
        return this.saveLongTermMemory(chatId, memoryObject);
      }
    }
  }
}

export const memoryService = new MemoryService();
export { db };
