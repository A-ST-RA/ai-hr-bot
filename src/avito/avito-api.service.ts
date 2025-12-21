import { BotApiService, DeleteMessageData, RegisterWebhookData, SendMessageData } from "../bot-api-service.interface";
import { AvitoSendMessageRequest, AvitoSendMessageResponse, AvitoWebhookPayload } from "./avito-types";

export class AvitoApiService implements BotApiService {
  private readonly baseUrl = 'https://api.avito.ru';
  private readonly accessToken: string;
  private readonly userId: string;

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
  }

  async sendMessage(data: SendMessageData): Promise<SendMessageData> {
    const url = `${this.baseUrl}/messenger/v1/accounts/${this.userId}/chats/${data.chatId}/messages`;

    const requestBody: AvitoSendMessageRequest = {
      type: 'text',
      message: {
        text: data.text,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Failed to send message: ${error.message || response.statusText}`);
    }

    const result = await response.json() as AvitoSendMessageResponse;
    return data;
  }

  async deleteMessage(data: DeleteMessageData): Promise<void> {
    const url = `${this.baseUrl}/messenger/v1/accounts/${this.userId}/chats/${data.chatId}/messages/${data.messageId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Failed to delete message: ${error.message || response.statusText}`);
    }
  }

  async registerWebhook(data: RegisterWebhookData): Promise<boolean> {
    const url = `${this.baseUrl}/messenger/v3/webhook`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: data.url }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Failed to register webhook: ${error.message || response.statusText}`);
    }

    const result = await response.json() as { ok?: boolean };
    return result.ok === true;
  }
}