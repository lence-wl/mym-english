import { IsOptional, IsNumber, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryWordDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @Type(() => String)
  isSentence?: string;

  @IsOptional()
  @Type(() => Number)
  bookId?: number;

  @IsOptional()
  @IsString()
  sortBy = 'createdAt'; // 排序字段

  @IsOptional()
  @IsString()
  order: 'ASC' | 'DESC' = 'DESC'; // 排序方向
}
