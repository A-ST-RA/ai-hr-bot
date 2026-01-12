/**
 * Сервис для управления автоматическими сообщениями после вопросов
 */

import type { Core } from '@strapi/strapi';
import { BotApiService, SendMessageData } from '../bot-api-service.interface';

const AUTO_MESSAGE_DELAY_MS = 0.1 * 60 * 1000; // 1 минута (для теста)
const MAX_AUTO_MESSAGE_ATTEMPTS = 2;

export interface AutoMessageUserState {
  id?: number;
  chatId: string;
  avitoUserId: string;
  lastQuestionTime?: Date;
  lastAutoMessageTime?: Date;
  autoMessageAttempts: number;
  acceptedOffer?: 'accepted' | 'declined' | null;
  lastAutoMessageText?: string;
}

export class AutoMessageService {
  private strapi: Core.Strapi;
  private botApiService: BotApiService;

  constructor(strapi: Core.Strapi, botApiService: BotApiService) {
    this.strapi = strapi;
    this.botApiService = botApiService;
  }

  /**
   * Обновляет время последнего вопроса для пользователя
   * @param chatId ID чата
   * @param userId ID пользователя Avito
   */
  async updateLastQuestionTime(chatId: string, userId: string): Promise<void> {
    const existing = await this.findOrCreateUserState(chatId, userId);
    
    const updateData: any = {
      lastQuestionTime: new Date(),
    };

    // Если пользователь задал новый вопрос и раньше отказался, сбрасываем счетчик попыток и время последнего auto-message
    if (existing.acceptedOffer === 'declined') {
      updateData.autoMessageAttempts = 0;
      updateData.acceptedOffer = null;
      updateData.lastAutoMessageTime = null;
      updateData.lastAutoMessageText = null;
    }
    
    await this.strapi.entityService.update(
      'api::auto-message-after-delay.auto-message-after-delay',
      existing.id!,
      {
        data: updateData,
      }
    );
  }

  /**
   * Отправляет автоматическое сообщение пользователю, если прошло достаточно времени
   * @param chatId ID чата
   * @param userId ID пользователя Avito
   */
  async sendAutoMessageIfNeeded(chatId: string, userId: string): Promise<boolean> {
    const userState = await this.findOrCreateUserState(chatId, userId);

    // Если уже принял предложение, не отправляем больше сообщений
    if (userState.acceptedOffer === 'accepted') {
      return false;
    }

    // Если нет времени последнего вопроса, не отправляем
    if (!userState.lastQuestionTime) {
      return false;
    }

    const now = new Date();
    const timeSinceLastQuestion = now.getTime() - new Date(userState.lastQuestionTime).getTime();

    // Проверяем, прошло ли 15 минут с последнего вопроса
    if (timeSinceLastQuestion < AUTO_MESSAGE_DELAY_MS) {
      return false;
    }

    // Проверяем, не превышен ли лимит попыток
    if (userState.autoMessageAttempts >= MAX_AUTO_MESSAGE_ATTEMPTS) {
      return false;
    }

    // Проверяем, что прошло достаточно времени с последнего auto-message (если было)
    if (userState.lastAutoMessageTime) {
      const timeSinceLastAutoMessage = now.getTime() - new Date(userState.lastAutoMessageTime).getTime();
      if (timeSinceLastAutoMessage < AUTO_MESSAGE_DELAY_MS) {
        return false;
      }
    }

    // Получаем случайное сообщение из auto-message
    const randomMessage = await this.getRandomAutoMessage();
    if (!randomMessage) {
      console.warn('No auto-messages found in database');
      return false;
    }

    // Отправляем сообщение
    const sendData: SendMessageData = {
      chatId,
      userId,
      text: randomMessage,
    };

    try {
      await this.botApiService.sendMessage(sendData);

      // Обновляем состояние пользователя
      await this.strapi.entityService.update(
        'api::auto-message-after-delay.auto-message-after-delay',
        userState.id!,
        {
          data: {
            lastAutoMessageTime: now,
            autoMessageAttempts: userState.autoMessageAttempts + 1,
            lastAutoMessageText: randomMessage,
          },
        }
      );

      return true;
    } catch (error) {
      console.error('Error sending auto-message:', error);
      return false;
    }
  }

