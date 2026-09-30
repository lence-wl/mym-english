import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Word, WordDocument } from './entities/word.entity';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { QueryWordDto } from './dto/query-word.dto';
import { ConflictException } from '@nestjs/common';
import { SequenceService } from '../common/sequence.service';

@Injectable()
export class WordService {
  constructor(
    @InjectModel(Word.name)
    private readonly wordModel: Model<WordDocument>,
    private readonly sequenceService: SequenceService,
  ) {}

  /**
   * 创建单词（添加重复检查）
   */
  async create(createWordDto: CreateWordDto, userId: number) {
    // 检查是否已存在相同单词（同一用户）
    const filter: Record<string, any> = {
      word: createWordDto.word,
      userId,
      deletedAt: null,
    };
    // 考虑书籍维度的唯一性
    if (createWordDto.bookId !== undefined) {
      filter.bookId = createWordDto.bookId;
    }

    const existingWord = await this.wordModel.findOne(filter);
    if (existingWord) {
      throw new ConflictException(`单词 '${createWordDto.word}' 已存在`);
    }

    const word = new this.wordModel({
      _id: await this.sequenceService.nextId('words'),
      ...createWordDto,
      userId,
    });
    return await word.save();
  }

  /**
   * 查询单词列表（支持用户ID、书籍ID筛选和时间排序）
   */
  async findAll(query: QueryWordDto) {
    const { page, limit, userId, bookId, sortBy, order, isSentence } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const filter: Record<string, any> = { deletedAt: null };
    if (userId) filter.userId = userId;
    if (bookId) filter.bookId = bookId;
    if (isSentence) filter.isSentence = isSentence;

    // 执行分页查询
    const [items, total] = await Promise.all([
      this.wordModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: order === 'ASC' ? 1 : -1 }),
      this.wordModel.countDocuments(filter),
    ]);

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
    const word = await this.wordModel.findOne({ _id: id, deletedAt: null });
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
    // updatedAt 由 schema 的 timestamps 自动维护
    await this.wordModel.updateOne({ _id: id }, { $set: { ...updateWordDto } });
    return this.findOne(id);
  }

  /**
   * 删除单词（真实删除）
   */
  async remove(id: number) {
    await this.findOne(id);
    await this.wordModel.deleteOne({ _id: id }); // 真实删除，不做软删除
    return { message: `单词已删除` };
  }

  async findByWordContent(word: string, userId?: number) {
    const filter: Record<string, any> = { word, deletedAt: null };
    // 如果提供了用户ID，只查找该用户的单词
    if (userId) {
      filter.userId = userId;
    }

    const words = await this.wordModel.find(filter);

    return { data: words.length ? words : null };
  }
  /**
   * 通过单词内容删除单词
   * @param word 单词内容
   * @param userId 用户ID（用于权限控制，确保只能删除自己的单词）
   */
  async removeByWord(word: string, userId: number) {
    const result = await this.wordModel.deleteMany({ word, userId });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`未找到用户 ${userId} 的单词: ${word}`);
    }

    return { message: `单词 '${word}' 已删除` };
  }
}