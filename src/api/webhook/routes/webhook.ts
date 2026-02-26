export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/avito',
      handler: 'webhook.handleAvitoWebhook',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

