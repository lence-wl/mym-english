import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'username', // 对应请求体中的username字段
      passwordField: 'password', // 对应请求体中的password字段
    });
  }

  /**
   * 策略验证方法（Passport会自动调用）
   * @param username 用户名
   * @param password 密码
   * @returns 验证通过的用户信息
   */
  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('认证失败');
    }
    return user; // 验证成功后会挂载到request.user
  }
}
