import axios from 'axios';
import fs from 'fs';

async function test() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const prompt = 'a photorealistic red apple on a dark background';
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;

  console.log(`Testing Pollinations.ai on URL: ${url}`);

  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    console.log('SUCCESS!');
    fs.writeFileSync('./test_pollinations.jpg', res.data);
    console.log('Saved image successfully to ./test_pollinations.jpg!');
  } catch (err) {
    console.log('FAILED!');
    console.log('Error:', err.message);
  }
}

test();
