import axios from 'axios';

class AudioService {
  /**
   * Transcribe a WhatsApp audio file using Groq's Whisper API.
   * @param {string} downloadUrl - The Green API download URL for the file
   * @returns {Promise<string>} The transcribed text
   */
  async transcribeAudio(downloadUrl) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.warn('Groq API Key is missing. Skipping audio transcription.');
      return '[שגיאה: מפתח ה-Groq אינו מוגדר, לא ניתן לתמלל הודעה קולית]';
    }

    try {
      // 1. Download the audio file as ArrayBuffer
      console.log(`Downloading audio from Green API: ${downloadUrl}`);
      const audioResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(audioResponse.data);

      // 2. Prepare FormData for Whisper
      // Use standard Node.js Blob and FormData (available in Node 18+)
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
      formData.append('file', blob, 'voice.ogg');
      formData.append('model', 'whisper-large-v3');

      // 3. Post to Groq Audio Transcriptions API
      console.log('Sending audio to Groq Whisper for transcription...');
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq Whisper API returned status ${response.status}: ${errText}`);
      }

      const result = await response.json();
      console.log(`Transcription completed: "${result.text}"`);
      return result.text || '[לא זוהה דיבור בהודעה הקולית]';
    } catch (error) {
      console.error('Error during transcription:', error.message);
      return `[שגיאה בתמלול הודעה קולית: ${error.message}]`;
    }
  }
}

export const audioService = new AudioService();
