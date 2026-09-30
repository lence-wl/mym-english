import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm'; // 从 typeorm 导入 Like
import { User } from '../auth/entities/user.entity';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateReadingStatusDto } from './dto/update-reading-status.dto';
import * as bcrypt from 'bcryptjs';
import { Book } from '../book/entities/book.entity';
import { Word } from '../word/entities/word.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
  ) {}

  // 添加统计方法
  async getUserStats(userId: number) {
    // 统计单词数量
    const wordCount = await this.wordRepository.count({
      where: { userId, isSentence: false },
    });

    // 统计句子数量
    const sentenceCount = await this.wordRepository.count({
      where: { userId, isSentence: true },
    });

    // 获取当前在读书籍
    const user = await this.userRepository.findOne({ where: { id: userId } });
    let readingBook: any = null;
    if (user?.currentBookId) {
      readingBook = await this.bookRepository.findOne({
        where: { id: user.currentBookId },
      });
    }

    // 获取已读完书籍
    const completedBooks = user?.completeBookIds
      ? await this.bookRepository.findByIds(
          user.completeBookIds.split(',').map(Number),
        )
      : [];

    return {
      wordCount,
      sentenceCount,
      readingBook,
      completedBooks,
    };
  }

  /**
   * 获取用户列表（支持分页和筛选）
   */
  async findAll(query: QueryUserDto) {
    const { page, limit, username, email, status } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    if (username) where.username = Like(`%${username}%`);
    if (email) where.email = Like(`%${email}%`);
    if (status !== undefined) where.status = status;

    // 执行分页查询
    const [items, total] = await this.userRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 根据ID查询用户
   */
  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`用户ID ${id} 不存在`);
    }
    return user;
  }

  /**
   * 更新用户信息
   */
  async update(id: number, updateUserDto: UpdateUserDto) {
    // 检查用户是否存在
    await this.findOne(id);

    // 检查用户名是否已被占用（排除当前用户）
    if (updateUserDto.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('用户名已被占用');
      }
    }

    // 检查邮箱是否已被占用（排除当前用户）
    if (updateUserDto.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('邮箱已被占用');
      }
    }

    // 密码加密处理
    if (updateUserDto.password) {
      const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
    }

    // 执行更新
    await this.userRepository.update(id, {
      ...updateUserDto,
      updatedAt: new Date(),
    });

    // 返回更新后的用户信息
    return this.findOne(id);
  }

  /**
   * 删除用户（软删除）
   */
  async remove(id: number) {
    await this.findOne(id);
    await this.userRepository.softDelete(id);
    return { message: `用户ID ${id} 已删除` };
  }

  /**
   * 恢复被软删除的用户
   */
  async restore(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`用户ID ${id} 不存在`);
    }

    await this.userRepository.restore(id);
    return { message: `用户ID ${id} 已恢复` };
  }

  /**
   * 更新用户当前阅读状态
   */
  async updateReadingStatus(id: number, statusDto: UpdateReadingStatusDto) {
    // 检查用户是否存在
    await this.findOne(id);
    // 执行更新
    await this.userRepository.update(id, {
      ...statusDto,
      updatedAt: new Date(),
    });

    // 返回更新后的用户信息
    return this.findOne(id);
  }
}
