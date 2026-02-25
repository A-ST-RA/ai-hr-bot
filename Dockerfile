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

# Копируем package.json и yarn.lock
COPY package.json yarn.lock ./

# Устанавливаем только production зависимости
RUN yarn install --frozen-lockfile --production

# Копируем собранное приложение из builder (админка в Strapi 5 лежит в dist/build)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist/config ./config
COPY --from=builder /app/database ./database
COPY --from=builder /app/src ./src
COPY --from=builder /app/types ./types
COPY --from=builder /app/favicon.png ./
COPY --from=builder /app/package.json ./

RUN mkdir -p node_modules/@strapi/admin/dist/server/server/build
COPY --from=builder /app/dist/build ./node_modules/@strapi/admin/dist/server/server/build

RUN mkdir -p .tmp/uploads

# Открываем порт
EXPOSE 1337

# Запускаем приложение
CMD ["yarn", "start"]
