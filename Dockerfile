# Step 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Step 2: Production Node Server
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production
COPY backend/ ./backend/
COPY --from=frontend-builder /app/dist ./backend/public

WORKDIR /app/backend
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "server.js"]
