/**
 * Маршруты для WebHook от Avito
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/webhook/avito',
      handler: 'webhook.handleAvitoWebhook',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

