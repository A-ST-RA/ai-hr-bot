import { BotApiService, DeleteMessageData, RegisterWebhookData, SendMessageData } from "../bot-api-service.interface";

export class AvitoApiService implements BotApiService {
  sendMessage(data: SendMessageData): Promise<SendMessageData> {
    throw new Error("Method not implemented.");
  }
  deleteMessage(data: DeleteMessageData): Promise<void> {
    throw new Error("Method not implemented.");
  }
  registerWebhook(data: RegisterWebhookData): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}