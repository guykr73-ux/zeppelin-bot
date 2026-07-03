import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Bypass TLS/SSL certificate checks to resolve local network/antivirus interception issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { aiService } from './src/services/aiService.js';
import { whatsappService } from './src/services/whatsappService.js';
import { memoryService } from './src/services/memoryService.js';
import { audioService } from './src/services/audioService.js';
import { ttsService } from './src/services/ttsService.js';
import { schedulerService } from './src/services/schedulerService.js';
import { redactCreditCards } from './src/services/securityFilter.js';

/**
 * HTTP Cloud Function entrypoint for Green API Webhooks.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
export async function whatsappWebhook(req, res) {
  // Handle GET request for health check / dashboard
  if (req.method === 'GET') {
    // Serve generated media files
    if (req.path.startsWith('/media/')) {
      const filename = path.basename(req.path);
      const filePath = path.join('./temp_media', filename);
      if (fs.existsSync(filePath)) {
        return res.sendFile(path.resolve(filePath));
      } else {
        return res.status(404).send('File not found');
      }
    }

    // Also allow triggering cron via GET /cron or GET ?cron=true
    if (req.path === '/cron' || req.query.cron === 'true') {
      console.log('[Cron] Triggered check via GET request...');
      await schedulerService.checkSchedules();
      return res.status(200).send({ status: 'success', message: 'Cron schedules checked.' });
    }
    return res.status(200).json({
      status: 'ok',
      bot: 'Zeppelin Cloud Engine',
      provider: process.env.AI_PROVIDER || 'gemini',
      uptime: Math.floor(process.uptime()) + 's',
      timestamp: new Date().toLocaleString('he-IL')
    });
  }

  // Handle cron path via POST
  if (req.path === '/cron') {
    console.log('[Cron] Triggered check via POST request...');
    await schedulerService.checkSchedules();
    return res.status(200).send({ status: 'success', message: 'Cron schedules checked.' });
  }

  // Only accept POST for webhooks
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed.');
  }

  const body = req.body;
  if (!body) {
    return res.status(400).send('Bad Request. Empty body.');
  }

  console.log('Received Green API Webhook:', JSON.stringify(body, null, 2));

  // Ignore old webhooks (older than 5 minutes / 300 seconds) to prevent replying to old backlog
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const messageAgeSeconds = currentTimestamp - body.timestamp;
  if (body.timestamp && messageAgeSeconds > 300) {
    console.log(`Ignoring old webhook from timestamp ${body.timestamp} (age: ${messageAgeSeconds}s).`);
    return res.status(200).send({ status: 'ignored', message: 'Message is too old.' });
  }

  // 1. Filter out anything that is NOT an incoming message or a user-sent outgoing message
  const allowedWebhooks = ['incomingMessageReceived', 'outgoingMessageReceived'];
  if (!allowedWebhooks.includes(body.typeWebhook)) {
    console.log(`Ignoring webhook type: ${body.typeWebhook}`);
    return res.status(200).send({ status: 'ignored', message: `Webhook type ${body.typeWebhook} ignored.` });
  }

  const senderData = body.senderData;
  const messageData = body.messageData;
  const instanceData = body.instanceData || {};

  if (!senderData || !messageData) {
    return res.status(400).send('Malformed webhook data. Missing senderData or messageData.');
  }

  // Security check: Ignore outgoing messages if they are not to ourselves (self-chat)
  if (body.typeWebhook === 'outgoingMessageReceived') {
    const isSelfChat = senderData.chatId === instanceData.wid || 
                       (senderData.chatId && instanceData.wid && senderData.chatId.split('@')[0] === instanceData.wid.split('@')[0]);
    if (!isSelfChat) {
      console.log(`Ignoring outgoing message to external contact: ${senderData.chatId}`);
      return res.status(200).send({ status: 'ignored', message: 'Outgoing message to another contact ignored.' });
    }
    console.log('Outgoing message is a self-chat. Processing to allow self-interaction!');
  }

  const chatId = senderData.chatId; // e.g. "972501234567@c.us"
  const senderName = senderData.senderName || 'User';

  console.log(`Processing message from ${senderName} (${chatId})`);

  try {
    let userText = '';

    let isIncomingVoice = false;
    let downloadUrl = '';

    const type = messageData.typeMessage;

    // 2. Parse text or voice message
    if (type === 'textMessage') {
      userText = messageData.textMessageData?.textMessage || '';
    } else if (type === 'extendedTextMessage') {
      userText = messageData.extendedTextMessageData?.text || '';
    } else if (type === 'audioMessage' || type === 'fileMessage') {
      const fileData = messageData.fileMessageData || {};
      const fileName = fileData.fileName || '';
      downloadUrl = fileData.downloadUrl || '';
      isIncomingVoice = (type === 'audioMessage') ||
                        fileName.endsWith('.ogg') ||
                        fileName.endsWith('.oga') ||
                        fileName.endsWith('.mp3') ||
                        fileName.endsWith('.wav') ||
                        fileName.toLowerCase().includes('voice') ||
                        fileName.toLowerCase().includes('audio') ||
                        downloadUrl?.includes('audio');
    } else {
      console.log(`Unsupported typeMessage: ${type}`);
      return res.status(200).send({ status: 'ignored', message: `Unsupported message type ${type}.` });
    }

    if (isIncomingVoice && downloadUrl) {
      // Transcribe voice message
      await whatsappService.sendMessage(chatId, '_מתמלל הודעה קולית..._ 🎙️');
      userText = await audioService.transcribeAudio(downloadUrl);
      await whatsappService.sendMessage(chatId, `*תמלול הודעה:* "${userText}"`);
    } else if (!userText || userText.trim() === '') {
      if (type !== 'textMessage' && type !== 'extendedTextMessage') {
        await whatsappService.sendMessage(chatId, 'שלום! זאפלין כרגע תומך רק בהודעות טקסט והודעות קוליות (לצורך תמלול ומענה). קבצים ותמונות אחרים אינם נתמכים כרגע. כיצד אוכל לעזור לך?');
        return res.status(200).send({ status: 'success', message: 'Notified user of unsupported media type.' });
      }
      return res.status(200).send({ status: 'success', message: 'Empty message text, ignoring.' });
    }

    // Fetch user profile preferences for voice response approval
    const profile = await memoryService.getLongTermMemory(chatId);
    let voiceReplyEnabled = profile.voiceReplyEnabled === true || profile.voiceReplyEnabled === 'true';

    // Handle voice reply settings triggers conversationally
    const cleanUserText = userText.trim().toLowerCase();
    if (cleanUserText === 'כן' || cleanUserText === 'תענה לי בקול' || cleanUserText === 'תפעיל מענה קולי') {
      profile.voiceReplyEnabled = 'true';
      await memoryService.saveLongTermMemory(chatId, profile);
      voiceReplyEnabled = true;
      
      const confirmText = 'הפעלתי מענה קולי! מעכשיו, בכל פעם שתשלח לי הודעה קולית, אשיב לך חזרה בהודעה קולית. 🎙️';
      await memoryService.addShortTermMessage(chatId, 'assistant', confirmText);
      
      const ttsUrl = ttsService.getSpeechUrl(confirmText);
      if (ttsUrl) {
        await whatsappService.sendFileByUrl(chatId, ttsUrl, 'confirm.mp3', '');
      } else {
        await whatsappService.sendMessage(chatId, confirmText);
      }
      return res.status(200).send({ status: 'success', message: 'Voice reply enabled.' });
    } else if (cleanUserText === 'תחזור לענות בטקסט' || cleanUserText === 'תכבה מענה קולי') {
      profile.voiceReplyEnabled = 'false';
      await memoryService.saveLongTermMemory(chatId, profile);
      voiceReplyEnabled = false;
      
      const confirmText = 'כיביתי את המענה הקולי. מעכשיו אשיב לך בטקסט בלבד. 📝';
      await memoryService.addShortTermMessage(chatId, 'assistant', confirmText);
      await whatsappService.sendMessage(chatId, confirmText);
      return res.status(200).send({ status: 'success', message: 'Voice reply disabled.' });
    }

    // Redact credit cards in incoming message
    userText = redactCreditCards(userText);

    // Save user message to short term context
    await memoryService.addShortTermMessage(chatId, 'user', userText);

    // 3. Generate response using AI engine and tools
    // Limit response size if we are doing a voice reply to avoid TTS truncation
    let promptSuffix = '';
    if (isIncomingVoice && voiceReplyEnabled) {
      promptSuffix = '\n(הודעה קולית נכנסה. אנא ענה בקיצור נמרץ של עד 150 תווים כדי שהתשובה תתאים להקראה קולית חלקה)';
    }
    
    const aiResponse = await aiService.generateResponse(chatId, userText + promptSuffix);

    // Save assistant message to short term context
    await memoryService.addShortTermMessage(chatId, 'assistant', aiResponse);

    // 4. Send response back to user via WhatsApp
    if (isIncomingVoice) {
      if (voiceReplyEnabled) {
        const ttsUrl = ttsService.getSpeechUrl(aiResponse);
        if (ttsUrl) {
          console.log(`Sending voice reply to ${chatId} using URL: ${ttsUrl}`);
          await whatsappService.sendFileByUrl(chatId, ttsUrl, 'voice_reply.mp3', '');
        } else {
          await whatsappService.sendMessage(chatId, aiResponse);
        }
      } else {
        // Send text but append approval offer
        const note = '\n\n*(נ.ב. הבנתי אותך מההודעה הקולית שלך. אם תרצה שאשיב לך מעתה בקולי, שלח לי את ההודעה "כן, תענה לי בקול"!)';
        await whatsappService.sendMessage(chatId, aiResponse + note);
      }
    } else {
      await whatsappService.sendMessage(chatId, aiResponse);
    }

    return res.status(200).send({ status: 'success', message: 'Response processed and sent.' });

  } catch (error) {
    console.error('Error handling webhook request:', error);
    try {
      await whatsappService.sendMessage(chatId, 'מתנצל, אירעה שגיאה פנימית במערכת שלי בעת עיבוד הבקשה.');
    } catch (sendErr) {
      console.error('Failed to notify user about error:', sendErr.message);
    }
    return res.status(500).send({ status: 'error', error: error.message });
  }
}

// Start local scheduler interval (checks every 60 seconds)
// This runs in the background during local execution.
// In cloud serverless environments, this interval will sleep, and we will rely on external cron triggers to /cron.
setInterval(() => {
  schedulerService.checkSchedules().catch(err => {
    console.error('Error in background scheduler check:', err.message);
  });
}, 60 * 1000);
console.log('⏰ Local scheduler background checker started (1-minute intervals).');
