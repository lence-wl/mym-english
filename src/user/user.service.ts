import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../auth/entities/user.entity';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateReadingStatusDto } from './dto/update-reading-status.dto';
import * as bcrypt from 'bcryptjs';
import { Book, BookDocument } from '../book/entities/book.entity';
import { Word, WordDocument } from '../word/entities/word.entity';

/** 转义正则元字符，供模糊查询使用 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Book.name)
    private readonly bookModel: Model<BookDocument>,
    @InjectModel(Word.name)
    private readonly wordModel: Model<WordDocument>,
  ) {}

  // 添加统计方法
  async getUserStats(userId: number) {
    // 统计单词数量
    const wordCount = await this.wordModel.countDocuments({
      userId,
      isSentence: false,
      deletedAt: null,
    });

    // 统计句子数量
    const sentenceCount = await this.wordModel.countDocuments({
      userId,
      isSentence: true,
      deletedAt: null,
    });

    // 获取当前在读书籍
    const user = await this.userModel.findOne({
      _id: userId,
      deletedAt: null,
    });
    let readingBook: any = null;
    if (user?.currentBookId) {
      readingBook = await this.bookModel.findOne({
        _id: user.currentBookId,
        deletedAt: null,
      });
    }

    // 获取已读完书籍
    const completedBooks = user?.completeBookIds
      ? await this.bookModel.find({
          _id: { $in: user.completeBookIds.split(',').map(Number) },
          deletedAt: null,
        })
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
    const filter: Record<string, any> = { deletedAt: null };
    if (username)
      filter.username = { $regex: escapeRegExp(username), $options: 'i' };
    if (email) filter.email = { $regex: escapeRegExp(email), $options: 'i' };
    if (status !== undefined) filter.status = status;

    // 执行分页查询
    const [items, total] = await Promise.all([
      this.userModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.userModel.countDocuments(filter),
    ]);

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
    const user = await this.userModel.findOne({ _id: id, deletedAt: null });
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
      const existingUser = await this.userModel.findOne({
        username: updateUserDto.username,
        deletedAt: null,
      });
      if (existingUser && existingUser._id !== id) {
        throw new ConflictException('用户名已被占用');
      }
    }

    // 检查邮箱是否已被占用（排除当前用户）
    if (updateUserDto.email) {
      const existingEmail = await this.userModel.findOne({
        email: updateUserDto.email,
        deletedAt: null,
      });
      if (existingEmail && existingEmail._id !== id) {
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

    // 执行更新（updatedAt 由 schema 的 timestamps 自动维护）
    await this.userModel.updateOne({ _id: id }, { $set: { ...updateUserDto } });

    // 返回更新后的用户信息
    return this.findOne(id);
  }

  /**
   * 删除用户（软删除）
   */
  async remove(id: number) {
    await this.findOne(id);
    await this.userModel.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date() } },
    );
    return { message: `用户ID ${id} 已删除` };
  }

  /**
   * 恢复被软删除的用户
   */
  async restore(id: number) {
    const user = await this.userModel.findOne({ _id: id });

    if (!user) {
      throw new NotFoundException(`用户ID ${id} 不存在`);
    }

    await this.userModel.updateOne({ _id: id }, { $set: { deletedAt: null } });
    return { message: `用户ID ${id} 已恢复` };
  }

  /**
   * 更新用户当前阅读状态
   */
  async updateReadingStatus(id: number, statusDto: UpdateReadingStatusDto) {
    // 检查用户是否存在
    await this.findOne(id);

    const { currentBookId, currentBookLoc } = statusDto;

    // 执行更新（currentBookId / currentBookLoc 始终代表「最近在读的那本」）
    await this.userModel.updateOne({ _id: id }, { $set: { ...statusDto } });

    // 同时按书各存一份位置：myBookData 即「在读书单」，
    // 允许一个用户多本同时在读，也方便随时切换到别的书再换回来接着读
    if (currentBookId) {
      const bookId = String(currentBookId);
      if (currentBookLoc) {
        // 带了位置：更新该书位置；书还没登记过就顺带登记
        const updated = await this.userModel.updateOne(
          { _id: id, 'myBookData.id': bookId },
          { $set: { 'myBookData.$.location': currentBookLoc } },
        );
        if (updated.matchedCount === 0) {
          await this.userModel.updateOne(
            { _id: id },
            { $push: { myBookData: { id: bookId, location: currentBookLoc } } },
          );
        }
      } else {
        // 没带位置（刚打开还没翻页）：只登记「在读」，不覆盖已保存的位置
        await this.userModel.updateOne(
          { _id: id, 'myBookData.id': { $ne: bookId } },
          { $push: { myBookData: { id: bookId, location: '' } } },
        );
      }
    }

    // 返回更新后的用户信息
    return this.findOne(id);
  }
}