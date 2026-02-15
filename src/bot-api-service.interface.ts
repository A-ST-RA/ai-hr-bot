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

export interface MarkChatAsReadData {
  chatId: string;
}

export interface ChatItemContext {
  itemId?: number;
  title?: string;
  priceString?: string;
  url?: string;
}

export interface VacancyDetails {
  title?: string;
  description?: string;
}

export interface BotApiService {
  sendMessage(data: SendMessageData): Promise<SendMessageData>;

  deleteMessage(data: DeleteMessageData): Promise<void>;

  registerWebhook(data: RegisterWebhookData): Promise<boolean>;

  markChatAsRead(data: MarkChatAsReadData): Promise<void>;

  getChatItemContext(chatId: string): Promise<ChatItemContext | null>;

  getVacancyDetails(vacancyId: number): Promise<VacancyDetails | null>;
}
