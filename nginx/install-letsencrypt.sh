#!/bin/bash

# Скрипт для установки SSL сертификата Let's Encrypt
# Использование: ./install-letsencrypt.sh your-domain.com your-email@example.com

set -e

DOMAIN="${1}"
EMAIL="${2}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Ошибка: необходимо указать домен и email"
    echo ""
    echo "Использование:"
    echo "  ./install-letsencrypt.sh <domain> <email>"
    echo ""
    echo "Пример:"
    echo "  ./install-letsencrypt.sh example.com admin@example.com"
    exit 1
fi

echo "🔐 Установка SSL сертификата Let's Encrypt для домена: $DOMAIN"
echo "📧 Email: $EMAIL"
echo ""

# Проверяем, установлен ли certbot
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot не установлен!"
    echo ""
    echo "Установите certbot:"
    echo "  Ubuntu/Debian: sudo apt-get update && sudo apt-get install certbot"
    echo "  macOS: brew install certbot"
    echo "  CentOS/RHEL: sudo yum install certbot"
    exit 1
fi

# Создаем директорию для сертификатов
mkdir -p ssl

# Временно останавливаем nginx, если он запущен
echo "⏸️  Проверяю запущен ли nginx..."
if docker ps | grep -q ai-hr-bot-nginx; then
    echo "⏸️  Останавливаю nginx контейнер..."
    docker stop ai-hr-bot-nginx || true
fi

# Получаем сертификат через standalone режим
echo "🔍 Получаю сертификат через certbot (standalone режим)..."
echo "⚠️  Убедитесь, что порты 80 и 443 свободны и доступны извне!"

certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    --preferred-challenges http

# Копируем сертификаты в нужную директорию
echo "📋 Копирую сертификаты в nginx/ssl/..."

CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
SSL_DIR="$(pwd)/ssl"

if [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]; then
    sudo cp "$CERT_PATH/fullchain.pem" "$SSL_DIR/cert.pem"
    sudo cp "$CERT_PATH/privkey.pem" "$SSL_DIR/key.pem"
    sudo chown $(whoami):$(whoami) "$SSL_DIR/cert.pem" "$SSL_DIR/key.pem"
    sudo chmod 644 "$SSL_DIR/cert.pem"
    sudo chmod 600 "$SSL_DIR/key.pem"
    
    echo "✅ Сертификаты успешно скопированы!"
else
    echo "❌ Ошибка: сертификаты не найдены в $CERT_PATH"
    exit 1
fi

# Настраиваем автоматическое обновление
echo "🔄 Настраиваю автоматическое обновление сертификатов..."

# Создаем скрипт для обновления
cat > "$SSL_DIR/renew-cert.sh" << 'EOF'
#!/bin/bash
# Скрипт для обновления сертификата Let's Encrypt

DOMAIN="${1}"
if [ -z "$DOMAIN" ]; then
    echo "Использование: $0 <domain>"
    exit 1
fi

# Обновляем сертификат
certbot renew --quiet

# Копируем обновленные сертификаты
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
SSL_DIR="$(dirname "$0")"

if [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]; then
    sudo cp "$CERT_PATH/fullchain.pem" "$SSL_DIR/cert.pem"
    sudo cp "$CERT_PATH/privkey.pem" "$SSL_DIR/key.pem"
    sudo chown $(whoami):$(whoami) "$SSL_DIR/cert.pem" "$SSL_DIR/key.pem"
    sudo chmod 644 "$SSL_DIR/cert.pem"
    sudo chmod 600 "$SSL_DIR/key.pem"
    
    # Перезапускаем nginx контейнер
    if docker ps | grep -q ai-hr-bot-nginx; then
        echo "🔄 Перезапускаю nginx контейнер..."
        docker restart ai-hr-bot-nginx
    fi
    
    echo "✅ Сертификат обновлен и nginx перезапущен!"
else
    echo "❌ Ошибка при обновлении сертификата"
    exit 1
fi
EOF

chmod +x "$SSL_DIR/renew-cert.sh"

# Добавляем cron job для автоматического обновления (если не добавлен)
CRON_JOB="0 3 * * * $(pwd)/ssl/renew-cert.sh $DOMAIN >> /var/log/letsencrypt-renew.log 2>&1"

if ! crontab -l 2>/dev/null | grep -q "renew-cert.sh"; then
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
echo "  - Скрипт обновления: ssl/renew-cert.sh"
echo ""
echo "🔄 Для ручного обновления выполните:"
echo "  ./ssl/renew-cert.sh $DOMAIN"
echo ""
echo "⚠️  Важно: убедитесь, что в .env файле WEBHOOK_URL указывает на https://$DOMAIN"
