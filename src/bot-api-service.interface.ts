export interface SendMessageData {
  chatId: string;

  userId: string;
  
  text: string;
}

export interface DeleteMessageData {
  chatId: string;

  userId: string;

  messageId: string;
}

export interface RegisterWebhookData {
  url: string;
}


export interface BotApiService {
  sendMessage(data: SendMessageData): Promise<SendMessageData>;

  deleteMessage(data: DeleteMessageData): Promise<void>;

  registerWebhook(data: RegisterWebhookData): Promise<boolean>;
}
