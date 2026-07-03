# Zeppelin Cloud Edition: Serverless WhatsApp AI Agent

Zeppelin is a highly modular, serverless WhatsApp AI Assistant designed to run on **Google Cloud Functions (GCF)** and **Google Cloud Firestore**. It integrates with **Green API** for WhatsApp messaging and supports **Groq AI** (default) and **Google Gemini** as backend LLM engines.

---

## 🛠️ Architecture Overview

- **Server Runtime**: Node.js (GCF 2nd Gen)
- **WhatsApp Gateway**: Green API (Webhooks)
- **State & Memory Management**: 
  - **Short-term Memory**: Last 10 chat messages per user stored chronologically.
  - **Long-term Memory**: Decrypted-on-the-fly user profile/preferences stored securely using AES-256-CBC encryption.
- **AI Engine**: Modular LLM integration inside `src/services/aiService.js` utilizing OpenAI-compatible endpoints for both Groq and Gemini.
- **Functional Modules**:
  - `memoryService.js` - Context window, persistence, and cryptographic operations.
  - `lifeService.js` - Prioritized todo list (CRUD), Israeli financial tools (VAT, conversions), pantry inventory & recipe logic, and sourdough starter feeding/baking log.
  - `infoService.js` - News parsing, real-time Yahoo Finance stock price queries, and sports flashes.
  - `learningService.js` - Vocabulary builder for language practice, and music instrument practice log tracker.
  - `audioService.js` - Transcribes incoming WhatsApp voice notes into text using Groq Whisper.

---

## 🚀 Local Setup & Development

To run and debug Zeppelin locally, follow these steps:

### 1. Configure Credentials
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your keys:
   - `GREEN_API_INSTANCE_ID` and `GREEN_API_TOKEN` (from your Green API dashboard).
   - `GROQ_API_KEY` (from Groq console).
   - `ENCRYPTION_KEY` (any secure 32-character string for memory encryption).
   - `FIRESTORE_PROJECT_ID` (your GCP Project ID).

### 2. Local Firestore Setup
Since the agent uses Firestore:
1. Ensure your GCP project has Firestore enabled (in Native mode).
2. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to your service account JSON file, or run `gcloud auth application-default login` on your system to authenticate locally.

### 3. Run the Local Emulator
Run the Functions Framework to start a local web server:
```bash
npm start
```
The server will start on `http://localhost:8080` targeting the `whatsappWebhook` function.

### 4. Bridge Green API using Ngrok
Since Green API needs to send HTTP POST webhooks to a public URL:
1. Install and start `ngrok`:
   ```bash
   ngrok http 8080
   ```
2. Copy the forwarding HTTPS URL provided by ngrok (e.g. `https://1234-abcd.ngrok-free.app`).
3. Log in to your Green API console, go to **Settings**, and paste the URL under **Webhook URL** (make sure to append the function path or trigger `/whatsappWebhook` if needed - but Google Functions Framework maps the root or target directly, so the URL is just `https://1234-abcd.ngrok-free.app`).
4. Ensure the Webhook types `incomingMessageReceived` are enabled.

---

## 🧪 Simulation / Automated Tests
You can verify the entire setup locally without hitting WhatsApp or Firestore (using mock environments).
To run the simulation suite:
```bash
npm test
```

---

## 🚢 Production Deployment

To deploy the function to Google Cloud:
1. Make sure you have installed the `gcloud` CLI and authenticated.
2. Edit `deploy.sh` with your project configurations.
3. Run the script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
4. **Permissions**: In GCP IAM, assign the **Cloud Datastore User** role to the App Engine/Compute Engine service account running the Cloud Function, allowing it read/write access to Firestore.
