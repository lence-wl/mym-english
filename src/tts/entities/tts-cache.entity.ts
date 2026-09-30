// src/tts/entities/tts-cache.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TtsCacheDocument = HydratedDocument<TtsCache>;

/**
 * 语音合成结果缓存
 * 相同文本+音色+语速只调用一次合成接口，降低 API 费用
 */
@Schema({ collection: 'tts_cache', versionKey: false, timestamps: true })
export class TtsCache {
  @Prop({ type: Number })
  _id: number;

  /** 缓存键：归一化文本 + 音色 + 语速 + 音频格式（见 TtsService.buildCacheKey） */
  @Prop({ type: String, required: true, unique: true, maxlength: 600 })
  cacheKey: string;

  /** 合成音频（base64 字符串） */
  @Prop({ type: String, required: true })
  audio: string;

  /** 音频时长（毫秒） */
  @Prop({ type: String, maxlength: 20 })
  duration: string;

  /** 字级时间戳 JSON 字符串（{words:[...]}） */
  @Prop({ type: String })
  frontend: string;

  /** 命中次数（用于评估节省效果） */
  @Prop({ type: Number, default: 0 })
  hitCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const TtsCacheSchema = SchemaFactory.createForClass(TtsCache);