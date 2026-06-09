# Dockerfile for Astro SSR application using Bun runtime

FROM oven/bun:1.3.14 AS dependencies

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.14 AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:1.3.14-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 astro && \
    adduser --system --uid 1001 astro

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER astro

EXPOSE 3000

CMD ["bun", "run", "start"]
