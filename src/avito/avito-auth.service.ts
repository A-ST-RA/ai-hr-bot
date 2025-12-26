/**
 * Сервис для получения accessToken через OAuth 2 client_credentials flow
 * Документация: https://developers.avito.ru/api-catalog/auth/documentation#ApiDocumentationBlock
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class AvitoAuthService {
  private readonly tokenUrl = 'https://api.avito.ru/token';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private tokenCache: TokenCache | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Получает accessToken через OAuth 2 client_credentials flow
   * Кэширует токен до истечения срока действия
   */
  async getAccessToken(): Promise<string> {
    // Проверяем, есть ли валидный токен в кэше
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    // Получаем новый токен
    const tokenResponse = await this.fetchToken();

    // Кэшируем токен с небольшим запасом времени (5 минут до истечения)
    const expiresInMs = (tokenResponse.expires_in - 300) * 1000; // вычитаем 5 минут
    this.tokenCache = {
      token: tokenResponse.access_token,
      expiresAt: Date.now() + expiresInMs,
    };

    return tokenResponse.access_token;
  }

  /**
   * Выполняет запрос на получение токена
   */
  private async fetchToken(): Promise<TokenResponse> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string; error?: string; error_description?: string };
      throw new Error(
        `Failed to get access token: ${error.error_description || error.message || error.error || response.statusText}`
      );
    }

    return await response.json() as TokenResponse;
  }

  /**
   * Очищает кэш токена (полезно для принудительного обновления)
   */
  clearTokenCache(): void {
    this.tokenCache = null;
  }
}

