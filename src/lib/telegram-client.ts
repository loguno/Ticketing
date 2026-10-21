/**
 * Client per interagire con le API ufficiali dei Bot di Telegram.
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  voice?: TelegramVoice;
  audio?: TelegramVoice;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export class TelegramClient {
  private botToken: string;

  constructor(token?: string) {
    this.botToken = token || process.env.TELEGRAM_BOT_TOKEN || '';
  }

  get isConfigured(): boolean {
    return Boolean(this.botToken && this.botToken !== 'dev_telegram_bot_token');
  }

  private get apiUrl(): string {
    return `https://api.telegram.org/bot${this.botToken}`;
  }

  private get fileBaseUrl(): string {
    return `https://api.telegram.org/file/bot${this.botToken}`;
  }

  /**
   * Invia un messaggio testuale a una chat Telegram.
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    options: {
      parse_mode?: 'Markdown' | 'HTML';
      reply_to_message_id?: number;
    } = { parse_mode: 'Markdown' }
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`[TelegramClient MOCK] Invio messaggio a Chat ${chatId}:\n${text}`);
      return true;
    }

    try {
      const res = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options.parse_mode,
          reply_to_message_id: options.reply_to_message_id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[TelegramClient] Errore sendMessage:', errorData);
        // Fallback: retry without Markdown if Telegram markdown parser fails
        if (options.parse_mode === 'Markdown') {
          await fetch(`${this.apiUrl}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              reply_to_message_id: options.reply_to_message_id,
            }),
          });
        }
        return false;
      }

      return true;
    } catch (err) {
      console.error('[TelegramClient] Eccezione di rete sendMessage:', err);
      return false;
    }
  }

  /**
   * Invia un'azione di stato (es. 'typing' o 'record_voice').
   */
  async sendChatAction(chatId: number | string, action: 'typing' | 'record_voice'): Promise<boolean> {
    if (!this.isConfigured) return true;

    try {
      await fetch(`${this.apiUrl}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          action,
        }),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ottiene le informazioni del file da Telegram (incluso il path di download).
   */
  async getFile(fileId: string): Promise<{ file_path?: string } | null> {
    if (!this.isConfigured) {
      return { file_path: `mock_path/${fileId}.ogg` };
    }

    try {
      const res = await fetch(`${this.apiUrl}/getFile?file_id=${fileId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.result || null;
    } catch (err) {
      console.error('[TelegramClient] Errore getFile:', err);
      return null;
    }
  }

  /**
   * Scarica il file audio binario da Telegram.
   */
  async downloadFile(filePath: string): Promise<Buffer | null> {
    if (!this.isConfigured) {
      return Buffer.from('MOCK_AUDIO_BUFFER');
    }

    try {
      const downloadUrl = `${this.fileBaseUrl}/${filePath}`;
      const res = await fetch(downloadUrl);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.error('[TelegramClient] Errore downloadFile:', err);
      return null;
    }
  }
}

export const telegramClient = new TelegramClient();
