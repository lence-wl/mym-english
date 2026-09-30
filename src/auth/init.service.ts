import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './entities/user.entity';
import { SequenceService } from '../common/sequence.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly sequenceService: SequenceService,
  ) {}

  // 模块初始化时执行
  async onModuleInit() {
    await this.createDefaultAdmin();
  }

  // 创建默认管理员用户
  private async createDefaultAdmin() {
    const adminUsername = 'lence';
    const adminExists = await this.userModel.findOne({
      username: adminUsername,
    });

    if (!adminExists) {
      // 可以从环境变量获取初始密码，这里使用默认密码示例
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
      const hashedPassword = await bcrypt.hash(defaultPassword!, 10);

      await this.userModel.create({
        _id: await this.sequenceService.nextId('users'),
        username: adminUsername,
        password: hashedPassword,
        email: process.env.ADMIN_DEFAULT_EMAIL, // 可以改为从环境变量获取
        role: UserRole.ADMIN,
        status: 1,
      });

      console.log(`默认管理员用户 ${adminUsername} 已创建`);
    }
  }
}