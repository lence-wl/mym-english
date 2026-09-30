import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { QueryBookDto } from './dto/query-book.dto';
import { createReadStream, existsSync } from 'fs';
import { UploadService } from 'src/upload/upload.service';
import { In } from 'typeorm';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly uploadService: UploadService, // 注入上传服务
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
      // 创建书籍记录
      const book = this.bookRepository.create({
        ...createBookDto,
        userId,
        ...fileInfo,
        filename: decodeURIComponent(escape(file.originalname)), // 中文乱码
      });

      return this.bookRepository.save(book);
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
    const where: any = {};
    if (title) where.title = Like(`%${title}%`);
    if (author) where.author = Like(`%${author}%`);
    if (status !== undefined) where.status = status;
    if (userId) where.userId = userId;

    // 执行分页查询
    const [items, total] = await this.bookRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'title',
        'author',
        'description',
        'downloadCount',
        'status',
        'createdAt',
      ],
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
   * 获取单本电子书详情
   */
  async findOne(id: number) {
    const book = await this.bookRepository.findOne({ where: { id } });
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
    const books = await this.bookRepository.find({
      where: { id: In(ids) },
      select: [
        'id',
        'title',
        'author',
        'description',
        'downloadCount',
        'status',
        'createdAt',
      ],
    });

    // 检查是否有不存在的ID
    const foundIds = books.map((book) => book.id);
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

    // 执行更新
    await this.bookRepository.update(id, {
      ...updateBookDto,
      updatedAt: new Date(),
    });

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
    await this.bookRepository.softDelete(id);
    // return { message: `电子书ID ${id} 已删除` };
    return id as any;
  }

  /**
   * 下载电子书
   */
  async downloadBook(id: number) {
    const { data: book } = await this.findOne(id);

    // 检查文件是否存在
    if (!existsSync(book.filePath)) {
      throw new NotFoundException('电子书文件不存在');
    }
    // 增加下载次数
    await this.bookRepository.increment({ id }, 'downloadCount', 1);
    // 返回文件流
    return {
      stream: createReadStream(book.filePath),
      filename: book.filename,
      originalName: `${book.title}${book.fileType}`,
    };
  }
}
