import { redactCreditCards } from '../src/services/securityFilter.js';
import { interestsService } from '../src/services/interestsService.js';
import fs from 'fs';

async function runTests() {
  console.log('=== TEST 1: Credit Card Redaction ===');
  
  const rawTexts = [
    'הנה הכרטיס שלי: 4580-1234-5678-9010 תודה!', // Valid Visa format (Luhn will check out)
    'הטלפון שלי הוא 972-53-426-7163', // Not a CC
    'הקוד הסודי הוא 1234567890123456', // 16 digit number that doesn't pass Luhn
    'כרטיס ויזה דוגמה: 4111 1111 1111 1111' // Valid Luhn Visa
  ];

  rawTexts.forEach(t => {
    const redacted = redactCreditCards(t);
    console.log(`\nOriginal: ${t}`);
    console.log(`Redacted: ${redacted}`);
  });

  console.log('\n=== TEST 2: Interests Profile ===');
  const chatId = 'test_user_123';
  
  // Clear existing test entries if file exists
  if (fs.existsSync('./interests.json')) {
    fs.unlinkSync('./interests.json');
  }

  console.log('Adding interests...');
  interestsService.addInterest(chatId, 'אפיית לחם שאור');
  interestsService.addInterest(chatId, 'מניות טכנולוגיה');
  interestsService.addInterest(chatId, 'סגנון ציור קומיקס');

  const interestsList = interestsService.getInterests(chatId);
  console.log('Stored interests list length:', interestsList.length);
  console.log('Formatted Interests Prompt:\n', interestsService.getInterestsPromptString(chatId));

  // Clean up
  if (fs.existsSync('./interests.json')) {
    fs.unlinkSync('./interests.json');
  }
}

runTests();
