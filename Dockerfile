FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/stsenarii ./stsenarii
COPY --from=build /app/normy.json ./normy.json
COPY --from=build /app/schema.json ./schema.json
COPY --from=build /app/zibraty.py ./zibraty.py

EXPOSE 3000

CMD ["node", "server/index.js"]
