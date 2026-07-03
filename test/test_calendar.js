import 'dotenv/config';
import { calendarService } from '../src/services/calendarService.js';

async function test() {
  console.log('Testing Google Calendar connection...');
  console.log('Using Calendar ID:', process.env.GOOGLE_CALENDAR_ID);

  console.log('\n--- 1. Testing LIST Events (Read Access) ---');
  const listRes = await calendarService.listEvents(15);
  if (listRes.success) {
    console.log('LIST SUCCESS! Found events:', listRes.events.length);
    listRes.events.forEach(e => console.log(` - ${e.summary} (Start: ${e.start}, End: ${e.end})`));
  } else {
    console.log('LIST FAILED:', listRes.error);
  }
}

test();
