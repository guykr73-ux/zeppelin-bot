import googleTTS from 'google-tts-api';

class TtsService {
  /**
   * Generates a Google Translate TTS audio URL for a given text.
   * If the text is longer than 200 characters, it will truncate it
   * to ensure a single, valid audio file URL can be generated.
   * @param {string} text - The text to synthesize
   * @returns {string} The public MP3 URL
   */
  getSpeechUrl(text) {
    if (!text || text.trim() === '') {
      return '';
    }

    // Clean text: strip markdown highlights (*, _, #) and emojis to keep audio clean
    let cleanText = text
      .replace(/[\*_#]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    // Google Translate TTS has a limit of 200 characters.
    if (cleanText.length > 200) {
      cleanText = cleanText.substring(0, 196) + '...';
    }

    try {
      const url = googleTTS.getAudioUrl(cleanText, {
        lang: 'he',
        slow: false,
        host: 'https://translate.google.com'
      });
      return url;
    } catch (error) {
      console.error('Error generating TTS URL:', error.message);
      return '';
    }
  }
}

export const ttsService = new TtsService();
