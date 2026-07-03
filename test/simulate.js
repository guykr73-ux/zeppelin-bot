import './setupEnv.js';
import { whatsappWebhook } from '../index.js';
import { whatsappService } from '../src/services/whatsappService.js';
import { memoryService } from '../src/services/memoryService.js';
import { aiService } from '../src/services/aiService.js';

// --- IN-MEMORY DB MOCK ---
const mockShortTermDb = new Map(); // chatId -> array of messages
const mockLongTermDb = new Map();  // chatId -> object profile

console.log('=== Initializing Mock Services for Zeppelin Simulation ===');

// 1. Mock WhatsappService
whatsappService.sendMessage = async (chatId, message) => {
  console.log(`\n📬 [MOCK WHATSAPP SEND] to ${chatId}:\n----------------------------------------\n${message}\n----------------------------------------`);
  return { messageId: 'mock-msg-123' };
};

whatsappService.sendFileByUrl = async (chatId, urlFile, fileName, caption) => {
  console.log(`\n📬 [MOCK WHATSAPP SEND FILE] to ${chatId}: url=${urlFile}, file=${fileName}, caption=${caption}`);
  return { messageId: 'mock-file-123' };
};

// 2. Mock MemoryService
memoryService.getShortTermContext = async (chatId) => {
  if (!mockShortTermDb.has(chatId)) {
    mockShortTermDb.set(chatId, []);
  }
  return mockShortTermDb.get(chatId);
};

memoryService.addShortTermMessage = async (chatId, role, content) => {
  if (!mockShortTermDb.has(chatId)) {
    mockShortTermDb.set(chatId, []);
  }
  mockShortTermDb.get(chatId).push({ role, content, timestamp: new Date() });
  console.log(`💾 [MOCK MEMORY SAVE] Short-term message added for ${chatId}: [${role}] "${content.substring(0, 40)}..."`);
};

memoryService.getLongTermMemory = async (chatId) => {
  if (!mockLongTermDb.has(chatId)) {
    mockLongTermDb.set(chatId, { name: 'בדיקת סימולציה', preferences: 'חובב אפייה' });
  }
  return mockLongTermDb.get(chatId);
};

memoryService.saveLongTermMemory = async (chatId, data) => {
  mockLongTermDb.set(chatId, data);
  console.log(`🔒 [MOCK MEMORY SAVE] Long-term memory updated/encrypted for ${chatId}:`, JSON.stringify(data));
};

// 3. Mock AI Chat Endpoint
// We simulate the LLM's response. To test tool calling, we will make it call a tool on the first turn,
// and then return a final answer on the second turn.
let aiCallCount = 0;
aiService._callChatEndpoint = async (messages, toolsList) => {
  aiCallCount++;
  console.log(`🤖 [MOCK AI CALL] Turn #${aiCallCount}. Last user input: "${messages[messages.length - 1].content}"`);

  if (aiCallCount === 1) {
    // Simulate a tool call: LLM wants to add a Todo task
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'אני אוסיף את המשימה הזו לרשימת המשימות שלך.',
            tool_calls: [
              {
                id: 'call_abc123',
                type: 'function',
                function: {
                  name: 'addTodo',
                  arguments: JSON.stringify({ task: 'לקנות קמח שאור 100% מלא', priority: 'high' })
                }
              }
            ]
          }
        }
      ]
    };
  }

  // Second turn: LLM observes the tool result and finishes the text response
  return {
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'הוספתי בהצלחה את המשימה "לקנות קמח שאור 100% מלא" בעדיפות גבוהה לרשימת המטלות שלך! 🥖 האם תרצה שאעזור לך בעוד משהו?'
        }
      }
    ]
  };
};

// --- SIMULATING THE WEBHOOK INVOCATION ---
async function runSimulation() {
  console.log('\n🚀 --- Starting Zeppelin Webhook Simulation ---');

  // Construct mock Express request/response objects
  const mockReq = {
    method: 'POST',
    body: {
      typeWebhook: 'incomingMessageReceived',
      instanceData: {
        idInstance: 9999,
        wid: '972501234567@c.us'
      },
      senderData: {
        chatId: '972501234567@c.us',
        senderName: 'ערן השף'
      },
      messageData: {
        typeMessage: 'textMessage',
        textMessageData: {
          textMessage: 'זאפלין, תוסיף משימה לקנות קמח שאור'
        }
      }
    }
  };

  let statusSet = 200;
  let responseData = null;

  const mockRes = {
    status: (code) => {
      statusSet = code;
      return mockRes;
    },
    send: (data) => {
      responseData = data;
      return mockRes;
    }
  };

  // Run the webhook handler
  await whatsappWebhook(mockReq, mockRes);

  console.log('\n🏁 --- Simulation Finished ---');
  console.log(`HTTP Response Status: ${statusSet}`);
  console.log('HTTP Response Body:', responseData);

  // Assert short term memory size
  const chatHistory = mockShortTermDb.get('972501234567@c.us') || [];
  console.log(`\n📊 Final Short-term message history length: ${chatHistory.length}`);
  console.log('Messages in history:');
  chatHistory.forEach((h, i) => {
    console.log(`  ${i + 1}. [${h.role.toUpperCase()}]: ${h.content}`);
  });

  if (statusSet === 200 && chatHistory.length >= 2) {
    console.log('\n✅ SIMULATION TEST PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('\n❌ SIMULATION TEST FAILED!');
    process.exit(1);
  }
}

// Execute simulation
runSimulation().catch(err => {
  console.error('Fatal error during simulation:', err);
  process.exit(1);
});
