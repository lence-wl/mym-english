import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WordService } from './word.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { QueryWordDto } from './dto/query-word.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('words')
@UseGuards(JwtAuthGuard)
export class WordController {
  constructor(private readonly wordService: WordService) {}

  /**
   * 创建单词
   */
  @Post()
  create(@Body() createWordDto: CreateWordDto, @Request() req) {
    return this.wordService.create(createWordDto, req.user.id);
  }

  /**
   * 查询单词列表
   */
  @Get()
  findAll(@Query() query: QueryWordDto) {
    return this.wordService.findAll(query);
  }
  /**
   * 通过单词内容查找单词
   */
  @Get('search')
  findByWord(@Query('word') word: string, @Request() req) {
    // 传入当前用户ID，确保只能查询自己的单词
    return this.wordService.findByWordContent(word, req.user.id);
  }

  /**
   * 通过单词内容删除单词
   */
  @Delete('by-word')
  removeByWord(@Query('word') word: string, @Request() req) {
    // 传入当前用户ID，确保只能删除自己的单词
    return this.wordService.removeByWord(word, req.user.id);
  }

  /**
   * 查询单个单词
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.wordService.findOne(+id);
  }

  /**
   * 更新单词
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWordDto: UpdateWordDto) {
    return this.wordService.update(+id, updateWordDto);
  }

  /**
   * 删除单词
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wordService.remove(+id);
  }
}
