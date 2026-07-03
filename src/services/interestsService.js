import fs from 'fs';

const INTERESTS_FILE = './interests.json';

class InterestsService {
  /**
   * Load interests from JSON file.
   */
  loadInterests() {
    try {
      if (fs.existsSync(INTERESTS_FILE)) {
        const raw = fs.readFileSync(INTERESTS_FILE, 'utf8');
        return JSON.parse(raw) || {};
      }
    } catch (error) {
      console.error('[Interests] Error loading interests:', error.message);
    }
    return {};
  }

  /**
   * Save interests to JSON file.
   */
  saveInterests(interests) {
    try {
      fs.writeFileSync(INTERESTS_FILE, JSON.stringify(interests, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('[Interests] Error saving interests:', error.message);
      return false;
    }
  }

  /**
   * Add/update interests for a user.
   * @param {string} chatId 
   * @param {string} interestText - The interest or topic details to save
   */
  addInterest(chatId, interestText) {
    if (!interestText) return { success: false, error: 'Interest text is empty.' };
    
    const interests = this.loadInterests();
    if (!interests[chatId]) {
      interests[chatId] = [];
    }

    // Keep it unique and add timestamp
    const cleanText = interestText.trim();
    const existingIdx = interests[chatId].findIndex(item => item.text.toLowerCase() === cleanText.toLowerCase());

    if (existingIdx !== -1) {
      interests[chatId][existingIdx].updatedAt = new Date().toISOString();
    } else {
      interests[chatId].push({
        text: cleanText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Keep only top 20 interests to prevent memory bloat
    if (interests[chatId].length > 20) {
      interests[chatId].shift();
    }

    this.saveInterests(interests);
    return { success: true, message: 'העדפת עניין עודכנה בהצלחה!' };
  }

  /**
   * Get list of interests for a user.
   */
  getInterests(chatId) {
    const interests = this.loadInterests();
    return interests[chatId] || [];
  }

  /**
   * Format interests into a string for LLM prompt context injection.
   */
  getInterestsPromptString(chatId) {
    const list = this.getInterests(chatId);
    if (list.length === 0) {
      return 'אין תחומי עניין מתועדים עדיין.';
    }
    return list.map(item => `- ${item.text}`).join('\n');
  }
}

export const interestsService = new InterestsService();
