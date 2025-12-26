import { BotApiService, DeleteMessageData, RegisterWebhookData, SendMessageData } from "../bot-api-service.interface";
import { AvitoSendMessageRequest, AvitoSendMessageResponse, AvitoWebhookPayload } from "./avito-types";
import { AvitoAuthService } from "./avito-auth.service";

export class AvitoApiService implements BotApiService {
  private readonly baseUrl = 'https://api.avito.ru';
  private readonly authService: AvitoAuthService;
  private readonly userId: string;

  constructor(authService: AvitoAuthService, userId: string) {
    this.authService = authService;
    this.userId = userId;
  }

  async sendMessage(data: SendMessageData): Promise<SendMessageData> {
    const url = `${this.baseUrl}/messenger/v1/accounts/${this.userId}/chats/${data.chatId}/messages`;
    const accessToken = await this.authService.getAccessToken();

    const requestBody: AvitoSendMessageRequest = {
      type: 'text',
      message: {
        text: data.text,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: data.url }),
    });

    console.log(response);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Failed to register webhook: ${error.message || response.statusText}`);
    }

    const result = await response.json() as { ok?: boolean };
    return result.ok === true;
  }
}