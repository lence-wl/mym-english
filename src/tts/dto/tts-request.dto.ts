// src/tts/dto/tts-request.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class TtsRequestDto {
  /** 合成文本 */
  @IsString()
  @IsNotEmpty()
  text: string;

  /** 音色类型 */
  @IsString()
  @IsNotEmpty()
  voiceType: string;

  /** 输出文件名称（默认：output.mp3） */
  @IsString()
  @IsOptional()
  fileName?: string = 'output.mp3';

  /** 语速 (0.5-2.0) */
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  @IsOptional()
  speedRatio?: number = 1.0;

  /** 音量 (0.5-2.0) */
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  @IsOptional()
  volumeRatio?: number = 1.0;

  /** 音调 (0.5-2.0) */
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  @IsOptional()
  pitchRatio?: number = 1.0;

  /** 情感/风格（v3 音色暂不支持，保留字段以兼容前端契约） */
  @IsString()
  @IsOptional()
  emotion?: string;

  /** 是否启用字级时间戳（1 启用） */
  @IsNumber()
  @IsOptional()
  with_timestamp?: number;
}

export class TtsResponseDto {
  success: boolean;
  message?: string;
  filePath?: string;
  duration?: number;
}
