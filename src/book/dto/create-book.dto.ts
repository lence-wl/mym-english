import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty({ message: '书名不能为空' })
  @MaxLength(200, { message: '书名长度不能超过200个字符' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '作者不能为空' })
  @MaxLength(100, { message: '作者名称长度不能超过100个字符' })
  author: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '简介长度不能超过500个字符' })
  description?: string;
}
