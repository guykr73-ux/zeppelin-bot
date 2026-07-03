import axios from 'axios';

class WhatsappService {
  constructor() {
    this.instanceId = process.env.GREEN_API_INSTANCE_ID;
    this.token = process.env.GREEN_API_TOKEN;
    this.baseUrl = 'https://api.green-api.com';
  }

  /**
   * Send a text message to a specific WhatsApp chatId (phone number).
   * @param {string} chatId - The target recipient ID (e.g. "972501234567@c.us")
   * @param {string} message - The text content to send
   */
  async sendMessage(chatId, message) {
    if (!this.instanceId || !this.token) {
      console.error('Green API Instance ID or Token is missing.');
      return null;
    }

    const url = `${this.baseUrl}/waInstance${this.instanceId}/sendMessage/${this.token}`;
    try {
      const response = await axios.post(url, {
        chatId: chatId,
        message: message
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message via Green API:', error.message);
      if (error.response) {
        console.error('Green API Error Response:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Send a file/audio by URL to a WhatsApp chatId.
   * @param {string} chatId 
   * @param {string} urlFile 
   * @param {string} fileName 
   * @param {string} caption 
   */
  async sendFileByUrl(chatId, urlFile, fileName, caption = '') {
    if (!this.instanceId || !this.token) {
      console.error('Green API Instance ID or Token is missing.');
      return null;
    }

    const url = `${this.baseUrl}/waInstance${this.instanceId}/sendFileByUrl/${this.token}`;
    try {
      const response = await axios.post(url, {
        chatId: chatId,
        urlFile: urlFile,
        fileName: fileName,
        caption: caption
      });
      return response.data;
    } catch (error) {
      console.error('Error sending file via Green API:', error.message);
      throw error;
    }
  }

  /**
   * Helper to extract sender ID from a chatId (removes @c.us etc for readability/indexing if needed)
   * @param {string} chatId 
   */
  cleanChatId(chatId) {
    return chatId.split('@')[0];
  }
}

export const whatsappService = new WhatsappService();
