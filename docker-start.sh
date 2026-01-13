#!/bin/bash

# Скрипт для быстрого запуска Docker Compose

set -e

echo "🚀 Запуск AI HR Bot с Docker Compose..."

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "📝 Создайте файл .env на основе примера в DOCKER_DEPLOY.md"
    exit 1
fi

# Проверяем наличие SSL сертификатов
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo "⚠️  SSL сертификаты не найдены!"
    echo "🔐 Генерирую самоподписанный сертификат..."
    cd nginx
    chmod +x generate-ssl.sh
    ./generate-ssl.sh
    cd ..
fi

# Генерируем APP_KEYS если они не установлены
if ! grep -q "APP_KEYS=" .env || grep -q "APP_KEYS=your-app-key" .env; then
    echo "🔑 Генерирую APP_KEYS..."
    APP_KEYS=$(node -e "console.log(Array(4).fill(0).map(() => require('crypto').randomBytes(32).toString('base64')).join(','))")
    
    if grep -q "APP_KEYS=" .env; then
        # Заменяем существующую строку
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|APP_KEYS=.*|APP_KEYS=$APP_KEYS|" .env
        else
            # Linux
            sed -i "s|APP_KEYS=.*|APP_KEYS=$APP_KEYS|" .env
        fi
    else
        # Добавляем новую строку
        echo "APP_KEYS=$APP_KEYS" >> .env
    fi
    echo "✅ APP_KEYS сгенерированы и добавлены в .env"
fi

echo "🐳 Запускаю Docker Compose..."
docker-compose up -d

echo "⏳ Ожидание запуска сервисов..."
sleep 5

echo "📊 Статус контейнеров:"
docker-compose ps

echo ""
echo "✅ Готово! Приложение запущено."
echo "🌐 Доступно по адресу: https://localhost (или ваш домен)"
echo ""
echo "📝 Полезные команды:"
echo "  - Просмотр логов: docker-compose logs -f"
echo "  - Остановка: docker-compose down"
echo "  - Перезапуск: docker-compose restart"
