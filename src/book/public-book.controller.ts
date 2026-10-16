import { Controller, Get, Param, Query } from '@nestjs/common';
import { BookService } from './book.service';
import { QueryBookDto } from './dto/query-book.dto';

/**
 * 公开书只读接口：刻意不挂 JwtAuthGuard，供未登录（游客）浏览与阅读公开书。
 * 只暴露 isPublic=true 且正常上架的书籍；查词/翻译/TTS/收藏/进度等能力接口
 * 仍受 JwtAuthGuard 保护，因此游客绕过前端也调不到这些能力。
 */
@Controller('books/public')
export class PublicBookController {
  constructor(private readonly bookService: BookService) {}

  /**
   * 公开书列表
   */
  @Get()
  findAll(@Query() query: QueryBookDto) {
    return this.bookService.findPublic(query);
  }

  /**
   * 公开书详情（含 filePath，供阅读器取 /uploads 下的 epub 文件）
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookService.findPublicOne(+id);
  }
}
