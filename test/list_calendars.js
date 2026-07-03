import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const credsPath = './service-account-creds.json';
if (!fs.existsSync(credsPath)) {
  console.error('Credentials file not found.');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

async function run() {
  console.log('Querying Google Calendar list for service account...');
  try {
    const res = await calendar.calendarList.list();
    const list = res.data.items || [];
    console.log(`Found ${list.length} calendars:`);
    list.forEach(c => {
      console.log(`\n- Summary: ${c.summary}`);
      console.log(`  ID: ${c.id}`);
      console.log(`  Access Role: ${c.accessRole}`);
      console.log(`  Primary: ${c.primary || false}`);
    });
  } catch (error) {
    console.error('Error listing calendars:', error.message);
  }
}

run();
