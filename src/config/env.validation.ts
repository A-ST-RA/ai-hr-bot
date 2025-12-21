/**
 * Валидация переменных окружения с помощью Zod
 */

import { z } from 'zod';

// Кастомная валидация URL, которая принимает как домены, так и IP-адреса
const urlOrIpSchema = z.string().refine(
  (val) => {
    if (!val) return true; // опциональное поле
    try {
      const url = new URL(val);
      // Проверяем, что протокол http или https
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  },
  {
    message: 'WEBHOOK_URL must be a valid URL (http:// or https://) with domain or IP address',
  }
).optional();

const envSchema = z.object({
  AVITO_ACCESS_TOKEN: z.string().min(1, 'AVITO_ACCESS_TOKEN is required'),
  AVITO_USER_ID: z.string().min(1, 'AVITO_USER_ID is required'),
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required'),
  DEEPSEEK_MODEL: z.string().optional().default('deepseek-chat'),
  WEBHOOK_URL: urlOrIpSchema,
  HOST: z.string().optional().default('0.0.0.0'),
  PORT: z.string().optional().default('1337'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Валидирует переменные окружения
 * @throws {Error} Если переменные окружения невалидны
 */
export function validateEnv(): EnvConfig {
  const env = {
    AVITO_ACCESS_TOKEN: process.env.AVITO_ACCESS_TOKEN,
    AVITO_USER_ID: process.env.AVITO_USER_ID,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
    HOST: process.env.HOST,
    PORT: process.env.PORT,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((issue) => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
      }).join('\n');
      throw new Error(`Invalid environment variables:\n${errors}`);
    }
    throw error;
  }
}

