import { google } from 'googleapis';
import fs from 'fs';

class CalendarService {
  constructor() {
    this.calendar = null;
  }

  getCalendarId() {
    return process.env.GOOGLE_CALENDAR_ID || 'primary';
  }

  _initClient() {
    if (this.calendar) return;

    let credentials = null;
    const credsEnv = process.env.SERVICE_ACCOUNT_JSON;
    const credsPath = './service-account-creds.json';

    try {
      if (credsEnv) {
        credentials = JSON.parse(credsEnv);
      } else if (fs.existsSync(credsPath)) {
        const raw = fs.readFileSync(credsPath, 'utf8');
        credentials = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[Calendar] Error loading credentials:', err.message);
    }

    if (!credentials) {
      console.warn('[Calendar] Google Calendar credentials not configured. Please set SERVICE_ACCOUNT_JSON in .env or provide service-account-creds.json');
      return;
    }

    try {
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });

      this.calendar = google.calendar({ version: 'v3', auth });
    } catch (error) {
      console.error('[Calendar] Error initializing JWT client:', error.message);
    }
  }

  /**
   * List upcoming calendar events.
   * @param {number} maxResults - Max events to return
   */
  async listEvents(maxResults = 10) {
    this._initClient();
    const calendarId = this.getCalendarId();
    console.log('[Calendar] listEvents called. Calendar ID:', calendarId);
    if (!this.calendar) {
      return { success: false, error: 'חיבור ליומן גוגל אינו מוגדר עדיין. יש להגדיר תעודות גישה של Service Account בתיקייה או בקובץ ה-env.' };
    }

    try {
      const res = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = res.data.items || [];
      return {
        success: true,
        events: events.map(e => ({
          id: e.id,
          summary: e.summary,
          description: e.description || '',
          location: e.location || '',
          start: e.start.dateTime || e.start.date,
          end: e.end.dateTime || e.end.date,
          link: e.htmlLink
        }))
      };
    } catch (error) {
      console.error('[Calendar] Error listing events:', error.message);
      return { success: false, error: `שגיאה בשליפת פגישות מהיומן: ${error.message}` };
    }
  }

  /**
   * Create a new calendar event.
   * @param {string} summary - Event title
   * @param {string} startTime - ISO String (e.g. 2026-07-03T15:00:00+03:00)
   * @param {string} endTime - ISO String (e.g. 2026-07-03T16:00:00+03:00)
   * @param {string} description - Event description
   * @param {string} location - Event location
   */
  async createEvent(summary, startTime, endTime, description = '', location = '') {
    this._initClient();
    const calendarId = this.getCalendarId();
    console.log('[Calendar] createEvent called. Calendar ID:', calendarId);
    if (!this.calendar) {
      return { success: false, error: 'חיבור ליומן גוגל אינו מוגדר עדיין. יש להגדיר תעודות גישה של Service Account.' };
    }

    try {
      // Parse dates safely to ISO Strings
      const parsedStart = new Date(startTime).toISOString();
      const parsedEnd = new Date(endTime).toISOString();

      const event = {
        summary,
        location,
        description,
        start: {
          dateTime: parsedStart,
          timeZone: 'Asia/Jerusalem',
        },
        end: {
          dateTime: parsedEnd,
          timeZone: 'Asia/Jerusalem',
        }
      };

      const res = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });

      return {
        success: true,
        eventId: res.data.id,
        link: res.data.htmlLink,
        summary: res.data.summary,
        start: res.data.start.dateTime,
        end: res.data.end.dateTime
      };
    } catch (error) {
      console.error('[Calendar] Error creating event:', error.message);
      return { success: false, error: `שגיאה ביצירת פגישה ביומן: ${error.message}` };
    }
  }
}

export const calendarService = new CalendarService();
