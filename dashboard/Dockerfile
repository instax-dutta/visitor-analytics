# ---- Deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules/.bin ./node_modules/.bin
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/next-env.d.ts ./next-env.d.ts
EXPOSE 3001
USER node
CMD ["npm", "run", "start"]
