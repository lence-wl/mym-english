// src/llm/dto/grammar-request.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class GrammarRequestDto {
  /** 待做成分分析的选段（通常含多个单词，单个单词不会走到这里） */
  @IsString()
  @IsNotEmpty()
  text: string;
}