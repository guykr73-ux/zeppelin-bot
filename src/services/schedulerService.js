import fs from 'fs';
import path from 'path';
import { whatsappService } from './whatsappService.js';
import { infoService } from './infoService.js';
import { lifeService } from './lifeService.js';
import { aiService } from './aiService.js';

const SCHEDULES_FILE = './schedules.json';

class SchedulerService {
  /**
   * Load schedules from JSON file.
   */
  loadSchedules() {
    try {
      if (fs.existsSync(SCHEDULES_FILE)) {
        const rawData = fs.readFileSync(SCHEDULES_FILE, 'utf8');
        return JSON.parse(rawData) || [];
      }
    } catch (error) {
      console.error('Error loading schedules:', error.message);
    }
    return [];
  }

  /**
   * Save schedules to JSON file.
   */
  saveSchedules(schedules) {
    try {
      fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving schedules:', error.message);
      return false;
    }
  }

  /**
   * Add a new dynamic schedule.
   * @param {string} chatId 
   * @param {string} time - format "HH:MM" (e.g. "08:00")
   * @param {string} frequency - "daily" | "weekly"
   * @param {string} actionType - "news_summary" | "market_summary" | "todo_summary" | "custom_reminder" | "ai_prompt"
   * @param {string} reminderText - text for custom reminders or AI prompts
   */
  addSchedule(chatId, time, frequency = 'daily', actionType, reminderText = '') {
    const schedules = this.loadSchedules();
    const newSchedule = {
      id: `sched_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      chatId,
      time: time.trim(),
      frequency: frequency.toLowerCase(),
      actionType: actionType.toLowerCase(),
      reminderText: reminderText.trim(),
      lastTriggeredDate: '',
      createdAt: new Date().toISOString()
    };

    schedules.push(newSchedule);
    this.saveSchedules(schedules);
    return newSchedule;
  }

  /**
   * List schedules for a specific user.
   */
  listSchedules(chatId) {
    const schedules = this.loadSchedules();
    return schedules.filter(s => s.chatId === chatId);
  }

  /**
   * Delete a schedule by ID.
   */
  deleteSchedule(chatId, id) {
    const schedules = this.loadSchedules();
    const filtered = schedules.filter(s => !(s.id === id && s.chatId === chatId));
    if (filtered.length === schedules.length) {
      return false; // Not found
    }
    this.saveSchedules(filtered);
    return true;
  }

  /**
   * Core execution: check if any schedules are due right now and trigger them.
   */
  async checkSchedules() {
    const now = new Date();
    // Get local time strings
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    const schedules = this.loadSchedules();
    let updated = false;

    console.log(`[Scheduler] Checking schedules for time: ${nowTime}, date: ${todayStr}...`);

    for (const s of schedules) {
      if (s.time === nowTime && s.lastTriggeredDate !== todayStr) {
        console.log(`[Scheduler] Triggering schedule ${s.id} (${s.actionType}) for ${s.chatId}`);
        
        try {
          await this.executeAction(s.chatId, s.actionType, s.reminderText);
          s.lastTriggeredDate = todayStr;
          updated = true;
        } catch (err) {
          console.error(`[Scheduler] Error running schedule ${s.id}:`, err.message);
        }
      }
    }

    if (updated) {
      this.saveSchedules(schedules);
    }
  }

  /**
   * Run the actual scheduled task.
   */
  async executeAction(chatId, actionType, reminderText) {
    switch (actionType) {
      case 'news_summary': {
        const newsResult = await infoService.getNews();
        if (newsResult.success && newsResult.items?.length > 0) {
          const summary = `📰 *סיכום חדשות אוטומטי* 📰\n\n` + 
            newsResult.items.map((item, idx) => `*${idx + 1}. ${item.title}*\n${item.summary.replace(/<[^>]*>/g, '').slice(0, 120)}...\n`).join('\n');
          await whatsappService.sendMessage(chatId, summary);
        } else {
          await whatsappService.sendMessage(chatId, '📰 *עדכון אוטומטי:* לא הצלחתי לטעון חדשות כעת.');
        }
        break;
      }

      case 'market_summary': {
        const result = [];
        const tickers = ['AAPL', 'GOOG', 'TA35.TA'];
        for (const ticker of tickers) {
          const data = await infoService.getStock(ticker);
          if (data.success) {
            result.push(`• *${data.symbol}*: ${data.price} ${data.currency} (${data.changePercent >= 0 ? '+' : ''}${data.changePercent}%)`);
          }
        }
        const message = `📊 *עדכון בורסה אוטומטי* 📊\n\n` + (result.length > 0 ? result.join('\n') : 'לא הצלחתי לשלוף מדדי מניות כעת.');
        await whatsappService.sendMessage(chatId, message);
        break;
      }

      case 'todo_summary': {
        const activeTodos = await lifeService.listTodos(chatId);
        const openTodos = activeTodos.filter(t => !t.completed);
        if (openTodos.length === 0) {
          await whatsappService.sendMessage(chatId, '📋 *עדכון משימות אוטומטי:* אין לך משימות פתוחות כרגע! יום נקי ורגוע. ✨');
        } else {
          const list = openTodos.map((t, idx) => `${t.priority === 'high' ? '🚨' : '🔹'} *[${idx + 1}]* ${t.task}`).join('\n');
          await whatsappService.sendMessage(chatId, `📋 *סיכום משימות פתוחות* 📋\n\n${list}`);
        }
        break;
      }

      case 'custom_reminder': {
        await whatsappService.sendMessage(chatId, `🚨 *תזכורת אוטומטית:* ${reminderText} ⏰`);
        break;
      }

      case 'ai_prompt': {
        // Run custom instruction through Gemini
        const aiResponse = await aiService.generateResponse(chatId, `הנחיה אוטומטית מתוזמנת: ${reminderText}`);
        await whatsappService.sendMessage(chatId, aiResponse);
        break;
      }

      default:
        console.warn(`[Scheduler] Unknown actionType: ${actionType}`);
    }
  }
}

export const schedulerService = new SchedulerService();
