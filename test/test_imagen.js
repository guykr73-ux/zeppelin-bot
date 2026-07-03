import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('GEMINI_API_KEY is not defined.');
  process.exit(1);
}

async function test() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const model = 'imagen-4.0-generate-001'; // Let's try both 3.0 and 4.0 if needed
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`;

  console.log(`Testing Imagen API on URL: ${url}`);
  
  const payload = {
    instances: [
      {
        prompt: 'A cute red panda wearing a detective hat, digital art'
      }
    ],
    parameters: {
      numberOfImages: 1,
      aspectRatio: '1:1',
      outputMimeType: 'image/jpeg'
    }
  };

  try {
    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log('SUCCESS!');
    console.log('Predictions length:', res.data.predictions?.length);
    if (res.data.predictions && res.data.predictions.length > 0) {
      const base64Bytes = res.data.predictions[0].bytesBase64Encoded;
      const buffer = Buffer.from(base64Bytes, 'base64');
      fs.writeFileSync('./test_image.jpg', buffer);
      console.log('Saved image successfully to ./test_image.jpg!');
    } else {
      console.log('Response structure:', JSON.stringify(res.data, null, 2));
    }
  } catch (err) {
    console.log('FAILED!');
    console.log('Status:', err.response?.status);
    console.log('Error data:', JSON.stringify(err.response?.data, null, 2));
  }
}

test();
