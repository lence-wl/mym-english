import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 模块初始化时执行
  async onModuleInit() {
    await this.createDefaultAdmin();
  }

  // 创建默认管理员用户
  private async createDefaultAdmin() {
    const adminUsername = 'lence';
    const adminExists = await this.userRepository.findOne({
      where: { username: adminUsername },
    });

    if (!adminExists) {
      // 可以从环境变量获取初始密码，这里使用默认密码示例
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
      const hashedPassword = await bcrypt.hash(defaultPassword!, 10);

      const adminUser = this.userRepository.create({
        username: adminUsername,
        password: hashedPassword,
        email: process.env.ADMIN_DEFAULT_EMAIL, // 可以改为从环境变量获取
        role: UserRole.ADMIN,
        status: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.userRepository.save(adminUser);
      console.log(`默认管理员用户 ${adminUsername} 已创建`);
    }
  }
}
