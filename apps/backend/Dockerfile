FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl

COPY --from=builder /app /app

EXPOSE 4000
CMD ["node", "dist/main"]
