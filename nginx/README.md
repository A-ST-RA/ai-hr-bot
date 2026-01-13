# Nginx SSL сертификаты

Для работы HTTPS необходимо разместить SSL сертификаты в директории `nginx/ssl/`:

-   `cert.pem` - SSL сертификат
-   `key.pem` - приватный ключ

## Генерация самоподписанного сертификата (для тестирования)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=RU/ST=State/L=City/O=Organization/CN=localhost"
```

## Использование Let's Encrypt (для продакшена)

Для продакшена рекомендуется использовать Let's Encrypt. Доступны два скрипта:

### Автоматическая установка через certbot (требует установки certbot)

```bash
./install-letsencrypt.sh your-domain.com your-email@example.com
```

### Автоматическая установка через Docker (рекомендуется)

```bash
./install-letsencrypt-docker.sh your-domain.com your-email@example.com
```

Оба скрипта автоматически:
- Получают сертификат от Let's Encrypt
- Копируют сертификаты в `ssl/`
- Настраивают автоматическое обновление через cron

Подробнее см. `DOCKER_DEPLOY.md`
