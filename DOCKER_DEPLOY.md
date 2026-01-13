# Docker Compose деплой

Инструкция по развертыванию приложения с помощью Docker Compose.

## Структура

- **nginx** - обратный прокси на порту 443 (HTTPS) и 80 (HTTP -> HTTPS редирект)
- **app** - Node.js приложение (Strapi)
- **postgres** - база данных PostgreSQL

## Быстрый старт

### 1. Создайте файл `.env`

Скопируйте пример ниже и заполните все необходимые переменные:

```env
# ============================================
# Server Configuration
# ============================================
HOST=0.0.0.0
PORT=1337
NODE_ENV=production

# Strapi App Keys (сгенерируйте случайные строки)
APP_KEYS=key1,key2,key3,key4

# ============================================
# Database Configuration
# ============================================
DATABASE_CLIENT=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=your-secure-password-here
DATABASE_SCHEMA=public

# ============================================
# Avito API Configuration
# ============================================
AVITO_CLIENT_ID=your_avito_client_id
AVITO_CLIENT_SECRET=your_avito_client_secret
AVITO_USER_ID=your_avito_user_id

# ============================================
# DeepSeek API Configuration
# ============================================
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat

# ============================================
# Webhook Configuration
# ============================================
WEBHOOK_URL=https://your-domain.com/api/webhook/avito

# ============================================
# Nginx Configuration
# ============================================
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

### 2. Сгенерируйте SSL сертификаты

Для HTTPS необходимо создать SSL сертификаты:

```bash
cd nginx
chmod +x generate-ssl.sh
./generate-ssl.sh
```

**Важно:** Скрипт создает самоподписанный сертификат, подходящий только для тестирования. Для продакшена используйте Let's Encrypt или другой доверенный CA.

### 3. Сгенерируйте APP_KEYS для Strapi

Вы можете использовать следующий скрипт для генерации случайных ключей:

```bash
node -e "console.log(Array(4).fill(0).map(() => require('crypto').randomBytes(32).toString('base64')).join(','))"
```

### 4. Запустите контейнеры

```bash
docker-compose up -d
```

### 5. Проверьте логи

```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f postgres
```

## Управление

### Остановка

```bash
docker-compose down
```

### Остановка с удалением volumes (⚠️ удалит данные БД)

```bash
docker-compose down -v
```

### Пересборка после изменений

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Перезапуск сервиса

```bash
docker-compose restart app
```

## Переменные окружения

Все настройки производятся через файл `.env`. Основные переменные:

### Обязательные

- `AVITO_CLIENT_ID` - ID клиента Avito API
- `AVITO_CLIENT_SECRET` - Секрет клиента Avito API
- `AVITO_USER_ID` - ID пользователя Avito
- `DEEPSEEK_API_KEY` - API ключ DeepSeek
- `APP_KEYS` - Ключи приложения Strapi (4 ключа через запятую)
- `DATABASE_PASSWORD` - Пароль базы данных

### Опциональные

- `WEBHOOK_URL` - URL для автоматической регистрации webhook
- `DEEPSEEK_MODEL` - Модель DeepSeek (по умолчанию: deepseek-chat)
- `NGINX_HTTP_PORT` - Порт HTTP для nginx (по умолчанию: 80)
- `NGINX_HTTPS_PORT` - Порт HTTPS для nginx (по умолчанию: 443)
- `DATABASE_PORT` - Порт PostgreSQL (по умолчанию: 5432)

## SSL сертификаты для продакшена

Для продакшена рекомендуется использовать Let's Encrypt. Доступны два варианта установки:

### Вариант 1: Установка через certbot (требует установки certbot на хосте)

```bash
cd nginx
./install-letsencrypt.sh your-domain.com your-email@example.com
```

**Требования:**
- Certbot должен быть установлен на хосте
- Порты 80 и 443 должны быть свободны и доступны извне

### Вариант 2: Установка через Docker (рекомендуется)

Этот вариант использует certbot в Docker контейнере, не требует установки certbot на хосте:

```bash
cd nginx
./install-letsencrypt-docker.sh your-domain.com your-email@example.com
```

**Требования:**
- Docker должен быть установлен
- Порты 80 и 443 должны быть свободны и доступны извне

### Что делают скрипты:

1. ✅ Получают SSL сертификат от Let's Encrypt
2. ✅ Копируют сертификаты в `nginx/ssl/`
3. ✅ Настраивают автоматическое обновление через cron (каждый день в 3:00)
4. ✅ Создают скрипты для ручного обновления

### Ручное обновление сертификата

Если certbot установлен на хосте:
```bash
./nginx/ssl/renew-cert.sh your-domain.com
```

Если используется Docker вариант:
```bash
./nginx/ssl/renew-cert-docker.sh your-domain.com
```

### Важные замечания:

- ⚠️ Перед запуском скрипта убедитесь, что домен указывает на ваш сервер (A-запись)
- ⚠️ Порты 80 и 443 должны быть открыты в файрволе
- ⚠️ Nginx контейнер будет временно остановлен во время получения сертификата
- ⚠️ После установки обновите `WEBHOOK_URL` в `.env` файле на `https://your-domain.com/api/webhook/avito`

## Проблемы и решения

### Приложение не запускается

1. Проверьте логи: `docker-compose logs app`
2. Убедитесь, что все обязательные переменные окружения установлены
3. Проверьте подключение к базе данных

### Nginx не может подключиться к приложению

1. Убедитесь, что приложение запущено: `docker-compose ps`
2. Проверьте, что приложение слушает на порту 1337
3. Проверьте сеть: `docker network inspect ai-hr-bot_app-network`

### Проблемы с SSL

1. Убедитесь, что сертификаты находятся в `nginx/ssl/`
2. Проверьте права доступа к файлам сертификатов
3. Проверьте логи nginx: `docker-compose logs nginx`

## Резервное копирование базы данных

### Создание бэкапа

```bash
docker-compose exec postgres pg_dump -U strapi strapi > backup.sql
```

### Восстановление из бэкапа

```bash
docker-compose exec -T postgres psql -U strapi strapi < backup.sql
```
