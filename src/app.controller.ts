import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  // 受保护的路由（需要登录才能访问）
  @UseGuards(AuthGuard('local')) // 使用local策略保护
  @Get('profile')
  getProfile(@Request() req) {
    return {
      message: '这是受保护的个人信息接口',
      user: req.user, // 登录用户信息
    };
  }
}
