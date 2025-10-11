# ---------- Base stage ----------
FROM node:18 AS base

# Install `serve` globally to serve static files
RUN npm install -g serve

# ---------- Dependency stage ----------
FROM base as deps

WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ---------- Build stage ----------
FROM base as builder

WORKDIR /app

# Copy node_modules and build files
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Run build command to generate static assets
RUN npm run build

# ---------- Production stage ----------
FROM base as runner

WORKDIR /app

# Copy the build folder
COPY --from=builder /app/dist ./dist

# Set the default environment to production
ENV NODE_ENV=production

# Start the app using `serve`
CMD ["serve", "-s", "dist", "-l", "80"]

# Expose port 80
EXPOSE 80
