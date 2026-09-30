// src/captcha/captcha.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as svgCaptcha from 'svg-captcha';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class CaptchaService {
  constructor(private readonly configService: ConfigService) {}

  // 加密密钥（AES-256 需 32 字节），通过环境变量 CAPTCHA_SECRET_KEY 注入
  private get secretKey(): string {
    const secretKey = this.configService.get<string>('CAPTCHA_SECRET_KEY');
    if (!secretKey) {
      throw new Error('缺少环境变量 CAPTCHA_SECRET_KEY，请在 .env 中配置');
    }
    return secretKey;
  }

  /**
   * 生成验证码（无缓存，加密验证码文本）
   * @returns SVG 字符串 + 加密后的验证码 token
   */
  generateCaptcha() {
    const captcha = svgCaptcha.create({
      height: 40,
      ignoreChars: '0o1ilpq',
      noise: 2,
      color: true,
      fontSize: 44,
      background: '#fff',
    });

    // 加密验证码文本（设置有效期，如 5 分钟）
    const expireTime = Date.now() + 5 * 60 * 1000; // 5分钟后过期
    const captchaInfo = {
      text: captcha.text.toLowerCase(),
      expireTime,
    };

    // AES 加密
    const token = CryptoJS.AES.encrypt(
      JSON.stringify(captchaInfo),
      this.secretKey,
    ).toString();

    return {
      data: {
        svg: captcha.data,
        token, // 前端需保存此 token，验证时传回
      },
      message: '操作成功啦啦啦',
    };
  }

  /**
   * 验证验证码（解密 token 校验）
   * @param userCode 用户输入的验证码
   * @param token 生成验证码时返回的加密 token
   * @returns 是否验证通过
   */
  validateCaptcha(userCode: string, token: string) {
    try {
      // 解密 token
      const bytes = CryptoJS.AES.decrypt(token, this.secretKey);
      const captchaInfo = JSON.parse(
        bytes.toString(CryptoJS.enc.Utf8) as string,
      );

      // 校验有效期
      if (Date.now() > captchaInfo.expireTime) {
        return false; // 验证码已过期
      }

      // 校验验证码
      return captchaInfo.text === userCode.toLowerCase();
    } catch (error) {
      // 解密失败（如 token 被篡改）
      console.error(error);
      return false;
    }
  }
}
