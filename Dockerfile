# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
# copy CHÍNH XÁC 2 file
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]