import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { QueryBookDto } from './dto/query-book.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('books')
@UseGuards(JwtAuthGuard)
export class BookController {
  constructor(private readonly bookService: BookService) {}

  /**
   * 上传电子书
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body() createBookDto: CreateBookDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const result = await this.bookService.uploadBook(
      createBookDto,
      file,
      req.user.id,
    );
    return {
      message: '电子书上传成功',
      data: result,
    };
  }

  /**
   * 获取电子书列表
   */
  @Get()
  findAll(@Query() query: QueryBookDto, @Request() req) {
    return this.bookService.findAll(query, req.user);
  }

  /**
   * 获取单本电子书详情
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.bookService.findOne(+id, req.user);
  }

  /**
   * 更新电子书信息（仅上传者本人或管理员）
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
    @Request() req,
  ) {
    return this.bookService.update(+id, updateBookDto, req.user);
  }

  /**
   * 设置书籍公开/私有（仅管理员）
   */
  @Patch(':id/visibility')
  setVisibility(
    @Param('id') id: string,
    @Body() dto: UpdateVisibilityDto,
    @Request() req,
  ) {
    return this.bookService.setVisibility(+id, dto.isPublic, req.user);
  }

  /**
   * 删除电子书（仅上传者本人或管理员）
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.bookService.remove(+id, req.user);
  }

  /**
   * 下载电子书
   */
  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response, @Request() req) {
    const { stream, originalName } = await this.bookService.downloadBook(
      +id,
      req.user,
    );

    // 设置响应头
    res.set({
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
    });

    // 管道传输文件流
    stream.pipe(res);
  }
  /**
   * 通过多个ID获取书籍
   */
  @Post('batch')
  async findByIds(@Body('ids') ids: number[], @Request() req) {
    return this.bookService.findByIds(ids, req.user);
  }
}
