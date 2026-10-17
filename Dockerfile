FROM node:22-bookworm-slim AS build
WORKDIR /app
# Ferramentas de compilação caso o módulo nativo do SQLite precise ser compilado
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build --chown=node:node /app ./
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000
# `npm run seed` funciona dentro do contêiner (docker compose exec app npm run seed)
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
