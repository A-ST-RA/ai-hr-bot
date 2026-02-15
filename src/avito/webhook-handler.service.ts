/**
 * Обработчик WebHook сообщений от Avito
 */

import type { Core } from '@strapi/strapi';
import { AvitoWebhookPayload, AvitoWebhookMessage } from './avito-types';
import { BotApiService, SendMessageData } from '../bot-api-service.interface';
import { DeepSeekApiService } from '../llm/deepseek-api.service';
import { QuestionAnswerService } from '../services/question-answer.service';
import { AutoMessageService } from '../services/auto-message.service';

export class AvitoWebhookHandler {
  private botApiService: BotApiService;
  private deepSeekService: DeepSeekApiService;
  private questionAnswerService: QuestionAnswerService;
  private autoMessageService: AutoMessageService;
  private strapi: Core.Strapi;

  constructor(
    botApiService: BotApiService,
    deepSeekService: DeepSeekApiService,
    questionAnswerService: QuestionAnswerService,
    autoMessageService: AutoMessageService,
    strapi: Core.Strapi
  ) {
    this.botApiService = botApiService;
    this.deepSeekService = deepSeekService;
    this.questionAnswerService = questionAnswerService;
    this.autoMessageService = autoMessageService;
    this.strapi = strapi;
  }

  /**
   * Обрабатывает входящее WebHook сообщение от Avito
   * @param payload Данные WebHook
   * @param botUserId ID пользователя бота (для определения, является ли сообщение от бота)
   */
  async handleWebhook(payload: AvitoWebhookPayload, botUserId: string): Promise<void> {
    // Проверяем тип сообщения
    console.log(payload)
    if (payload.type !== 'message') {
      return;
    }

    const message = payload.value;

    // Игнорируем сообщения, отправленные от лица бота
    // Если author_id совпадает с user_id (наш аккаунт), значит это мы отправили
    const botUserIdNum = parseInt(botUserId, 10);
    if (message.author_id === botUserIdNum || message.author_id === message.user_id) {
      console.log('Ignoring message from bot (author_id matches bot user_id)');
      // Отмечаем чат как прочитанный, чтобы Avito перестал отправлять повторные webhook
      try {
        await this.botApiService.markChatAsRead({ chatId: message.chat_id });
      } catch (error) {
        console.error('Error marking chat as read for bot message:', error);
      }
      return;
    }

    // Обрабатываем только текстовые сообщения
    // Проверяем, что это текстовое сообщение
    if (message.type !== 'text') {
      return;
    }

    const chatId = message.chat_id;
    const userId = message.user_id.toString();

    // Проверяем и отправляем auto-message, если прошло 15 минут после последнего вопроса
    // Делаем это перед обработкой нового сообщения
    try {
      await this.autoMessageService.sendAutoMessageIfNeeded(chatId, userId);
    } catch (error) {
      console.error('Error checking/sending auto-message:', error);
      // Продолжаем обработку даже если не удалось отправить auto-message
    }

    // Извлекаем текст сообщения
    const userQuestion = message.content.text;
    if (!userQuestion || userQuestion.trim().length === 0) {
      return;
    }

    console.log('[userQuestion]', userQuestion);

    try {
      // Проверяем, является ли это ответом на auto-message
      const lastAutoMessage = await this.autoMessageService.getLastAutoMessage(chatId, userId);
      
      if (lastAutoMessage) {
        // Анализируем ответ на auto-message
        const analysisResult = await this.deepSeekService.analyzeOfferResponse(
          userQuestion,
          lastAutoMessage
        );

        console.log('[Auto-message response analysis]', analysisResult);

        // Обрабатываем результат анализа
        await this.autoMessageService.handleAutoMessageResponse(
          chatId,
          userId,
          analysisResult
        );

        // Если ответ релевантен и пользователь принял/отказался, продолжаем обработку как обычный вопрос
        // Если не релевантен, продолжаем как новый вопрос
        if (analysisResult.isRelevant) {
          // Пользователь ответил на предложение о стажировке
          // Продолжаем обработку сообщения как обычного вопроса (может быть уточняющий вопрос)
        }
      }

      // Проверяем, хочет ли пользователь записаться на стажировку
      const internshipSignupResult = await this.deepSeekService.detectInternshipSignup(userQuestion);
      
      console.log('[Internship signup detection]', internshipSignupResult);

      let answer: string;

      if (internshipSignupResult.wantsInternship) {
        // Если пользователь хочет записаться на стажировку, отправляем сообщение из auto-message-accepted-message
        const acceptedMessage = await this.autoMessageService.getRandomAcceptedMessage();
        if (acceptedMessage) {
          answer = acceptedMessage;
        } else {
          console.warn('No accepted messages found, falling back to default answer');
          // Если нет сообщений в auto-message-accepted-message, используем дефолтный ответ
          answer = await this.questionAnswerService.getAnswerByKeyOrDefault('default');
        }
      } else {
        let vacancyContext: { title?: string; description?: string } | null = null;
        if (message.chat_type === 'u2i') {
          try {
            if (message.item_id) {
              const details = await this.botApiService.getVacancyDetails(message.item_id);
              if (details?.title || details?.description) {
                vacancyContext = { title: details.title, description: details.description };
              }
            }
            if (!vacancyContext) {
              const chatContext = await this.botApiService.getChatItemContext(chatId);
              if (chatContext?.title) {
                vacancyContext = { title: chatContext.title };
              }
            }
          } catch (err) {
            console.error('Error fetching vacancy/chat context:', err);
          }
        }

        answer = await this.deepSeekService.generateAnswerFromVacancy(userQuestion, vacancyContext);
      }

      // Отправляем ответ пользователю
      const sendData: SendMessageData = {
        chatId,
        userId,
        text: answer,
      };

      await this.botApiService.sendMessage(sendData);

      // Обновляем время последнего вопроса для auto-message логики
      await this.autoMessageService.updateLastQuestionTime(chatId, userId);

      // Проверяем и отправляем auto-message, если нужно (через 15 минут после вопроса)
      // Но сразу не отправляем, т.к. нужно ждать 15 минут
      // Это будет проверяться при следующем webhook или можно использовать cron job

      // Отмечаем чат как прочитанный, чтобы Avito перестал отправлять повторные webhook
      await this.botApiService.markChatAsRead({ chatId });
    } catch (error) {
      console.error('Error processing webhook:', error);

      // В случае ошибки отправляем дефолтный ответ
      try {
        const defaultAnswer = await this.questionAnswerService.getAnswerByKeyOrDefault('default');
        const sendData: SendMessageData = {
          chatId,
          userId,
          text: defaultAnswer,
        };
        await this.botApiService.sendMessage(sendData);

        // Обновляем время последнего вопроса даже в случае ошибки
        await this.autoMessageService.updateLastQuestionTime(chatId, userId);

        // Отмечаем чат как прочитанный даже в случае ошибки
        await this.botApiService.markChatAsRead({ chatId });
      } catch (sendError) {
        console.error('Error sending default answer:', sendError);
        // Пытаемся отметить как прочитанный даже если не удалось отправить ответ
        try {
          await this.botApiService.markChatAsRead({ chatId: message.chat_id });
        } catch (readError) {
          console.error('Error marking chat as read:', readError);
        }
      }
    }
  }
}

