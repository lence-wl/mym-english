import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { databaseConfig } from './config/database.config';

import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './user/user.module';
import { CaptchaModule } from './captcha/captcha.module';
import { BookModule } from './book/book.module';
import { WordModule } from './word/word.module';
import { LLMModule } from './llm/llm.module';
import { TtsModule } from './tts/tts.module';
@Module({
  imports: [
    // 配置SQLite数据库连接
    TypeOrmModule.forRoot(databaseConfig), // 应用数据库配置
    // 注册实体到模块中（供业务代码使用）
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '2w' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用，无需在其他模块重复导入
      envFilePath: '.env', // 指定 .env 文件路径（默认根目录）
      ignoreEnvFile: process.env.NODE_ENV === 'production', // 生产环境可忽略 .env 文件
    }),
    AuthModule,
    UserModule,
    CaptchaModule,
    BookModule,
    WordModule,
    LLMModule,
    TtsModule
  ],
  controllers: [AppController],
  providers: [
    // 全局响应拦截器（统一成功响应）
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // 全局异常过滤器（统一错误响应）
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule {}