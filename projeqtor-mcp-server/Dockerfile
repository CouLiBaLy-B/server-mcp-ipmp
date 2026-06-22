FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production MCP_TRANSPORT=http MCP_HTTP_PORT=3000
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY --from=build /app/build ./build
COPY .env.example README.md ./
EXPOSE 3000
USER node
CMD ["node", "build/index.js"]
