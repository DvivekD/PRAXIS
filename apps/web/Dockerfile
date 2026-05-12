FROM node:20-alpine

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web ./apps/web/
COPY packages ./packages/
COPY tooling ./tooling/

RUN pnpm install

WORKDIR /app/apps/web
CMD ["pnpm", "dev"]
