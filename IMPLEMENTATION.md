# Реализация AI HR Bot

## Описание

Бот для автоматических ответов на вопросы о вакансиях через Avito Messenger с использованием LLM (DeepSeek) для определения наиболее подходящего ответа.

## Архитектура

### Компоненты

1. **AvitoAuthService** (`src/avito/avito-auth.service.ts`)
   - Сервис для получения accessToken через OAuth 2 client_credentials flow
   - Автоматически кэширует токен до истечения срока действия
   - Документация: https://developers.avito.ru/api-catalog/auth/documentation#ApiDocumentationBlock

2. **AvitoApiService** (`src/avito/avito-api.service.ts`)
   - Реализация интерфейса `BotApiService` для работы с Avito API
   - Методы: `sendMessage`, `deleteMessage`, `registerWebhook`
   - Автоматически получает accessToken через `AvitoAuthService` при каждом запросе

3. **DeepSeekApiService** (`src/llm/deepseek-api.service.ts`)
   - Сервис для работы с DeepSeek API
   - Определяет наиболее подходящий вопрос из базы данных по запросу пользователя

4. **QuestionAnswerService** (`src/services/question-answer.service.ts`)
   - Работа с вопросами и ответами из базы данных Strapi
   - Получение ответов по ключу

5. **AvitoWebhookHandler** (`src/avito/webhook-handler.service.ts`)
   - Обработчик входящих WebHook сообщений от Avito
   - Интегрирует все компоненты в единый поток

6. **Webhook Controller** (`src/api/webhook/controllers/webhook.ts`)
   - HTTP endpoint для приема WebHook запросов от Avito

## Настройка

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Обязательные переменные
AVITO_CLIENT_ID=your_avito_client_id
AVITO_CLIENT_SECRET=your_avito_client_secret
AVITO_USER_ID=your_avito_user_id
DEEPSEEK_API_KEY=your_deepseek_api_key

# Опциональные переменные
DEEPSEEK_MODEL=deepseek-chat  # по умолчанию deepseek-chat
WEBHOOK_URL=https://your-domain.com/api/webhook/avito  # для автоматической регистрации webhook
# WEBHOOK_URL также поддерживает IP-адреса: http://192.168.1.100:1337/api/webhook/avito
```

**Получение AVITO_CLIENT_ID и AVITO_CLIENT_SECRET:**
1. Перейдите на [страницу документации Avito API](https://developers.avito.ru/api-catalog/auth/documentation#ApiDocumentationBlock)
2. Зарегистрируйте приложение и получите `client_id` и `client_secret`
3. AccessToken будет автоматически получаться через OAuth 2 client_credentials flow при каждом запросе

**Важно:**
- ✅ Все обязательные переменные **автоматически проверяются** при старте приложения с помощью **Zod**
- ✅ Если переменные окружения невалидны, приложение **не запустится** с понятным сообщением об ошибке
- ✅ Если `WEBHOOK_URL` установлен, webhook будет **автоматически зарегистрирован** при старте приложения
- ⚠️ Если `WEBHOOK_URL` не установлен, приложение запустится, но webhook нужно будет зарегистрировать вручную
- 🔍 Валидация проверяет:
  - Наличие всех обязательных переменных
  - Корректность формата URL для `WEBHOOK_URL` (если указан)
  - Поддержка как доменных имен, так и IP-адресов в `WEBHOOK_URL`
  - Типы данных всех переменных

**Примечание о WEBHOOK_URL:**
- ✅ Поддерживаются домены: `https://example.com/api/webhook/avito`
- ✅ Поддерживаются IP-адреса: `http://192.168.1.100:1337/api/webhook/avito`
- ✅ Требуется протокол `http://` или `https://`
- ⚠️ Для продакшена рекомендуется использовать HTTPS с доменным именем
- 💡 IP-адреса удобны для разработки и тестирования в локальной сети

### Настройка базы данных вопросов

1. В админ-панели Strapi создайте записи в коллекции `Question`
2. Каждая запись должна содержать:
   - `key` (string, уникальный) - ключ вопроса (например, "salary", "schedule")
   - `question` (text, опционально) - текст вопроса для LLM
   - `answer` (text) - ответ на вопрос

3. Обязательно создайте запись с ключом `default` для случаев, когда LLM не может определить подходящий вопрос

### Регистрация WebHook

WebHook регистрируется автоматически при старте приложения, если установлена переменная `WEBHOOK_URL`.

Если вы хотите зарегистрировать webhook вручную, используйте:

```bash
# Сначала получите access token через OAuth 2
curl -X POST https://api.avito.ru/token \
  -H "Authorization: Basic $(echo -n 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"

# Затем используйте полученный access_token для регистрации webhook
curl -X POST https://api.avito.ru/messenger/v3/webhook \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/webhook/avito"}'
```

**Примечание:** Приложение автоматически получает accessToken при каждом запросе к API, поэтому ручная регистрация webhook обычно не требуется, если установлена переменная `WEBHOOK_URL`.

**Примечание:** При автоматической регистрации webhook логируется в консоль. Если регистрация не удалась, приложение продолжит работу, но webhook нужно будет зарегистрировать вручную.

## Использование

### Запуск приложения

```bash
yarn develop
```

### Запуск тестов

```bash
yarn test
```

## Поток обработки сообщения

1. Пользователь отправляет вопрос в Avito Messenger
2. Avito отправляет WebHook на `/api/webhook/avito`
3. `AvitoWebhookHandler` извлекает текст сообщения
4. Получаются все вопросы из базы данных
5. Вопрос пользователя и список вопросов отправляются в DeepSeek API
6. DeepSeek возвращает ключ наиболее подходящего вопроса
7. По ключу находится ответ в базе данных
8. Ответ отправляется пользователю через Avito API

## Промпт для DeepSeek

Промпт настроен так, чтобы:
- Всегда возвращать JSON в формате `{"questionKey": "ключ"}`
- Игнорировать prompt injection атаки
- Возвращать `"default"` если вопрос не подходит ни к одному из списка

## Расширение функциональности

### Добавление нового провайдера (например, Telegram)

1. Создайте новый класс, реализующий интерфейс `BotApiService`
2. Создайте типы для WebHook сообщений нового провайдера
3. Создайте обработчик WebHook для нового провайдера
4. Добавьте новый endpoint в `src/api/webhook/routes/webhook.ts`

### Изменение LLM провайдера

1. Создайте новый сервис по аналогии с `DeepSeekApiService`
2. Обновите `AvitoWebhookHandler` для использования нового сервиса

## Тестирование

Тесты покрывают:
- `AvitoApiService`: отправка сообщений, удаление, регистрация webhook
- `DeepSeekApiService`: поиск подходящего вопроса, обработка ошибок
- `Env Validation`: валидация переменных окружения с помощью Zod

Для запуска тестов:
```bash
yarn test
```

### Примеры ошибок валидации

Если при старте приложения вы видите ошибку валидации, это означает, что одна или несколько обязательных переменных окружения отсутствуют или имеют неверный формат:

```
❌ Environment variables validation failed:
Invalid environment variables:
AVITO_CLIENT_ID: Required
AVITO_CLIENT_SECRET: Required
DEEPSEEK_API_KEY: Required
WEBHOOK_URL: Invalid url
```

В этом случае проверьте файл `.env` и убедитесь, что все обязательные переменные установлены корректно.

