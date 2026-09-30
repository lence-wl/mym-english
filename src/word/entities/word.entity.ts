// src/word/entities/word.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WordDocument = HydratedDocument<Word>;

/**
 * 单词/句子
 * 注：_id 沿用原 SQLite 的自增整数，保证前端接口语义（id 为数字）不变
 */
@Schema({
  collection: 'words',
  versionKey: false,
  timestamps: true,
  toJSON: {
    transform: (_doc: unknown, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
  toObject: {
    transform: (_doc: unknown, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class Word {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true, maxlength: 600 })
  word: string; // 单词

  @Prop({ type: String, maxlength: 100 })
  phonetic?: string; // 音标

  @Prop({ type: String })
  definition?: string; // 释义

  @Prop({ type: String })
  phrases?: string; // 常用短语搭配（JSON字符串）

  @Prop({ type: Number, required: true })
  userId: number; // 用户ID

  @Prop({ type: Number })
  bookId?: number; // 关联书籍ID

  @Prop({ type: Boolean, default: false })
  isSentence?: boolean; // 是否是句子

  createdAt: Date;
  updatedAt: Date;

  /** 删除时间（软删除，默认查询不返回） */
  @Prop({ type: Date, default: null, select: false })
  deletedAt?: Date | null;
}

export const WordSchema = SchemaFactory.createForClass(Word);