  /**
   * Обрабатывает ответ пользователя на auto-message
   * @param chatId ID чата
   * @param userId ID пользователя Avito
   * @param userResponse Ответ пользователя
   * @param offerMessage Текст предложения о стажировке
   * @param analysisResult Результат анализа ответа
   */
  async handleAutoMessageResponse(
    chatId: string,
    userId: string,
    analysisResult: { acceptedOffer: boolean; isRelevant: boolean }
  ): Promise<void> {
    const userState = await this.findOrCreateUserState(chatId, userId);

    let acceptedOffer: 'accepted' | 'declined' | null = null;
    let autoMessageAttempts = userState.autoMessageAttempts;

    const updateData: any = {
      autoMessageAttempts,
    };

    if (analysisResult.isRelevant) {
      // Если ответ релевантен, обновляем статус
      acceptedOffer = analysisResult.acceptedOffer ? 'accepted' : 'declined';
      updateData.acceptedOffer = acceptedOffer;
      
      // Если принял, сбрасываем попытки и очищаем lastAutoMessageText
      if (acceptedOffer === 'accepted') {
        autoMessageAttempts = 0;
        updateData.autoMessageAttempts = 0;
        updateData.lastAutoMessageText = null;
      }
    } else {
      // Если ответ не релевантен (проигнорировал или задал новый вопрос),
      // очищаем lastAutoMessageText, чтобы при следующем сообщении не анализировать его как ответ на старое auto-message
      // Оставляем попытки как есть (они будут использованы для повторной отправки)
      // Но если пользователь задал новый вопрос и до этого отказался, счетчик уже был сброшен в updateLastQuestionTime
      updateData.lastAutoMessageText = null;
    }

    await this.strapi.entityService.update(
      'api::auto-message-after-delay.auto-message-after-delay',
      userState.id!,
      {
        data: updateData,
      }
    );
  }

  /**
   * Получает или создает состояние пользователя
   */
  private async findOrCreateUserState(
    chatId: string,
    userId: string
  ): Promise<AutoMessageUserState> {
    const existing = await this.strapi.entityService.findMany(
      'api::auto-message-after-delay.auto-message-after-delay',
      {
        filters: {
          chatId: { $eq: chatId },
          avitoUserId: { $eq: userId },
        },
        limit: 1,
      }
    );

    if (existing && existing.length > 0) {
      const state = existing[0] as any;
      return {
        id: state.id,
        chatId: state.chatId || chatId,
        avitoUserId: state.avitoUserId || userId,
        lastQuestionTime: state.lastQuestionTime ? new Date(state.lastQuestionTime) : undefined,
        lastAutoMessageTime: state.lastAutoMessageTime ? new Date(state.lastAutoMessageTime) : undefined,
        autoMessageAttempts: state.autoMessageAttempts || 0,
        acceptedOffer: state.acceptedOffer || null,
        lastAutoMessageText: state.lastAutoMessageText || undefined,
      };
    }

    // Создаем новое состояние
    const created = await this.strapi.entityService.create(
      'api::auto-message-after-delay.auto-message-after-delay',
      {
        data: {
          chatId,
          avitoUserId: userId,
          autoMessageAttempts: 0,
        },
      }
    );

    return {
      id: (created as any).id,
      chatId,
      avitoUserId: userId,
      autoMessageAttempts: 0,
    };
  }

  /**
   * Получает случайное сообщение из базы auto-message
   */
  private async getRandomAutoMessage(): Promise<string | null> {
    // Получаем все сообщения (включая неопубликованные)
    const allMessages = await this.strapi.entityService.findMany('api::auto-message.auto-message', {});

    if (!allMessages || allMessages.length === 0) {
      console.warn('No auto-messages found in database');
      return null;
    }

    // Фильтруем только те, у которых есть текст
    const messagesWithText = allMessages.filter((msg: any) => msg.textOfMessage && msg.textOfMessage.trim().length > 0);

    if (messagesWithText.length === 0) {
      console.warn('No auto-messages with text found in database');
      return null;
    }

    const randomIndex = Math.floor(Math.random() * messagesWithText.length);
    const message = messagesWithText[randomIndex] as any;
    return message.textOfMessage;
  }

  /**
   * Получает последнее отправленное auto-message для пользователя
   */
  async getLastAutoMessage(chatId: string, userId: string): Promise<string | null> {
    const userState = await this.findOrCreateUserState(chatId, userId);
    return userState.lastAutoMessageText || null;
  }

  /**
   * Получает случайное сообщение из базы auto-message-accepted-message
   */
  async getRandomAcceptedMessage(): Promise<string | null> {
    // Получаем все сообщения (включая неопубликованные)
    const allMessages = await this.strapi.entityService.findMany(
      'api::auto-message-accepted-message.auto-message-accepted-message',
      {}
    );

    if (!allMessages || allMessages.length === 0) {
      console.warn('No accepted messages found in database');
      return null;
    }

    // Фильтруем только те, у которых есть текст
    const messagesWithText = allMessages.filter(
      (msg: any) => msg.text && msg.text.trim().length > 0
    );

    if (messagesWithText.length === 0) {
      console.warn('No accepted messages with text found in database');
      return null;
    }

    const randomIndex = Math.floor(Math.random() * messagesWithText.length);
    const message = messagesWithText[randomIndex] as any;
    return message.text;
  }
}
