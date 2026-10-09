import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync } from 'fs';
import express from 'express';

async function bootstrap() {
  // 创建 Nest 应用（MongoDB 连接由 MongooseModule 负责）
  const app = await NestFactory.create(AppModule);

  // 跨域配置：后端直接托管前端产物，前后端同源，生产环境无需放开跨域；
  // 仅本地开发（Vite dev server 3010）需要放行。
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: 'http://localhost:3010',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });
  }

  // 所有接口统一带 /api 前缀（与前端 axios baseURL 对齐）
  app.setGlobalPrefix('api');

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 上传目录静态托管：/uploads/xxx（容器内即 /app/uploads，可用 UPLOAD_DIR 覆盖）
  const uploadPath = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  app.use('/uploads', express.static(uploadPath));
  console.log(`静态文件服务已启用，路径：${uploadPath}`);

  // 移动端前端（PWA）构建产物，托管在 /m 路径下。
  // 必须注册在桌面端静态托管之前，否则 /m 会被桌面端 SPA 回退吞掉。
  const mobileDist = join(process.cwd(), 'frontend-mobile', 'dist');
  if (existsSync(mobileDist)) {
    const mobileAssetsDir = join(mobileDist, 'assets');
    app.use(
      '/m',
      express.static(mobileDist, {
        setHeaders: (res, filePath) => {
          if (filePath.startsWith(mobileAssetsDir)) {
            // 产物文件名带内容 hash → 长期强缓存
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else {
            // 入口 HTML / manifest / sw.js 必须实时校验，避免 PWA 一直使用旧外壳
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    // 移动端 SPA 路由刷新回退
    app.use((req, res, next) => {
      if (!req.path.startsWith('/m')) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(mobileDist, 'index.html'));
    });
    console.log(`移动端静态托管已启用，路径：${mobileDist}（访问 /m/）`);
  }

  // 生产环境：托管前端构建产物 frontend/dist，SPA 路由刷新回退 index.html
  const frontendDist = join(process.cwd(), 'frontend', 'dist');
  if (existsSync(frontendDist)) {
    // 缓存策略：assets 文件名带内容 hash → 长期强缓存；
    // 图片/字体随发版更新但文件名无 hash → 缓存一天；入口文件 → no-cache。
    const assetsDir = join(frontendDist, 'assets');
    const imageFontExt = /\.(png|jpe?g|gif|svg|webp|ico|bmp|woff2?|ttf|eot)$/i;
    app.use(
      express.static(frontendDist, {
        setHeaders: (res, filePath) => {
          const cacheControl = filePath.startsWith(assetsDir)
            ? 'public, max-age=31536000, immutable'
            : imageFontExt.test(filePath)
              ? 'public, max-age=86400'
              : 'no-cache';
          res.setHeader('Cache-Control', cacheControl);
        },
      }),
    );
    app.use((req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/m')
      ) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(frontendDist, 'index.html'));
    });
    console.log(`前端静态托管已启用，路径：${frontendDist}`);
  }

  // 监听端口（优先使用环境变量，默认3000）
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`应用已启动：${await app.getUrl()}`);
}
bootstrap();