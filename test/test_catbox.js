import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

async function test() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  if (!fs.existsSync('./test_pollinations.jpg')) {
    console.error('test_pollinations.jpg does not exist. Please run test_pollinations.js first.');
    process.exit(1);
  }

  console.log('Uploading test_pollinations.jpg to Catbox...');
  
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream('./test_pollinations.jpg'));

  try {
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 30000
    });
    console.log('SUCCESS!');
    console.log('Returned URL:', res.data);
  } catch (err) {
    console.log('FAILED!');
    console.log('Error:', err.message);
  }
}

test();
