/**
 * Обработчик WebHook сообщений от Avito
 */

import { AvitoWebhookPayload, AvitoWebhookMessage } from './avito-types';
import { BotApiService, SendMessageData } from '../bot-api-service.interface';
import { DeepSeekApiService } from '../llm/deepseek-api.service';
import { QuestionAnswerService } from '../services/question-answer.service';

export class AvitoWebhookHandler {
  private botApiService: BotApiService;
  private deepSeekService: DeepSeekApiService;
  private questionAnswerService: QuestionAnswerService;

  constructor(
    botApiService: BotApiService,
    deepSeekService: DeepSeekApiService,
    questionAnswerService: QuestionAnswerService
  ) {
    this.botApiService = botApiService;
    this.deepSeekService = deepSeekService;
    this.questionAnswerService = questionAnswerService;
  }

  /**
   * Обрабатывает входящее WebHook сообщение от Avito
   * @param payload Данные WebHook
   */
  async handleWebhook(payload: AvitoWebhookPayload): Promise<void> {
    // Проверяем тип сообщения
    console.log(payload)
    if (payload.type !== 'message') {
      return;
    }

    const message = payload.value;

    // Обрабатываем только текстовые сообщения
    // В WebHook приходят только входящие сообщения (от пользователя к нам)
    // Проверяем, что это текстовое сообщение
    if (message.type !== 'text') {
      return;
    }

    // Извлекаем текст сообщения
    const userQuestion = message.content.text;
    if (!userQuestion || userQuestion.trim().length === 0) {
      return;
    }

    console.log('[userQuestion]', userQuestion);
    try {
      // Получаем все вопросы из базы данных
      const allQuestions = await this.questionAnswerService.getAllQuestions();

      // Преобразуем в формат для DeepSeek
      const questionsForLLM = allQuestions.map((q) => ({
        key: q.key,
        question: q.question || q.key, // Используем question если есть, иначе key
      }));
      
      console.log(questionsForLLM);

      // Отправляем в LLM для определения наиболее подходящего вопроса
      const matchedKey = await this.deepSeekService.findMatchingQuestion(
        userQuestion,
        questionsForLLM
      );

      // Получаем ответ по ключу (или default)
      const answer = await this.questionAnswerService.getAnswerByKeyOrDefault(
        matchedKey || 'default'
      );

      // Отправляем ответ пользователю
      const sendData: SendMessageData = {
        chatId: message.chat_id,
        userId: message.user_id.toString(),
        text: answer,
      };

      await this.botApiService.sendMessage(sendData);

      // Отмечаем чат как прочитанный, чтобы Avito перестал отправлять повторные webhook
      await this.botApiService.markChatAsRead({ chatId: message.chat_id });
    } catch (error) {
      console.error('Error processing webhook:', error);

      // В случае ошибки отправляем дефолтный ответ
      try {
        const defaultAnswer = await this.questionAnswerService.getAnswerByKeyOrDefault('default');
        const sendData: SendMessageData = {
          chatId: message.chat_id,
          userId: message.user_id.toString(),
          text: defaultAnswer,
        };
        await this.botApiService.sendMessage(sendData);

        // Отмечаем чат как прочитанный даже в случае ошибки
        await this.botApiService.markChatAsRead({ chatId: message.chat_id });
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

