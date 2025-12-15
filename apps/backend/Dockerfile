FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# Runtime deps: curl for healthcheck, openssl for Prisma engines
RUN apt-get update && apt-get install -y --no-install-recommends curl openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app

EXPOSE 4000
CMD ["node", "dist/main"]
