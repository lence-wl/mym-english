import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (!user) {
      let message = '未授权访问'; // 默认消息
      if (info) {
        switch (info.name) {
          case 'TokenExpiredError':
            message = '登录已过期，请重新登录'; // token 过期
            break;
          case 'JsonWebTokenError':
            message = '无效的token，请重新登录'; // token 无效
            break;
          case 'NotBeforeError':
            message = 'token尚未生效'; // token 未到生效时间
            break;
        }
      }
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
