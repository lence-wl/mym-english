# ===== 构建阶段：后端（NestJS）+ 前端（Vite）=====
FROM docker.1ms.run/library/node:20-alpine AS builder
WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

# 后端依赖
COPY package.json package-lock.json ./
RUN npm ci

# 前端依赖（pnpm；桌面端与移动端锁文件均为 v9.0，固定 pnpm 9 以免高版本改写锁文件）
# 注：前端 echarts@6 与 echarts-wordcloud@2 存在 peer 冲突，npm 无法解析，必须用 pnpm
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
COPY frontend-mobile/package.json frontend-mobile/pnpm-lock.yaml frontend-mobile/pnpm-workspace.yaml ./frontend-mobile/
RUN npm install -g pnpm@9 \
    && cd frontend && pnpm install --frozen-lockfile \
    && cd ../frontend-mobile && pnpm install --frozen-lockfile

# 复制源码并构建（nest build -> dist/，vite build -> frontend/dist/ 与 frontend-mobile/dist/）
COPY . .
RUN npm run build

# ===== 运行阶段 =====
FROM docker.1ms.run/library/node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/frontend-mobile/dist ./frontend-mobile/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]