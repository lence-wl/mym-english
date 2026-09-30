// src/word/dto/create-word.dto.ts
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateWordDto {
  @IsString()
  @IsNotEmpty({ message: '单词不能为空' })
  @MaxLength(1000, { message: '长度不能超过1000个字符' })
  word: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '音标长度不能超过200个字符' })
  phonetic: string;

  @IsOptional()
  @IsString()
  definition?: string;

  @IsOptional()
  @IsString()
  phrases?: string;

  @IsOptional()
  @IsBoolean()
  isSentence: boolean;

  @IsOptional()
  @IsNumber({}, { message: '书籍ID必须是数字' })
  bookId?: number;
}
