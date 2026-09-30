import { IsString, MaxLength, IsOptional, IsNumber } from 'class-validator';

export class UpdateBookDto {
  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @MaxLength(200, { message: '标题长度不能超过200个字符' })
  title?: string;

  @IsOptional()
  @IsString({ message: '作者必须是字符串' })
  @MaxLength(100, { message: '作者长度不能超过100个字符' })
  author?: string;

  @IsOptional()
  @IsString({ message: '描述必须是字符串' })
  @MaxLength(500, { message: '描述长度不能超过500个字符' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: '状态必须是数字' })
  status?: 0 | 1;
}
