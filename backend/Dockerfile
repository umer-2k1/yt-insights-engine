# --- Build stage: full deps, prisma generate, tsc ---
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma:generate

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# --- Prune stage: keep `build` intact (compose uses it to run migrations
# with the prisma CLI); drop dev dependencies here. The generated Prisma
# client lives under @prisma/client (a prod dep) and survives the prune.
FROM build AS pruned
RUN pnpm prune --prod

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=pruned /app/node_modules ./node_modules
COPY --from=pruned /app/dist ./dist
COPY --from=pruned /app/package.json ./package.json
COPY prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/index.js"]
