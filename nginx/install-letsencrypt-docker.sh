#!/bin/bash

# Скрипт для установки SSL сертификата Let's Encrypt через Docker
# Этот вариант использует certbot в Docker контейнере
# Использование: ./install-letsencrypt-docker.sh your-domain.com your-email@example.com

set -e

DOMAIN="${1}"
EMAIL="${2}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Ошибка: необходимо указать домен и email"
    echo ""
    echo "Использование:"
    echo "  ./install-letsencrypt-docker.sh <domain> <email>"
    echo ""
    echo "Пример:"
    echo "  ./install-letsencrypt-docker.sh example.com admin@example.com"
    exit 1
fi

echo "🔐 Установка SSL сертификата Let's Encrypt через Docker для домена: $DOMAIN"
echo "📧 Email: $EMAIL"
echo ""

# Создаем директорию для сертификатов
mkdir -p ssl

# Временно останавливаем nginx, если он запущен
echo "⏸️  Проверяю запущен ли nginx..."
if docker ps | grep -q ai-hr-bot-nginx; then
    echo "⏸️  Останавливаю nginx контейнер..."
    docker stop ai-hr-bot-nginx || true
fi

# Получаем сертификат через Docker контейнер certbot
echo "🔍 Получаю сертификат через certbot (Docker)..."
echo "⚠️  Убедитесь, что порты 80 и 443 свободны и доступны извне!"

docker run -it --rm \
    -v "$(pwd)/ssl:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    -p 80:80 \
    -p 443:443 \
    certbot/certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    --preferred-challenges http

# Копируем сертификаты в нужную директорию
echo "📋 Копирую сертификаты..."

SSL_DIR="$(pwd)/ssl"
CERT_DIR="$SSL_DIR/live/$DOMAIN"

if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    cp "$CERT_DIR/fullchain.pem" "$SSL_DIR/cert.pem"
    cp "$CERT_DIR/privkey.pem" "$SSL_DIR/key.pem"
    chmod 644 "$SSL_DIR/cert.pem"
    chmod 600 "$SSL_DIR/key.pem"
    
    echo "✅ Сертификаты успешно скопированы!"
else
    echo "❌ Ошибка: сертификаты не найдены в $CERT_DIR"
    exit 1
fi

# Настраиваем автоматическое обновление
echo "🔄 Настраиваю автоматическое обновление сертификатов..."

# Создаем скрипт для обновления через Docker
cat > "$SSL_DIR/renew-cert-docker.sh" << 'EOF'
#!/bin/bash
# Скрипт для обновления сертификата Let's Encrypt через Docker

DOMAIN="${1}"
if [ -z "$DOMAIN" ]; then
    echo "Использование: $0 <domain>"
    exit 1
fi

SSL_DIR="$(dirname "$0")"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Останавливаем nginx для обновления
if docker ps | grep -q ai-hr-bot-nginx; then
    echo "⏸️  Останавливаю nginx..."
    docker stop ai-hr-bot-nginx || true
fi

# Обновляем сертификат через Docker
docker run -it --rm \
    -v "$SSL_DIR:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    -p 80:80 \
    -p 443:443 \
    certbot/certbot renew --quiet

# Копируем обновленные сертификаты
CERT_DIR="$SSL_DIR/live/$DOMAIN"

if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    cp "$CERT_DIR/fullchain.pem" "$SSL_DIR/cert.pem"
    cp "$CERT_DIR/privkey.pem" "$SSL_DIR/key.pem"
    chmod 644 "$SSL_DIR/cert.pem"
    chmod 600 "$SSL_DIR/key.pem"
    
    # Запускаем nginx обратно
    echo "🚀 Запускаю nginx..."
    cd "$SCRIPT_DIR/.."
    docker start ai-hr-bot-nginx || docker-compose up -d nginx
    
    echo "✅ Сертификат обновлен и nginx перезапущен!"
else
    echo "❌ Ошибка при обновлении сертификата"
    exit 1
fi
EOF

chmod +x "$SSL_DIR/renew-cert-docker.sh"

# Добавляем cron job для автоматического обновления (если не добавлен)
CRON_JOB="0 3 * * * $(pwd)/ssl/renew-cert-docker.sh $DOMAIN >> /var/log/letsencrypt-renew.log 2>&1"

if ! crontab -l 2>/dev/null | grep -q "renew-cert-docker.sh"; then
    echo "📅 Добавляю cron job для автоматического обновления..."
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job добавлен (обновление каждый день в 3:00)"
else
    echo "ℹ️  Cron job для обновления уже существует"
fi

# Запускаем nginx обратно
echo "🚀 Запускаю nginx контейнер..."
if docker ps -a | grep -q ai-hr-bot-nginx; then
    docker start ai-hr-bot-nginx || docker-compose up -d nginx
fi

echo ""
echo "✅ Готово! SSL сертификат Let's Encrypt установлен для домена: $DOMAIN"
echo ""
echo "📝 Информация:"
echo "  - Сертификат: ssl/cert.pem"
echo "  - Приватный ключ: ssl/key.pem"
echo "  - Автоматическое обновление: настроено (каждый день в 3:00)"
echo "  - Скрипт обновления: ssl/renew-cert-docker.sh"
echo ""
echo "🔄 Для ручного обновления выполните:"
echo "  ./ssl/renew-cert-docker.sh $DOMAIN"
echo ""
echo "⚠️  Важно: убедитесь, что в .env файле WEBHOOK_URL указывает на https://$DOMAIN"
