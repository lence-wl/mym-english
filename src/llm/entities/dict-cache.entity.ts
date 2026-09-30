// src/llm/entities/dict-cache.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DictCacheDocument = HydratedDocument<DictCache>;

/**
 * 单词/句子释义结果缓存
 * 同一个查询文本只调用一次大模型，降低 API 费用
 */
@Schema({ collection: 'dict_cache', versionKey: false, timestamps: true })
export class DictCache {
  @Prop({ type: Number })
  _id: number;

  /** 归一化后的查询文本（去首尾空格、转小写、合并连续空格、去首尾符号） */
  @Prop({ type: String, required: true, unique: true, maxlength: 600 })
  cacheKey: string;

  /** 大模型返回的 JSON 字符串 */
  @Prop({ type: String, required: true })
  result: string;

  /** 命中次数（用于评估节省效果） */
  @Prop({ type: Number, default: 0 })
  hitCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const DictCacheSchema = SchemaFactory.createForClass(DictCache);