import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const url = 'https://api.groq.com/openai/v1/chat/completions';
const key = process.env.GROQ_API_KEY;

const payload = {
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Say hello in Hebrew' }]
};

const headers = {
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json'
};

async function test() {
  try {
    const res = await axios.post(url, payload, { headers });
    console.log('GROQ SUCCESS:', res.data.choices[0].message.content);
  } catch (err) {
    console.error('GROQ FAILED:', err.response ? err.response.data : err.message);
  }
}

test();
