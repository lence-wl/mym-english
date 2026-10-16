import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import {
  User,
  UserDocument,
  UserRole,
} from '../auth/entities/user.entity';

/** 列表/详情返回的字段（不含文件路径等内部信息；userId 用于前端判断能否删除） */
const LIST_PROJECTION = {
  title: 1,
  author: 1,
  downloadCount: 1,
  status: 1,
  isPublic: 1,
  createdAt: 1,
  userId: 1,
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
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>, // 用于在读数统计与删除权限校验
  ) {}

  /**
   * 批量统计各本书的「在读人数」
   * 口径：把该书登记在 myBookData 里的用户数
   * 支持一个用户多本同时在读，因此按 myBookData 明细统计而非单个 currentBookId
   */
  private async countReaders(ids: number[]): Promise<Map<number, number>> {
    if (!ids.length) return new Map();
    const stringIds = ids.map(String);
    const rows = await this.userModel.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: { deletedAt: null, 'myBookData.id': { $in: stringIds } } },
      { $unwind: '$myBookData' },
      { $match: { 'myBookData.id': { $in: stringIds } } },
      { $group: { _id: '$myBookData.id', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((row) => [Number(row._id), row.count]));
  }

  /** 判断用户是否为管理员（JWT 中不含 role，需查库） */
  private async isAdmin(userId: number): Promise<boolean> {
    const user = await this.userModel.findOne({ _id: userId, deletedAt: null });
    return user?.role === UserRole.ADMIN;
  }

  /**
   * 构造「可见性」查询条件
   * - 管理员：不加限制，可看到所有书籍
   * - 普通用户：公开书籍 + 自己上传的书籍（上传默认私有）
   */
  private async visibilityFilter(userId: number): Promise<Record<string, any>> {
    if (await this.isAdmin(userId)) return {};
    return { $or: [{ isPublic: true }, { userId }] };
  }

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
  async findAll(query: QueryBookDto, user: { id: number }) {
    const { page, limit, title, author, status, userId, isPublic } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const filter: Record<string, any> = { deletedAt: null };
    if (title) filter.title = { $regex: escapeRegExp(title), $options: 'i' };
    if (author) filter.author = { $regex: escapeRegExp(author), $options: 'i' };
    if (status !== undefined) filter.status = status;
    if (userId) filter.userId = userId;
    if (isPublic !== undefined) filter.isPublic = isPublic;
    // 可见性：管理员可见全部；普通用户仅见公开书籍与自己上传的书籍
    Object.assign(filter, await this.visibilityFilter(user.id));

    // 执行分页查询
    const [items, total] = await Promise.all([
      this.bookModel
        .find(filter, LIST_PROJECTION)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.bookModel.countDocuments(filter),
    ]);

    // 批量补齐在读人数，避免逐本查询
    const readerCounts = await this.countReaders(items.map((book) => book._id));
    const data = items.map((book) => ({
      ...book.toObject(),
      readerCount: readerCounts.get(book._id) ?? 0,
    }));

    return {
      data: {
        items: data,
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
  async findOne(id: number, user: { id: number }) {
    const book = await this.bookModel.findOne({
      _id: id,
      deletedAt: null,
      ...(await this.visibilityFilter(user.id)),
    });
    // 不存在或对当前用户不可见，统一返回 404，避免泄露书籍是否存在
    if (!book) {
      throw new NotFoundException(`电子书ID ${id} 不存在`);
    }
    return {
      data: book,
    };
  }

  /**
   * 游客可见条件：公开 + 正常上架（status=1）+ 未删除
   */
  private publicFilter(query: QueryBookDto): Record<string, any> {
    const { title, author } = query;
    const filter: Record<string, any> = {
      deletedAt: null,
      isPublic: true,
      status: 1,
    };
    if (title) filter.title = { $regex: escapeRegExp(title), $options: 'i' };
    if (author) filter.author = { $regex: escapeRegExp(author), $options: 'i' };
    return filter;
  }

  /**
   * 公开书列表（游客可访问）
   * 与 findAll 的差异：不带任何用户上下文、不含私有/下架书籍
   */
  async findPublic(query: QueryBookDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const filter = this.publicFilter(query);

    const [items, total] = await Promise.all([
      this.bookModel
        .find(filter, LIST_PROJECTION)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.bookModel.countDocuments(filter),
    ]);

    const readerCounts = await this.countReaders(items.map((book) => book._id));
    const data = items.map((book) => ({
      ...book.toObject(),
      readerCount: readerCounts.get(book._id) ?? 0,
    }));

    return {
      data: {
        items: data,
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
   * 公开书详情（游客可访问）
   * 返回含 filePath 的完整信息，供阅读器取 /uploads 下的 epub 文件
   */
  async findPublicOne(id: number) {
    const book = await this.bookModel.findOne({
      _id: id,
      deletedAt: null,
      isPublic: true,
      status: 1,
    });
    if (!book) {
      throw new NotFoundException(`电子书ID ${id} 不存在`);
    }
    return { data: book };
  }

  /**
   * 通过多个ID获取书籍列表
   */
  async findByIds(ids: number[], user: { id: number }) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('请提供有效的书籍ID列表');
    }
    // 仅返回对当前用户可见的书籍。
    // 注：刻意不再「缺失即报错」——该接口被首页用于批量取在读书目，
    // 一旦其中某本书被下架或转为私有，整体报错会打断首页加载，故只返回可见子集。
    const books = await this.bookModel.find(
      {
        _id: { $in: ids },
        deletedAt: null,
        ...(await this.visibilityFilter(user.id)),
      },
      LIST_PROJECTION,
    );

    return {
      data: books,
    };
  }

  /**
   * 更新电子书信息
   */
  async update(id: number, updateBookDto: UpdateBookDto, user: { id: number }) {
    // 检查电子书是否存在且对当前用户可见
    const { data: book } = await this.findOne(id, user);

    // 校验操作权限：上传者本人 or 管理员
    if (book.userId !== user.id && !(await this.isAdmin(user.id))) {
      throw new ForbiddenException('仅上传者本人或管理员可以修改该书籍');
    }

    // 执行更新（updatedAt 由 schema 的 timestamps 自动维护）
    await this.bookModel.updateOne({ _id: id }, { $set: { ...updateBookDto } });

    // 返回更新后的信息
    return this.findOne(id, user);
  }

  /**
   * 删除电子书（软删除）
   * 仅上传者本人或管理员可删除
   */
  async remove(id: number, user: { id: number }) {
    const book = await this.bookModel.findOne({ _id: id, deletedAt: null });
    if (!book) {
      throw new NotFoundException(`电子书ID ${id} 不存在`);
    }

    // 校验操作权限：上传者本人 or 管理员
    if (book.userId !== user.id && !(await this.isAdmin(user.id))) {
      throw new ForbiddenException('仅上传者本人或管理员可以删除该书籍');
    }

    // 软删除记录
    await this.bookModel.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date() } },
    );
    return id as any;
  }

  /**
   * 设置书籍公开状态（仅管理员）
   * 公开后所有登录用户可见；私有则仅上传者与管理员可见
   */
  async setVisibility(id: number, isPublic: boolean, user: { id: number }) {
    if (!(await this.isAdmin(user.id))) {
      throw new ForbiddenException('仅管理员可以设置书籍的公开状态');
    }

    const book = await this.bookModel.findOne({ _id: id, deletedAt: null });
    if (!book) {
      throw new NotFoundException(`电子书ID ${id} 不存在`);
    }

    await this.bookModel.updateOne({ _id: id }, { $set: { isPublic } });
    return { data: { id, isPublic } };
  }

  /**
   * 下载电子书
   */
  async downloadBook(id: number, user: { id: number }) {
    const { data: book } = await this.findOne(id, user);

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