# Build a partir da RAIZ do monorepo (o contexto precisa incluir packages/shared):
#   docker build -f apps/api/Dockerfile -t teams-tasks-api .

FROM node:22-alpine AS builder

# O engine do Prisma para Alpine e linkado contra o OpenSSL do sistema.
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app

# Manifests primeiro: enquanto as dependencias nao mudam, esta camada e cache.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# `build` roda prisma generate + tsup. O tsup embute @teams-tasks/shared no
# bundle, entao o runtime nao precisa compilar o pacote compartilhado.
RUN pnpm --filter @teams-tasks/api build

# ---

FROM node:22-alpine AS runtime

RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app

ENV NODE_ENV=production

# node_modules vem pronto do builder: nada de reinstalar (e de precisar de
# rede) no estagio final. O CLI do Prisma vem junto de proposito, porque a
# migration e aplicada no start.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./

WORKDIR /app/apps/api

# Roda como usuario sem privilegio (a imagem node ja traz o usuario `node`).
USER node

EXPOSE 3333

# `migrate deploy` no start mantem o schema em dia a cada deploy. E idempotente
# e nunca destrutivo - diferente de `migrate dev`, que jamais deve rodar aqui.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
