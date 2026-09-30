// src/auth/entities/user.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// 定义角色枚举
export enum UserRole {
  ADMIN = 'admin',
  COMMON = 'common',
  VIP = 'vip',
}

export enum UserLevel {
  l1 = 1,
  l2 = 2,
  l3 = 3,
}

// myBookData 数组项的类型（TypeScript 类型约束）
export interface BookReadingData {
  id: string; // 书籍ID（字符串类型）
  location: string; // 阅读位置（字符串类型）
}

export type UserDocument = HydratedDocument<User>;

/**
 * 用户
 * 注：_id 沿用原 SQLite 的自增整数，保证前端接口语义（id 为数字）不变
 */
@Schema({
  collection: 'users',
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
export class User {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true, unique: true, maxlength: 50 })
  username: string;

  /** 加密后的密码（默认查询不返回） */
  @Prop({ type: String, required: true, select: false })
  password: string;

  @Prop({ type: String, required: true, unique: true, maxlength: 100 })
  email: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.COMMON })
  role: UserRole;

  @Prop({ type: Number, default: UserLevel.l1 })
  level: number | null;

  @Prop({ type: String, maxlength: 20 })
  phone?: string;

  @Prop({ type: String, maxlength: 100 })
  avatar?: string;

  /** 当前正在阅读的书籍 id */
  @Prop({ type: Number })
  currentBookId?: number;

  /** 当前正在阅读的书籍的位置 */
  @Prop({ type: String, maxlength: 100 })
  currentBookLoc?: string;

  /** 用户状态：1-正常，0-禁用 */
  @Prop({ type: Number, default: 1 })
  status: number;

  /** 已经读完的书籍 id */
  @Prop({ type: String, default: '' })
  completeBookIds: string;

  readingBookId: number;

  /** 书籍阅读数据：[{id:"书籍ID", location:"阅读位置"}] */
  @Prop({ type: Array, default: [] })
  myBookData: BookReadingData[];

  createdAt: Date;
  updatedAt: Date;

  /** 删除时间（软删除，默认查询不返回） */
  @Prop({ type: Date, default: null, select: false })
  deletedAt?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);