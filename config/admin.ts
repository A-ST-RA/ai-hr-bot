export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    sessions: {
      // Максимальное время жизни сессии в миллисекундах (по умолчанию 30 дней)
      maxSessionLifespan: env.int('ADMIN_SESSION_LIFESPAN_MS', 30 * 24 * 60 * 60 * 1000),
      // Максимальное время жизни refresh токена в миллисекундах (по умолчанию 6 месяцев)
      maxRefreshTokenLifespan: env.int('ADMIN_REFRESH_TOKEN_LIFESPAN_MS', 6 * 30 * 24 * 60 * 60 * 1000),
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
