// src/captcha/captcha.controller.ts
import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { CaptchaService } from './captcha.service';

@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  // 获取验证码（返回 SVG 和 token）
  @Get()
  getCaptcha() {
    return this.captchaService.generateCaptcha();
  }

  // 验证验证码（前端需传递 code 和 token）
  @Post('validate')
  @HttpCode(200)
  validate(@Body() body: { code: string; token: string }) {
    const isValid = this.captchaService.validateCaptcha(body.code, body.token);
    return {
      success: isValid,
      message: isValid ? '验证通过' : '验证码错误或已过期',
    };
  }
}
