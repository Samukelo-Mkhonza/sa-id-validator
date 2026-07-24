# --- Build stage: install deps and build the React client ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# Drop dev dependencies from the copy we ship.
RUN npm prune --omit=dev

# --- Runtime stage: Express serves the API + the built client ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./
EXPOSE 3001
CMD ["node", "server/index.js"]
