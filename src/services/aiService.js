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
  // --- TODO LIST TOOLS ---
  {
    type: 'function',
    function: {
      name: 'addTodo',
      description: 'הוספת משימה לרשימת המטלות של המשתמש (Add a task to the todo list)',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'תיאור המשימה לעשייה' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'רמת העדיפות (ברירת מחדל: medium)' }
        },
        required: ['task']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listTodos',
      description: 'קבלת רשימת כל המשימות הפעילות וההושלמו (List all tasks)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'completeTodo',
      description: 'סימון משימה כהושלמה (Mark a task as completed)',
      parameters: {
        type: 'object',
        properties: {
          todoId: { type: 'string', description: 'מזהה המשימה (ID)' }
        },
        required: ['todoId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteTodo',
      description: 'מחיקת משימה מרשימת המטלות (Delete a task)',
      parameters: {
        type: 'object',
        properties: {
          todoId: { type: 'string', description: 'מזהה המשימה (ID)' }
        },
        required: ['todoId']
      }
    }
  },

  // --- FINANCIAL CALCULATOR ---
  {
    type: 'function',
    function: {
      name: 'calculateFinance',
      description: 'חישוב מע"מ והמרת מטבעות לשוק הישראלי (Finance calculator for VAT and currency conversion)',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'הסכום לחישוב' },
          type: {
            type: 'string',
            enum: ['add_vat', 'remove_vat', 'usd_to_ils', 'ils_to_usd'],
            description: 'סוג החישוב הפיננסי'
          }
        },
        required: ['amount', 'type']
      }
    }
  },

  // --- PANTRY & RECIPES ---
  {
    type: 'function',
    function: {
      name: 'updatePantry',
      description: 'עדכון מלאי במזווה - הוספה, עדכון כמות או מחיקה (Update pantry inventory)',
      parameters: {
        type: 'object',
        properties: {
          item: { type: 'string', description: 'שם המוצר/רכיב (באנגלית, למשל: egg, tomato, pasta)' },
          quantity: { type: 'number', description: 'הכמות החדשה במלאי (הזנת 0 תמחק את המוצר)' }
        },
        required: ['item', 'quantity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPantry',
      description: 'צפייה במלאי המוצרים הקיים במזווה (Get pantry inventory)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggestRecipes',
      description: 'קבלת הצעות למתכונים על בסיס הרכיבים הזמינים במזווה (Suggest recipes based on pantry items)',
      parameters: { type: 'object', properties: {} }
    }
  },

  // --- SOURDOUGH LOG ---
  {
    type: 'function',
    function: {
      name: 'logSourdough',
      description: 'תיעוד שלב באפיית לחם שאור (Log a sourdough baking step/feed)',
      parameters: {
        type: 'object',
        properties: {
          stage: { type: 'string', description: 'שלב האפייה/האכלה (למשל: starter_feeding, levain, bulk_fermentation, bake)' },
          durationMinutes: { type: 'number', description: 'משך הזמן בדקות של השלב הנוכחי' },
          notes: { type: 'string', description: 'הערות נוספות (למשל טמפרטורה, יחס האכלה, קמחים)' }
        },
        required: ['stage', 'durationMinutes']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSourdoughLog',
      description: 'צפייה ביומן אפיית השאור האחרון (Get sourdough logs)',
      parameters: { type: 'object', properties: {} }
    }
  },

  // --- INFO SERVICE ---
  {
    type: 'function',
    function: {
      name: 'getNews',
      description: 'קבלת עדכוני חדשות RSS בזמן אמת (Get real-time news updates)',
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
      name: 'getSports',
      description: 'קבלת מבזקי ספורט RSS בזמן אמת (Get sports flashes)',
      parameters: { type: 'object', properties: {} }
    }
  },

  // --- LEARNING SERVICE ---
  {
    type: 'function',
    function: {
      name: 'addVocab',
      description: 'שמירת מילה חדשה במילון האישי של המשתמש (Save new vocabulary word)',
      parameters: {
        type: 'object',
        properties: {
          word: { type: 'string', description: 'המילה בשפת המקור' },
          translation: { type: 'string', description: 'התרגום לעברית' },
          notes: { type: 'string', description: 'הערות דקדוק או דוגמה לשימוש במשפט' }
        },
        required: ['word', 'translation']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listVocab',
      description: 'קבלת אוצר המילים שהמשתמש שמר (List saved vocabulary)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'logMusicPractice',
      description: 'תיעוד אימון נגינה בכלי נגינה (Log music practice session)',
      parameters: {
        type: 'object',
        properties: {
          instrument: { type: 'string', description: 'כלי הנגינה (למשל: פסנתר, גיטרה, תופים)' },
          durationMinutes: { type: 'number', description: 'משך האימון בדקות' },
          notes: { type: 'string', description: 'מה תורגל, קצב (BPM), קשיים או הישגים' }
        },
        required: ['instrument', 'durationMinutes']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMusicPracticeLogs',
      description: 'הצגת יומן אימוני הנגינה של המשתמש (Get music practice logs)',
      parameters: { type: 'object', properties: {} }
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
          key: { type: 'string', description: 'מפתח השדה לעדכון - יש להשתמש תמיד בשם המפתח הליטרלי "key", למשל: "key": "name" או "key": "sourdoughPreferences"' },
          value: { type: 'string', description: 'הערך החדש לשמירה - יש להשתמש תמיד בשם המפתח הליטרלי "value", למשל: "value": "Zeppelin"' }
        },
        required: ['key', 'value']
      }
    }
  },
  // --- AUTOMATIONS AND SCHEDULER ---
  {
    type: 'function',
    function: {
      name: 'scheduleAutomation',
      description: 'תזמון משימה אוטומטית או תזכורת (Schedule a news summary, stock update, todo summary, custom reminder or AI prompt)',
      parameters: {
        type: 'object',
        properties: {
          time: { type: 'string', description: 'שעת ההרצה בפורמט HH:MM, למשל: "08:00", "23:00"' },
          frequency: { type: 'string', enum: ['daily', 'weekly'], description: 'תדירות ההרצה (ברירת מחדל: daily)' },
          actionType: { type: 'string', enum: ['news_summary', 'market_summary', 'todo_summary', 'custom_reminder', 'ai_prompt'], description: 'סוג המשימה להפעלה' },
          reminderText: { type: 'string', description: 'תוכן התזכורת או הנחיית ה-AI (חובה עבור custom_reminder ו-ai_prompt)' }
        },
        required: ['time', 'frequency', 'actionType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listAutomations',
      description: 'הצגת רשימת כל האוטומציות והתזכורות המתוזמנות הפעילות של המשתמש',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteAutomation',
      description: 'מחיקת אוטומציה או תזכורת מתוזמנת לפי מזהה ID',
      parameters: {
        type: 'object',
        properties: {
          scheduleId: { type: 'string', description: 'מזהה התזמון למחיקה (ID)' }
        },
        required: ['scheduleId']
      }
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
  {
    type: 'function',
    function: {
      name: 'generateImage',
      description: 'יצירה או עיצוב תמונה חדשה על בסיס תיאור מפורט. יש להקפיד לתרגם את תיאור המשתמש לאנגלית מפורטת ועשירה (Generate or design a new image. Always translate user description to detailed, rich English prompt)',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'תיאור התמונה באנגלית מפורטת (Detailed prompt in English)' }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateUserInterests',
      description: 'עדכון תחומי עניין, נושאים מועדפים, סגנון או דברים שעניינו את המשתמש לצורך התאמת המלצות ורעיונות בעתיד (Update user interests or topics they care about for future recommendations)',
      parameters: {
        type: 'object',
        properties: {
          interestText: { type: 'string', description: 'תחום העניין או הנושא המועדף שהמשתמש הביע בו עניין (e.g. "אפיית לחם שאור", "מניות טכנולוגיה", "סגנון ציור קומיקס")' }
        },
        required: ['interestText']
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
          symbol: { type: 'string', description: 'סימול המניה או המדד. לבורסות גלובליות יש להשתמש בסיומות יאהו פיננסים (e.g. "AAPL" לארה"ב, "TEVA.TA" לתל אביב, "7203.T" ליפן)' },
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
    const url = isGemini
      ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';
    
    const key = isGemini ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;
    const model = isGemini ? 'gemini-flash-lite-latest' : 'llama-3.3-70b-versatile';

    if (!key) {
      throw new Error(`API key for provider '${isGemini ? 'gemini' : 'groq'}' is missing in environment variables.`);
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

תחומי עניין מועדפים של המשתמש (לצורך התאמת המלצות ורעיונות עתידיות):
${interestsStr}

הזיכרון לטווח ארוך שלך אודות המשתמש (נתונים שמורים):
${memoryString}

יש לך גישה למגוון כלים (משימות, מחשבון פיננסי, מעקב מזווה ומתכונים, יומן לחם שאור, חדשות RSS, מניות, לימוד שפות, אימוני נגינה, תזמון אוטומציות, יצירת תמונות, עדכון תחומי עניין, וניהול תיק השקעות).
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
        if (messageObj.tool_calls && messageObj.tool_calls.length > 0) {
          console.log(`Executing ${messageObj.tool_calls.length} tool calls...`);
          
          for (const toolCall of messageObj.tool_calls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            let toolResult;

            console.log(`Calling tool: ${toolName} with args:`, args);

            try {
              toolResult = await this._executeTool(chatId, toolName, args, longTermMemory);
            } catch (err) {
              console.error(`Error executing tool ${toolName}:`, err.message);
              toolResult = { error: err.message };
            }

            // Append the tool response back to message history
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(toolResult)
            });
          }
          // Continue loop to let LLM see tool results and finalize text or run more tools
          continue;
        }

        // No tool calls: LLM returned final text response
        const textResponse = messageObj.content || '';
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
