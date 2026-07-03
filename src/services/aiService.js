import axios from 'axios';
import { memoryService } from './memoryService.js';
import { lifeService } from './lifeService.js';
import { infoService } from './infoService.js';
import { learningService } from './learningService.js';
import { schedulerService } from './schedulerService.js';
import { calendarService } from './calendarService.js';
import { whatsappService } from './whatsappService.js';
import { redactCreditCards } from './securityFilter.js';
import { interestsService } from './interestsService.js';
import { portfolioService } from './portfolioService.js';

const TOOLS = [
  // --- INFO & STOCK MARKET TOOLS ---
  {
    type: 'function',
    function: {
      name: 'getSports',
      description: 'קבלת מבזקי ספורט RSS בזמן אמת (Get sports flashes)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getStock',
      description: 'קבלת נתוני מניה ובורסה מעודכנים לפי סימול (Get stock quote)',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'סימול המניה (למשל AAPL, GOOG, TA35.TA)' }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMarketNews',
      description: 'הצגת כותרות וחדשות שווקים פיננסיים ובורסה מישראל והעולם (Get financial and global market news)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyzeStockTrend',
      description: 'ניתוח טכני ומחקר מגמות היסטורי למניה או מדד בבורסה, כולל ממוצעים נעים (SMA), תמיכה והתנגדות ומגמת שוק (Analyze historical stock trends, support/resistance, moving averages)',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'סימול המניה או המדד (e.g. AAPL, TEVA.TA)' },
          range: { type: 'string', enum: ['1mo', '3mo', '6mo', '1y'], description: 'הטווח ההיסטורי לניתוח (ברירת מחדל: "3mo")' }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addPortfolioHolding',
      description: 'הוספה או עדכון מנייה בתיק ההשקעות האישי של המשתמש (Add or update stock holding in portfolio)',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'סימול המניה (e.g. "AAPL", "ICL.TA")' },
          shares: { type: 'number', description: 'כמות המניות שנקנתה' },
          buyPrice: { type: 'number', description: 'מחיר הקנייה הממוצע למניה' }
        },
        required: ['symbol', 'shares', 'buyPrice']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'removePortfolioHolding',
      description: 'הסרת מנייה לחלוטין מתיק ההשקעות האישי של המשתמש (Remove stock holding from portfolio)',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'סימול המניה להסרה (e.g. "AAPL")' }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPortfolioPerformance',
      description: 'שליפת תיק ההשקעות וחישוב ביצועים, רווח/הפסד ושווי נוכחי של התיק בזמן אמת (Get portfolio holdings and live performance metrics)',
      parameters: { type: 'object', properties: {} }
    }
  },

  // --- GOOGLE CALENDAR TOOLS ---
  {
    type: 'function',
    function: {
      name: 'listCalendarEvents',
      description: 'שליפת אירועים ופגישות קרובות מיומן גוגל של המשתמש (List upcoming Google Calendar events)',
      parameters: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'מספר הפגישות המקסימלי לשליפה (ברירת מחדל: 10)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createCalendarEvent',
      description: 'תיאום או יצירת פגישה/אירוע חדש ביומן גוגל (Create a new Google Calendar event/meeting)',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'כותרת או נושא הפגישה (שם האירוע)' },
          startTime: { type: 'string', description: 'זמן תחילת הפגישה בפורמט ISO 8601 (למשל: 2026-07-03T15:00:00)' },
          endTime: { type: 'string', description: 'זמן סיום הפגישה בפורמט ISO 8601 (למשל: 2026-07-03T16:00:00)' },
          description: { type: 'string', description: 'תיאור או פרטים נוספים לפגישה (אופציונלי)' },
          location: { type: 'string', description: 'מיקום הפגישה או קישור לשיחה (אופציונלי)' }
        },
        required: ['summary', 'startTime', 'endTime']
      }
    }
  },

  // --- STATE / LONG-TERM MEMORY UPDATE ---
  {
    type: 'function',
    function: {
      name: 'updateLongTermMemory',
      description: 'עדכון הזיכרון לטווח ארוך של המשתמש (Update long-term encrypted memory preferences/facts)',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'מפתח השדה לעדכון - יש להשתמש תמיד בשם המפתח הליטרלי "key", למשל: "key": "name"' },
          value: { type: 'string', description: 'הערך החדש לשמירה - יש להשתמש תמיד בשם המפתח הליטרלי "value", למשל: "value": "Zeppelin"' }
        },
        required: ['key', 'value']
      }
    }
  }
];

class AiService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'groq'; // 'groq' or 'gemini'
  }

  /**
   * Helper to invoke the correct LLM completion endpoint.
   */
  async _callChatEndpoint(messages, toolsList) {
    const isGemini = this.provider === 'gemini' && process.env.GEMINI_API_KEY;
    
    if (isGemini) {
      try {
        console.log('[AI] Trying Gemini API...');
        const url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        const key = process.env.GEMINI_API_KEY;
        const model = 'gemini-flash-lite-latest';
        
        const payload = {
          model: model,
          messages: messages,
          tools: toolsList,
          tool_choice: 'auto'
        };

        const headers = {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        };

        const response = await axios.post(url, payload, { headers, timeout: 25000 });
        return response.data;
      } catch (geminiError) {
        console.error('[AI] Gemini API failed, falling back to Groq:', geminiError.message);
        if (geminiError.response) {
          console.error('Gemini Error Details:', JSON.stringify(geminiError.response.data, null, 2));
        }
        // Fall through to Groq
      }
    }

    // Groq API Call
    console.log('[AI] Calling Groq API...');
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const key = process.env.GROQ_API_KEY;
    const model = 'qwen/qwen3-32b';

    if (!key) {
      throw new Error(`API key for Groq is missing in environment variables.`);
    }

    const payload = {
      model: model,
      messages: messages,
      tools: toolsList,
      tool_choice: 'auto'
    };

    const headers = {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(url, payload, { headers, timeout: 25000 });
    return response.data;
  }

  /**
   * Main method to generate chat completion, executing tools recursively if needed.
   * @param {string} chatId - Sender's WhatsApp ID
   * @param {string} userMessage - The latest message text
   * @returns {Promise<string>} The response text to send back to the user
   */
  async generateResponse(chatId, userMessage) {
    // Sanitize user input immediately (redact credit cards)
    const sanitizedUserMessage = redactCreditCards(userMessage);

    // 1. Fetch context (short & long-term) and user interests
    const shortTermContext = await memoryService.getShortTermContext(chatId);
    const longTermMemory = await memoryService.getLongTermMemory(chatId);
    const interestsStr = interestsService.getInterestsPromptString(chatId);

    // 2. Build system prompt including long-term preferences, current time, security filters and interests
    const now = new Date();
    const optionsDate = { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' };
    const optionsTime = { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const optionsWeekday = { timeZone: 'Asia/Jerusalem', weekday: 'long' };
    
    const localDate = now.toLocaleDateString('he-IL', optionsDate).split('.').reverse().join('-');
    const localTime = now.toLocaleTimeString('he-IL', optionsTime);
    const weekday = now.toLocaleDateString('he-IL', optionsWeekday);

    const memoryString = JSON.stringify(longTermMemory, null, 2);

    const systemPrompt = `
שמך הוא זפלין ("Zeppelin") - עוזר אישי אינטואיטיבי, לומד ועצמאי בגרסת הענן.
עליך לענות בעברית תמיד, אלא אם פנו אליך בשפה אחרת.
התשובות שלך צריכות להיות קצרות, מדויקות, ממוקדות וענייניות, ללא חנופה או מילים מיותרות. 
אל תיזום הצעות פרואקטיביות או אמירות השראה אלא אם התבקשת לכך במפורש.

התאריך והשעה הנוכחיים בישראל:
- יום: ${weekday}
- תאריך: ${localDate}
- שעה: ${localTime}
(השתמש בתאריך זה כדי לחשב זמנים יחסיים כמו "היום", "מחר", "עוד שעה" וכו' עבור היומן).

🛑 הגבלות אבטחה ופרטיות חמורות (חובה לציית תמיד!):
1. הגנת כרטיסי אשראי: אין לבקש, לעבד, לשמור או להציג מספרי כרטיסי אשראי או פרטי תשלום רגישים. אם המשתמש מוסר אותם, התעלם מהם לחלוטין. הם נמחקים אוטומטית על ידי מסנן האבטחה בשרת.
2. בידוד דפדפן ואפליקציות בנקים: אין לך שום יכולת או רשות לגשת לדפדפן המשתמש, להכניס סיסמאות או קודים, או לפעול בתוך אפליקציות הבנק. אל תנסה לטעון שאתה מסוגל לבצע פעולות אלו! לזאפלין אין שום גישה פיזית למכשיר או לחשבונות המשתמש.
3. ⚠️ איסור כתיבת פקודות הרצת כלים כטקסט: אל תכתוב פקודות של הרצת כלים (למשל: <function...>, function=... או תבניות דומות) כטקסט חופשי בתוך התשובה שלך למשתמש! עליך להשתמש אך ורק ביכולת ה-Tool Calling המובנית של ה-API.

תחומי עניין מועדפים של המשתמש (לצורך התאמת המלצות ורעיונות עתידיות):
${interestsStr}

הזיכרון לטווח ארוך שלך אודות המשתמש (נתונים שמורים):
${memoryString}

יש לך גישה למגוון כלים (מניות, ספורט, יומן גוגל ועדכון הזיכרון לטווח ארוך).
כאשר המשתמש מבקש פעולה רלוונטית, הפעל את הכלי המתאים!
- עבור שאלות ספורט, ובמיוחד עדכוני פורמולה 1 (Formula 1), עליך להשתמש בכלי 'getSports' (המאחזר נתונים ישירות מ-Sky Sports F1 ומקורות ספורט נוספים).
- עבור מניות והמלצות השקעה בתיק: עליך לנתח את התיק וביצועי המניות כמשנֶה בכיר של וורן באפט (Warren Buffett). השתמש בגישת Value Investing, התמקד בשווי פנימי, שולי ביטחון (Margin of Safety), חפיר תחרותי (Moat), עמידות פיננסית, תשואה על ההון (ROE), יציבות תזרימית ורמות תמחור יחסיות לתמיכה/התנגדות היסטוריות. תן המלצות מקצועיות ומעמיקות של מומחה השקעות בכיר מאוד לקנייה/מכירה/דילול/החזקה.
- אם המשתמש משתף איתך מניות שיש לו, הצע להוסיף אותן לתיק בעזרת הכלי 'addPortfolioHolding'.
- אם המשתמש רוצה לדעת מה מצב התיק שלו או לקבל המלצות לשיפור, השתמש בכלי 'getPortfolioPerformance' ובצע עליו את הניתוח האנליטי הבכיר שלך.
אם המשתמש מספר לך פרט חדש וחשוב עליו, השתמש בכלי 'updateLongTermMemory' כדי לעדכן שדה מתאים בזיכרון לטווח ארוך (למשל: העדפה לענות בהודעות קוליות 'voiceReplyEnabled' או פרטי זיכרון אחרים).
אם המשתמש מספר לך על משהו שעניין אותו, נושא מועדף, סגנון עיצוב שאהב, או תחביב חדש - השתמש בכלי 'updateUserInterests' כדי לשמור זאת!
    `.trim();

    // 3. Assemble chat message history for the LLM
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add last 10 messages of history
    shortTermContext.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    // Add current user message
    messages.push({ role: 'user', content: sanitizedUserMessage });

    // 4. Interaction Loop to execute tool calls
    let loopCount = 0;
    const maxLoops = 5;

    while (loopCount < maxLoops) {
      loopCount++;
      try {
        console.log(`AI execution loop #${loopCount} for ${chatId}...`);
        const responseData = await this._callChatEndpoint(messages, TOOLS);
        const choice = responseData.choices?.[0];
        
        if (!choice) {
          throw new Error('Empty response from LLM provider.');
        }

        const messageObj = choice.message;
        messages.push(messageObj); // Add AI response message (which might contain tool_calls)

        // If there are tool calls, execute them
        let hasToolCalls = false;
        let parsedToolCalls = [];

        if (messageObj.tool_calls && messageObj.tool_calls.length > 0) {
          hasToolCalls = true;
          parsedToolCalls = messageObj.tool_calls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
          }));
        } else if (messageObj.content && messageObj.content.includes('<function(')) {
          const regex = /<function\(([^)]+)\)([\s\S]+?)><\/function>/;
          const match = messageObj.content.match(regex);
          if (match) {
            try {
              const name = match[1].trim();
              const args = JSON.parse(match[2].trim());
              hasToolCalls = true;
              parsedToolCalls = [{
                id: 'inline-tool-' + Math.random().toString(36).substr(2, 9),
                name: name,
                args: args,
                isInline: true
              }];
            } catch (err) {
              console.error('[AI] Failed to parse inline tool call JSON:', err.message);
            }
          }
        }

        if (hasToolCalls && parsedToolCalls.length > 0) {
          console.log(`Executing ${parsedToolCalls.length} tool calls...`);
          
          for (const toolCall of parsedToolCalls) {
            const toolName = toolCall.name;
            const args = toolCall.args;
            let toolResult;

            console.log(`Calling tool: ${toolName} with args:`, args);

            try {
              toolResult = await this._executeTool(chatId, toolName, args, longTermMemory);
            } catch (err) {
              console.error(`Error executing tool ${toolName}:`, err.message);
              toolResult = { error: err.message };
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(toolResult)
            });
          }
          continue;
        }

        // No tool calls: LLM returned final text response
        let textResponse = messageObj.content || '';
        textResponse = textResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        return redactCreditCards(textResponse);

      } catch (error) {
        console.error('Error in AI Service execution loop:', error.message);
        if (error.response) {
          console.error('AI Service Error Response Details:', JSON.stringify(error.response.data, null, 2));
          if (error.response.status === 429) {
            const providerName = this.provider === 'gemini' ? 'Gemini' : 'Groq';
            return `⏳ עמוס לי קצת כרגע (חריגת מגבלת פניות ל-${providerName}). אנא המתן מספר שניות ונסה לשלוח שוב!`;
          }
        }
        return 'מצטער, חלה שגיאה בעיבוד הבקשה שלך. אנא נסה שוב מאוחר יותר.';
      }
    }

    return 'מצטער, חריגה ממספר סבבי העיבוד המותרים עבור בקשה זו.';
  }

  /**
   * Router to execute the specific service methods.
   */
  async _executeTool(chatId, name, args, currentLongTermMemory) {
    switch (name) {
      case 'addTodo':
        return await lifeService.addTodo(chatId, args.task, args.priority);
      case 'listTodos':
        return await lifeService.listTodos(chatId);
      case 'completeTodo':
        return await lifeService.completeTodo(chatId, args.todoId);
      case 'deleteTodo':
        return await lifeService.deleteTodo(chatId, args.todoId);
      case 'calculateFinance':
        return lifeService.calculateFinance(args.amount, args.type);
      case 'updatePantry':
        return await lifeService.updatePantry(chatId, args.item, args.quantity);
      case 'getPantry':
        return await lifeService.getPantry(chatId);
      case 'suggestRecipes':
        return await lifeService.suggestRecipes(chatId);
      case 'logSourdough':
        return await lifeService.logSourdough(chatId, args.stage, args.durationMinutes, args.notes);
      case 'getSourdoughLog':
        return await lifeService.getSourdoughLog(chatId);
      case 'getNews':
        return await infoService.getNews();
      case 'getStock':
        return await infoService.getStock(args.symbol);
      case 'getMarketNews':
        return await infoService.getMarketNews();
      case 'analyzeStockTrend':
        return await infoService.analyzeStockTrend(args.symbol, args.range);
      case 'addPortfolioHolding':
        return portfolioService.addHolding(chatId, args.symbol, args.shares, args.buyPrice);
      case 'removePortfolioHolding':
        return portfolioService.removeHolding(chatId, args.symbol);
      case 'getPortfolioPerformance':
        return await portfolioService.getPortfolioPerformance(chatId);
      case 'getSports':
        return await infoService.getSports();
      case 'addVocab':
        return await learningService.addVocab(chatId, args.word, args.translation, args.notes);
      case 'listVocab':
        return await learningService.listVocab(chatId);
      case 'logMusicPractice':
        return await learningService.logMusicPractice(chatId, args.instrument, args.durationMinutes, args.notes);
      case 'getMusicPracticeLogs':
        return await learningService.getMusicPracticeLogs(chatId);
      case 'updateLongTermMemory': {
        const { key, value } = args;
        currentLongTermMemory[key] = value;
        await memoryService.saveLongTermMemory(chatId, currentLongTermMemory);
        return { success: true, message: `Updated long-term memory key '${key}'` };
      }
      case 'updateUserInterests': {
        const { interestText } = args;
        return interestsService.addInterest(chatId, interestText);
      }
      case 'scheduleAutomation': {
        const { time, frequency, actionType, reminderText } = args;
        const res = schedulerService.addSchedule(chatId, time, frequency, actionType, reminderText);
        return { success: true, message: `תזמנתי בהצלחה משימת ${actionType} לשעה ${time} (תדירות: ${frequency})`, schedule: res };
      }
      case 'listAutomations': {
        const list = schedulerService.listSchedules(chatId);
        return { success: true, count: list.length, automations: list };
      }
      case 'deleteAutomation': {
        const success = schedulerService.deleteSchedule(chatId, args.scheduleId);
        return { success, message: success ? 'האוטומציה נמחקה בהצלחה!' : 'לא מצאתי אוטומציה עם מזהה זה.' };
      }
      case 'listCalendarEvents': {
        return await calendarService.listEvents(args.maxResults);
      }
      case 'createCalendarEvent': {
        const { summary, startTime, endTime, description, location } = args;
        return await calendarService.createEvent(summary, startTime, endTime, description, location);
      }
      case 'generateImage': {
        const { prompt } = args;
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        console.log(`[Image] Generating image with Pollinations.ai for ${chatId}. Prompt: ${prompt}`);
        try {
          // 1. Download image from Pollinations.ai with generous timeout
          const downloadRes = await axios.get(pollinationsUrl, { responseType: 'arraybuffer', timeout: 35000 });
          
          // 2. Upload to Catbox for clean public URL (bypasses ngrok browser warning)
          const FormData = (await import('form-data')).default;
          const form = new FormData();
          form.append('reqtype', 'fileupload');
          form.append('fileToUpload', downloadRes.data, { filename: 'generated_image.jpg', contentType: 'image/jpeg' });
          
          console.log('[Image] Uploading generated image to Catbox...');
          const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
          });
          
          const cleanUrl = uploadRes.data.trim();
          console.log(`[Image] Catbox Upload Success. Clean URL: ${cleanUrl}`);
          
          // 3. Send file via Green API
          await whatsappService.sendFileByUrl(
            chatId,
            cleanUrl,
            'generated_image.jpg',
            `הציור מוכן! תיאור באנגלית: "${prompt}"`
          );
          return { success: true, message: 'התמונה עוצבה ונשלחה אליך בוואטסאפ בהצלחה!' };
        } catch (error) {
          console.error('[Image] Error generating/uploading image:', error.message);
          return { success: false, error: `שגיאה בעיצוב התמונה: ${error.message}` };
        }
      }
      default:
        throw new Error(`Tool ${name} is not implemented.`);
    }
  }
}

export const aiService = new AiService();
export { TOOLS };
