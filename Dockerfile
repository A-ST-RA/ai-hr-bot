FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json yarn.lock ./

# Устанавливаем зависимости
RUN yarn install --frozen-lockfile

# Копируем исходный код
COPY . .

# Собираем приложение (heap 3GB; на сервере желательно добавить swap 2–3 ГБ)
ENV NODE_OPTIONS="--max-old-space-size=3072"
RUN yarn build

# Production образ
FROM node:20-alpine

WORKDIR /app

# Копируем весь собранный Strapi из builder
COPY --from=builder /app ./

# Убираем dev-зависимости, ставим только production
RUN rm -rf node_modules && yarn install --frozen-lockfile --production

# Фикс плагина users-permissions: маршруты без route.info (кастомный webhook)
RUN sed -i "s/route\.info\.type/route.info \&\& route.info.type/g" \
  /app/node_modules/@strapi/plugin-users-permissions/dist/server/services/users-permissions.js

RUN mkdir -p node_modules/@strapi/admin/dist/server/server/build
COPY --from=builder /app/dist/build ./node_modules/@strapi/admin/dist/server/server/build

RUN mkdir -p .tmp/uploads

# Открываем порт
EXPOSE 1337

# Запускаем приложение
CMD ["yarn", "start"]
