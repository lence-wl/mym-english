// src/captcha/captcha.module.ts
import { Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { CaptchaController } from './captcha.controller';

@Module({
  imports: [],
  controllers: [CaptchaController],
  providers: [CaptchaService],
  exports: [],
})
export class CaptchaModule {}
