import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UserService } from '../user/user.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * 用户注册接口
   */
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.register(createUserDto);
    return {
      message: '注册成功',
      data: user,
    };
  }

  /**
   * 用户登录接口（显式使用 AuthService 的 login 方法）
   */
  @UseGuards(AuthGuard('local')) // 仍使用 LocalStrategy 验证用户名密码
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    // 调用 AuthService 的 login 方法生成令牌
    const result = await this.authService.login(loginUserDto);
    return {
      message: '登录成功',
      data: result, // 包含 token、tokenType 和 user 信息
    };
  }
  /**
   * 获取当前用户信息（包含角色）
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    // 从数据库获取完整用户信息（包含角色）
    const user = await this.authService.getUserById(req.user.id);
    // 获取用户统计数据
    const stats = await this.userService.getUserStats(req.user.id);
    return {
      message: '获取用户信息成功',
      data: {
        ...user,
        ...stats,
      },
    };
  }
}
