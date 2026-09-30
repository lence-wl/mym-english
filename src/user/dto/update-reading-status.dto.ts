// src/user/dto/update-reading-status.dto.ts
import { IsOptional, IsNumber, IsString, MaxLength } from 'class-validator';

export class UpdateReadingStatusDto {
  @IsOptional()
  @IsNumber({}, { message: '当前阅读书籍ID必须是数字' })
  currentBookId: number;

  @IsOptional()
  @IsString({ message: '阅读位置必须是字符串' })
  @MaxLength(100, { message: '阅读位置长度不能超过40个字符' })
  currentBookLoc?: string;
}
