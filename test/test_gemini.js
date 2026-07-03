import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log('Using Key:', key ? `${key.substring(0, 10)}...` : 'None');

async function testConnection(url, headers) {
  console.log(`\nTesting URL: ${url}`);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  
  const payload = {
    model: 'gemini-flash-lite-latest',
    messages: [{ role: 'user', content: 'תקבע לי פגישה היום ב-16:00 עם ליה' }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'createCalendarEvent',
          description: 'Create a calendar event',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              startTime: { type: 'string' },
              endTime: { type: 'string' }
            },
            required: ['summary', 'startTime', 'endTime']
          }
        }
      }
    ]
  };

  try {
    const res = await axios.post(url, payload, { headers, timeout: 10000 });
    console.log('SUCCESS!');
    console.log('Response choice:', JSON.stringify(res.data.choices?.[0]?.message, null, 2));
    return true;
  } catch (err) {
    console.log('FAILED!');
    console.log('Status:', err.response?.status);
    console.log('Error data:', JSON.stringify(err.response?.data, null, 2));
    return false;
  }
}

async function run() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // Option 1: v1beta, standard Bearer auth
  await testConnection(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  );

  // Option 2: v1beta, key in URL query parameter, and Bearer auth (some gateways want both)
  await testConnection(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${key}`,
    {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  );

  // Option 3: v1beta, key in URL ONLY, and dummy Authorization
  await testConnection(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${key}`,
    {
      'Authorization': 'Bearer dummy',
      'Content-Type': 'application/json'
    }
  );

  // Option 4: v1, standard Bearer auth
  await testConnection(
    'https://generativelanguage.googleapis.com/v1/openai/chat/completions',
    {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  );

  // Option 5: v1, key in URL query parameter, and Bearer auth
  await testConnection(
    `https://generativelanguage.googleapis.com/v1/openai/chat/completions?key=${key}`,
    {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  );

  // Option 6: List Models call
  console.log('\nListing available models...');
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const res = await axios.get(listUrl, { timeout: 10000 });
    console.log('LIST SUCCESS!');
    const models = res.data.models || [];
    console.log('Available models:', models.map(m => m.name));
  } catch (err) {
    console.log('LIST FAILED!');
    console.log('Status:', err.response?.status);
    console.log('Error data:', JSON.stringify(err.response?.data, null, 2));
  }
}

run();
