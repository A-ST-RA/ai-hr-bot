import type { Core } from '@strapi/strapi';
import { validateEnv } from './config/env.validation';
import { AvitoApiService } from './avito/avito-api.service';
import { AvitoAuthService } from './avito/avito-auth.service';
import { AutoMessageService } from './services/auto-message.service';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Валидируем переменные окружения при регистрации
    try {
      validateEnv();
      strapi.log.info('✅ Environment variables validated successfully');
    } catch (error: any) {
      strapi.log.error('❌ Environment variables validation failed:', error.message);
      throw error;
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      const env = validateEnv();

      // Регистрируем webhook автоматически при старте
      if (env.WEBHOOK_URL) {
        strapi.log.info('🔗 Registering Avito webhook...');

        const avitoAuthService = new AvitoAuthService(
          env.AVITO_CLIENT_ID,
          env.AVITO_CLIENT_SECRET
        );
        const avitoApiService = new AvitoApiService(
          avitoAuthService,
          env.AVITO_USER_ID
        );

        try {
          const success = await avitoApiService.registerWebhook({
            url: env.WEBHOOK_URL,
          });

          if (success) {
            strapi.log.info(`✅ Avito webhook registered successfully: ${env.WEBHOOK_URL}`);
          } else {
            strapi.log.warn('⚠️  Avito webhook registration returned false');
          }
        } catch (error: any) {
          strapi.log.error('❌ Failed to register Avito webhook:', error.message);
          // Не прерываем запуск приложения, только логируем ошибку
        }
      } else {
        strapi.log.warn('⚠️  WEBHOOK_URL not set, skipping automatic webhook registration');
        strapi.log.info('💡 To enable automatic webhook registration, set WEBHOOK_URL in your .env file');
      }

      // Настраиваем cron job для проверки и отправки auto-messages
      strapi.log.info('⏰ Setting up auto-message cron job...');
      
      const avitoAuthService = new AvitoAuthService(
        env.AVITO_CLIENT_ID,
        env.AVITO_CLIENT_SECRET
      );
      const avitoApiService = new AvitoApiService(
        avitoAuthService,
        env.AVITO_USER_ID
      );
      const autoMessageService = new AutoMessageService(strapi, avitoApiService);

      // Запускаем проверку каждые 30 секунд
      const checkInterval = 15 * 60 * 1000; // 30 секунд
      
      setInterval(async () => {
        try {
          // Получаем всех пользователей с lastQuestionTime (не null)
          // и проверяем acceptedOffer в коде, так как enum может быть null
          const allUsers = await strapi.entityService.findMany(
            'api::auto-message-after-delay.auto-message-after-delay',
            {
              filters: {
                lastQuestionTime: { $notNull: true },
              },
            }
          );

          // Фильтруем в коде: пропускаем только тех, кто не принял предложение
          const users = allUsers?.filter(
            (user: any) => user.acceptedOffer !== 'accepted'
          ) || [];
          
          console.log(users);

          if (!users || users.length === 0) {
            return;
          }

          // Проверяем каждого пользователя и отправляем auto-message, если нужно
          for (const user of users) {
            try {
              await autoMessageService.sendAutoMessageIfNeeded(
                user.chatId,
                user.avitoUserId
              );
            } catch (error: any) {
              strapi.log.error(
                `Error sending auto-message to user ${user.avitoUserId}:`,
                error.message
              );
            }
          }
        } catch (error: any) {
          strapi.log.error('Error in auto-message cron job:', error);
        }
      }, checkInterval);

      strapi.log.info(`✅ Auto-message cron job started (checks every ${checkInterval / 1000} seconds)`);
    } catch (error: any) {
      strapi.log.error('❌ Bootstrap error:', error.message);
      // Не прерываем запуск, но логируем ошибку
    }
  },
};
