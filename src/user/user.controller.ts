// src/user/user.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateReadingStatusDto } from './dto/update-reading-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard) // 所有用户接口需要登录验证
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取用户列表
   */
  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  /**
   * 获取单个用户详情
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  /**
   * 更新用户信息
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  /**
   * 删除用户（软删除）
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  /**
   * 恢复被删除的用户
   */
  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.userService.restore(+id);
  }

  /**
   * 更新当前登录用户的阅读状态
   */
  @Patch('/me/reading-status')
  updateMyReadingStatus(
    @Request() req,
    @Body() updateReadingStatusDto: UpdateReadingStatusDto,
  ) {
    return this.userService.updateReadingStatus(
      req.user.id,
      updateReadingStatusDto,
    );
  }
}
