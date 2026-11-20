# Fieldbook as it is served to a run: production build, one SQLite file under /data.
FROM node:22-bookworm-slim AS build
# better-sqlite3 has no ready-made binary for this platform and compiles on install.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && rm -rf .next/cache

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
RUN mkdir -p /data
EXPOSE 3100
CMD ["npx", "next", "start", "-p", "3100"]
