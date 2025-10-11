FROM node:20-alpine AS base

RUN npm install -g serve

# ---------- deps ----------
FROM base AS deps
WORKDIR /app
COPY package*.json yarn.lock* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
  else echo "no lockfile" && exit 1; fi

# ---------- build ----------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM base AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
