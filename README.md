# mym-english 英语阅读器（前后端一体）

英语电子书阅读器：前端 React 19 + Vite，后端 NestJS 11 + SQLite（TypeORM），整体 Docker 化部署。
后端在生产环境直接托管前端构建产物，宿主 80/443 由同目录下的独立入口网关仓库 `../web-gateway` 按域名反代。

## 项目结构

```
mym-english/
├── src/                      # NestJS 后端
│   ├── main.ts               # 入口（/api 前缀 + 托管 frontend/dist + /uploads）
│   ├── app.module.ts         # 根模块（Config + TypeORM + 业务模块 + 全局拦截器/过滤器）
│   └── ...                   # auth / user / book / word / llm / tts / captcha / upload 等模块
├── frontend/                 # React + Vite 前端
│   ├── src/                  # 前端源码
│   ├── vite.config.ts        # dev server + /api、/uploads 代理到本地后端
│   └── package.json          # 前端独立依赖（npm）
├── docker-compose.yml        # app 编排（SQLite/上传卷，app 加入外部网络 web，回环暴露 8080 便于调试）
├── Dockerfile                # 多阶段构建（后端 nest build + 前端 vite build，产物由后端托管）
├── .env.example              # 环境变量模板
└── deploy.sh                 # 一键部署脚本
```

> 对外入口说明：本机 80/443 由独立的入口网关仓库 `../web-gateway` 持有，
> 本站点的 server 配置放在 `../web-gateway/conf.d/mym.conf`（80 + ACME）
> 与 `mym-ssl.conf.disabled`（443，证书就绪后启用），本项目不包含任何 nginx 配置。

## 本地开发

依赖：Node ≥ 20、npm（后端）、pnpm（前端）。

```bash
npm install                      # 安装后端依赖
pnpm --dir frontend install      # 安装前端依赖（必须用 pnpm，见 frontend/pnpm-lock.yaml）
npm run dev                      # 并行启动 NestJS(3000) + Vite(3010)
```

- 阅读器：http://localhost:3010
- API：http://localhost:3000/api/...

Vite 开发服务器将 `/api`、`/uploads` 代理到本机 3000 端口。

## Docker 部署

```bash
cp .env.example .env            # 必须修改：JWT_SECRET、ADMIN_DEFAULT_PASSWORD
./deploy.sh                     # 等价于 docker compose up -d --build
```

或手动：

```bash
docker compose up -d --build
```

- 本机调试入口：http://127.0.0.1:8080/（compose 仅起 app，不包含 nginx）
- 对外访问：由 `../web-gateway` 的入口 nginx 容器按域名反代到 `mym-app:3000`

### 环境变量

| 变量 | 说明 |
|------|------|
| PORT | 容器内服务端口，默认 3000 |
| APP_PORT | 宿主机回环映射端口，默认 8080（仅供本机调试，不对外） |
| DB_PATH | SQLite 数据库文件路径，生产容器内为 `/data/app.db`（已挂载 `mym_db` 卷持久化） |
| UPLOAD_DIR | 上传目录，默认 `uploads`（容器内 `/app/uploads`，已挂载 `mym_uploads` 卷持久化） |
| JWT_SECRET | JWT 签名密钥，**生产必填** |
| BCRYPT_SALT_ROUNDS | bcrypt 加密轮数，默认 14 |
| ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD | 首次启动自动创建的管理员账号（同名用户已存在则跳过），**生产必填** |

### 服务

| 服务 | 说明 |
|------|------|
| app | NestJS，托管前端产物 + 提供 /api 接口，SQLite 数据卷 `mym_db`，上传目录 `mym_uploads`，映射宿主 8080 |

## 线上接入（独立入口网关）

本项目不持有宿主 80/443，入口由独立的网关仓库 `../web-gateway` 持有，它按域名反代到本项目的 `mym-app:3000`。

```bash
# 下文用 docker compose（v2 插件）；若服务器只有 v1，把 "docker compose" 换成 "docker-compose"

# 1) 建共用网络 + 启动网关（都是只需一次的操作，网关仓库独立部署）
docker network create web
cd ../web-gateway && docker compose up -d

# 2) 启动 mym-english（.env 中 JWT_SECRET / ADMIN_DEFAULT_PASSWORD 必填）
cd ../mym-english && ./deploy.sh

# 3) 让网关加载本站点配置（域名已写在 conf.d/mym.conf 里，无需再改）
cd ../web-gateway
docker exec web-gateway nginx -t && docker exec web-gateway nginx -s reload

# 4) 签发证书（DNS 解析生效后再跑；80 由网关持有，不能用 --standalone）
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot -d mym-english.com -d www.mym-english.com
# 证书会落到 /etc/letsencrypt/live/mym-english.com/，与网关 conf 里的路径一致；
# 自动续期（deploy hook）等细节见 web-gateway/README.md「更换 / 续期证书」

# 5) 启用 443
mv conf.d/mym-ssl.conf.disabled conf.d/mym-ssl.conf
docker exec web-gateway nginx -t && docker exec web-gateway nginx -s reload
```

## API 一览

所有接口均带 `/api` 前缀（前端 axios baseURL 为 `/api`），上传文件通过 `/uploads/<filename>` 访问。

| 方法+路径 | 说明 |
|---|---|
| POST /api/auth/register、POST /api/auth/login、GET /api/auth/me | 注册 / 登录 / 当前用户 |
| GET /api/captcha、POST /api/captcha/validate | 图形验证码 |
| GET /api/books、POST /api/books/upload、GET/PUT/DELETE /api/books/:id、POST /api/books/batch | 电子书管理（epub 上传） |
| GET /api/words、GET /api/words/search、DELETE /api/words/by-word | 单词 / 句子本 |
| POST /api/dbmd/superEnglishDict、POST /api/dbmd/superEnglishDict/stream | 词句释义（非流式 / SSE 流式） |
| POST /api/tts/synth | 文字转语音 |
| GET /api/users、GET/PUT/DELETE /api/users/:id | 用户管理 |