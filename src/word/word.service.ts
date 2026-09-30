import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from './entities/word.entity';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { QueryWordDto } from './dto/query-word.dto';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class WordService {
  constructor(
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
  ) {}

  /**
   * 创建单词（添加重复检查）
   */
  async create(createWordDto: CreateWordDto, userId: number) {
    // 检查是否已存在相同单词（同一用户）
    const existingWord = await this.wordRepository.findOne({
      where: {
        word: createWordDto.word,
        userId,
        bookId: createWordDto.bookId, // 考虑书籍维度的唯一性
      },
    });
    if (existingWord) {
      throw new ConflictException(`单词 '${createWordDto.word}' 已存在`);
    }

    const word = this.wordRepository.create({
      ...createWordDto,
      userId,
    });
    return this.wordRepository.save(word);
  }

  /**
   * 查询单词列表（支持用户ID、书籍ID筛选和时间排序）
   */
  async findAll(query: QueryWordDto) {
    const { page, limit, userId, bookId, sortBy, order, isSentence } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    if (userId) where.userId = userId;
    if (bookId) where.bookId = bookId;

    if (isSentence) where.isSentence = isSentence;
    // 执行分页查询
    const [items, total] = await this.wordRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [sortBy]: order },
    });

    return {
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * 查询单个单词
   */
  async findOne(id: number) {
    const word = await this.wordRepository.findOne({ where: { id } });
    if (!word) {
      throw new NotFoundException(`单词ID ${id} 不存在`);
    }
    return { data: word };
  }

  /**
   * 更新单词
   */
  async update(id: number, updateWordDto: UpdateWordDto) {
    await this.findOne(id);
    await this.wordRepository.update(id, {
      ...updateWordDto,
      updatedAt: new Date(),
    });
    return this.findOne(id);
  }

  /**
   * 删除单词（真实删除）
   */
  async remove(id: number) {
    await this.findOne(id);
    await this.wordRepository.delete(id); // 替换 softDelete 为 delete
    return { message: `单词已删除` };
  }

  async findByWordContent(word: string, userId?: number) {
    const where: any = { word };
    // 如果提供了用户ID，只查找该用户的单词
    if (userId) {
      where.userId = userId;
    }

    const words = await this.wordRepository.find({ where });

    return { data: words.length ? words : null };
  }
  /**
   * 通过单词内容删除单词
   * @param word 单词内容
   * @param userId 用户ID（用于权限控制，确保只能删除自己的单词）
   */
  async removeByWord(word: string, userId: number) {
    const where = { word, userId };
    const result = await this.wordRepository.delete(where);

    if (result.affected === 0) {
      throw new NotFoundException(`未找到用户 ${userId} 的单词: ${word}`);
    }

    return { message: `单词 '${word}' 已删除` };
  }
}
