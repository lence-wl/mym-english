# ===== 构建阶段：后端（NestJS）+ 前端（Vite）=====
FROM docker.1ms.run/library/node:20-alpine AS builder
WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

# sqlite3 需要本地编译，安装构建工具链（Alpine 专属参数）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache python3 py3-pip musl-dev linux-headers make gcc g++ \
    && pip install --no-cache-dir --break-system-packages setuptools

# 后端依赖
COPY package.json package-lock.json ./
RUN npm ci

# 前端依赖（pnpm；锁文件 pnpm-lock.yaml 为 v9.0，固定 pnpm 9 以免高版本改写锁文件）
# 注：前端 echarts@6 与 echarts-wordcloud@2 存在 peer 冲突，npm 无法解析，必须用 pnpm
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN npm install -g pnpm@9 \
    && cd frontend && pnpm install --frozen-lockfile

# 复制源码并构建（nest build -> dist/，vite build -> frontend/dist/）
COPY . .
RUN npm run build

# ===== 运行阶段 =====
FROM docker.1ms.run/library/node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]