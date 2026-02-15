import { BotApiService, ChatItemContext, DeleteMessageData, MarkChatAsReadData, RegisterWebhookData, SendMessageData, VacancyDetails } from "../bot-api-service.interface";
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

    
    console.log(response)
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
    
    console.log(response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      console.log(error)
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

  async markChatAsRead(data: MarkChatAsReadData): Promise<void> {
    const url = `${this.baseUrl}/messenger/v1/accounts/${this.userId}/chats/${data.chatId}/read`;
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
      throw new Error(`Failed to mark chat as read: ${error.message || response.statusText}`);
    }
  }

  async getChatItemContext(chatId: string): Promise<ChatItemContext | null> {
    const url = `${this.baseUrl}/messenger/v2/accounts/${this.userId}/chats/${chatId}`;
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as {
      context?: {
        type?: string;
        value?: {
          id?: number;
          title?: string;
          price_string?: string;
          url?: string;
        };
      };
    };

    const value = data?.context?.type === 'item' ? data.context.value : undefined;
    if (!value) {
      return null;
    }

    return {
      itemId: value.id,
      title: value.title,
      priceString: value.price_string,
      url: value.url,
    };
  }

  async getVacancyDetails(vacancyId: number): Promise<VacancyDetails | null> {
    const url = `${this.baseUrl}/job/v2/vacancies/${vacancyId}?fields=title,description`;
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { title?: string; description?: string };

    return {
      title: data.title,
      description: data.description,
    };
  }
}