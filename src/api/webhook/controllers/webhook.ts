/**
 * Контроллер для обработки WebHook запросов от Avito
 */

import { factories } from '@strapi/strapi';
import { AvitoWebhookPayload } from '../../../avito/avito-types';
import { AvitoWebhookHandler } from '../../../avito/webhook-handler.service';
import { AvitoApiService } from '../../../avito/avito-api.service';
import { AvitoAuthService } from '../../../avito/avito-auth.service';
import { DeepSeekApiService } from '../../../llm/deepseek-api.service';
import { QuestionAnswerService } from '../../../services/question-answer.service';
import { validateEnv } from '../../../config/env.validation';

export default factories.createCoreController('api::question.question', ({ strapi }) => ({
  async handleAvitoWebhook(ctx) {
    try {
      const payload = ctx.request.body as AvitoWebhookPayload;

      // Валидируем и получаем конфигурацию из переменных окружения
      let env;
      try {
        env = validateEnv();
      } catch (error: any) {
        ctx.throw(500, `Invalid environment configuration: ${error.message}`);
        return;
      }

      // Инициализируем сервисы
      const avitoAuthService = new AvitoAuthService(env.AVITO_CLIENT_ID, env.AVITO_CLIENT_SECRET);
      const avitoApiService = new AvitoApiService(avitoAuthService, env.AVITO_USER_ID);
      const deepSeekService = new DeepSeekApiService(env.DEEPSEEK_API_KEY, env.DEEPSEEK_MODEL);
      const questionAnswerService = new QuestionAnswerService(strapi);
      const webhookHandler = new AvitoWebhookHandler(
        avitoApiService,
        deepSeekService,
        questionAnswerService
      );

      // Обрабатываем WebHook
      await webhookHandler.handleWebhook(payload);

      // Возвращаем успешный ответ (Avito требует 200 OK)
      ctx.body = { ok: true };
      ctx.status = 200;
    } catch (error: any) {
      console.error('Error in webhook handler:', error);
      ctx.status = 500;
      ctx.body = { error: error.message || 'Internal server error' };
    }
  },
}));

