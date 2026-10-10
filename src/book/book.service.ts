import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { QueryBookDto } from './dto/query-book.dto';
import { createReadStream, existsSync } from 'fs';
import { UploadService } from 'src/upload/upload.service';
import { SequenceService } from '../common/sequence.service';

/** 列表/详情返回的字段（不含文件路径等内部信息） */
const LIST_PROJECTION = {
  title: 1,
  author: 1,
  downloadCount: 1,
  status: 1,
  createdAt: 1,
};

/** 转义正则元字符，供模糊查询使用 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class BookService {
  constructor(
    @InjectModel(Book.name)
    private readonly bookModel: Model<BookDocument>,
    private readonly uploadService: UploadService, // 注入上传服务
    private readonly sequenceService: SequenceService,
  ) {}

  /**
   * 上传电子书
   */
  async uploadBook(
    createBookDto: CreateBookDto,
    file: Express.Multer.File,
    userId: number,
  ) {
    if (!file) {
      throw new BadRequestException('请上传电子书文件');
    }
    // 验证文件类型（仅允许epub格式）
    const allowedMimeTypes = ['application/epub+zip'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('仅支持epub格式的电子书');
    }
    try {
      // 使用上传服务保存文件
      const fileInfo = await this.uploadService.saveFile(file);
      // 创建书籍记录（id 沿用自增整数，与原 SQLite 主键语义一致）
      const book = new this.bookModel({
        _id: await this.sequenceService.nextId('books'),
        ...createBookDto,
        userId,
        ...fileInfo,
        filename: decodeURIComponent(escape(file.originalname)), // 中文乱码
      });

      return await book.save();
    } catch (error) {
      throw new BadRequestException(`文件上传失败: ${error.message}`);
    }
  }

  /**
   * 获取电子书列表
   */
  async findAll(query: QueryBookDto) {
    const { page, limit, title, author, status, userId } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const filter: Record<string, any> = { deletedAt: null };
    if (title) filter.title = { $regex: escapeRegExp(title), $options: 'i' };
    if (author) filter.author = { $regex: escapeRegExp(author), $options: 'i' };
    if (status !== undefined) filter.status = status;
    if (userId) filter.userId = userId;

    // 执行分页查询
    const [items, total] = await Promise.all([
      this.bookModel
        .find(filter, LIST_PROJECTION)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.bookModel.countDocuments(filter),
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
   * 获取单本电子书详情
   */
  async findOne(id: number) {
    const book = await this.bookModel.findOne({ _id: id, deletedAt: null });
    if (!book) {
      throw new NotFoundException(`电子书ID ${id} 不存在`);
    }
    return {
      data: book,
    };
  }

  /**
   * 通过多个ID获取书籍列表
   */
  async findByIds(ids: number[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('请提供有效的书籍ID列表');
    }
    const books = await this.bookModel.find(
      { _id: { $in: ids }, deletedAt: null },
      LIST_PROJECTION,
    );

    // 检查是否有不存在的ID
    const foundIds = books.map((book) => book._id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException(
        `以下书籍ID不存在: ${notFoundIds.join(', ')}`,
      );
    }

    return {
      data: books,
    };
  }

  /**
   * 更新电子书信息
   */
  async update(id: number, updateBookDto: UpdateBookDto) {
    // 检查电子书是否存在
    await this.findOne(id);

    // 执行更新（updatedAt 由 schema 的 timestamps 自动维护）
    await this.bookModel.updateOne({ _id: id }, { $set: { ...updateBookDto } });

    // 返回更新后的信息
    return this.findOne(id);
  }

  /**
   * 删除电子书（软删除）
   */
  async remove(id: number) {
    // const book = await this.findOne(id);
    // 删除文件
    // 软删除记录
    await this.bookModel.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date() } },
    );
    // return { message: `电子书ID ${id} 已删除` };
    return id as any;
  }

  /**
   * 下载电子书
   */
  async downloadBook(id: number) {
    const { data: book } = await this.findOne(id);

    // 数据库中 filePath 只存文件名，需拼上传目录才是真实路径
    const filePath = this.uploadService.resolveFilePath(book.filePath);

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      throw new NotFoundException('电子书文件不存在');
    }
    // 增加下载次数
    await this.bookModel.updateOne(
      { _id: id },
      { $inc: { downloadCount: 1 } },
    );
    // 返回文件流
    return {
      stream: createReadStream(filePath),
      originalName: book.filename,
    };
  }
}