#!/bin/bash
set -e

# 复制环境变量
if [ ! -f .env ]; then
  cp .env.example .env
  echo "已创建 .env，请检查配置后重新运行"
  exit 1
fi

# 校验必填项（缺失会导致 JWT 签名失败 / 不创建管理员账号）
for key in JWT_SECRET ADMIN_DEFAULT_PASSWORD; do
  if ! grep -qE "^${key}=.+" .env; then
    echo "错误：.env 缺少 ${key}，请参照 .env.example 补齐后重试"
    exit 1
  fi
done

# 兼容 compose v2 插件（docker compose）与 v1 独立命令（docker-compose）
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "错误：未找到 docker compose（v2 插件）或 docker-compose（v1），请先安装"
  exit 1
fi

# 构建并启动
$COMPOSE up -d --build

echo "部署完成："
echo "  - 本机调试入口: http://127.0.0.1:8080/"
echo "  - 对外入口:     由 web-gateway 容器按域名反代到 mym-app:3000"
echo "  - 站点配置:     web-gateway 仓库的 conf.d/mym.conf（详见 README「线上接入」）"