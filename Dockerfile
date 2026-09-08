FROM node:24-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json yarn.lock ./
COPY client/package.json client/
COPY server/package.json server/
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/presight.db
ENV CLIENT_DIR=/app/client/dist
ENV SEED_ON_EMPTY=true
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
