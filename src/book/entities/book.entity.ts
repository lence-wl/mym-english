// src/book/entities/book.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BookDocument = HydratedDocument<Book>;

/**
 * 书籍
 * 注：_id 沿用原 SQLite 的自增整数，保证前端接口语义（id 为数字）不变
 */
@Schema({
  collection: 'books',
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
export class Book {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true, maxlength: 200 })
  title: string; // 书名

  @Prop({ type: String, required: true, maxlength: 100 })
  author: string; // 作者

  @Prop({ type: String })
  description?: string; // 简介

  @Prop({ type: String, required: true })
  filePath: string; // 文件保存路径

  @Prop({ type: String, required: true })
  filename: string; // 原始文件名

  @Prop({ type: String, required: true })
  fileType: string; // 文件类型（如 application/epub+zip）

  @Prop({ type: Number, required: true })
  fileSize: number; // 文件大小（字节）

  @Prop({ type: Number, default: 0 })
  downloadCount: number; // 下载次数

  @Prop({ type: Number, default: 1 })
  status: number; // 状态：1-正常，0-禁用

  @Prop({ type: Number, required: true })
  userId: number; // 上传者ID

  createdAt: Date;
  updatedAt: Date;

  /** 删除时间（软删除，默认查询不返回） */
  @Prop({ type: Date, default: null, select: false })
  deletedAt?: Date | null;
}

export const BookSchema = SchemaFactory.createForClass(Book);