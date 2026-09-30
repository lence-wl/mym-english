import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

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

// 新增：定义 myBookData 数组项的类型（TypeScript 类型约束）
export interface BookReadingData {
  id: string; // 书籍ID（字符串类型）
  location: string; // 阅读位置（字符串类型）
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({
    comment: '用户ID，自增主键',
  })
  id: number;

  @Index('idx_username')
  @Column({
    unique: true,
    length: 50,
    nullable: false,
    comment: '用户名，唯一标识',
  })
  username: string;

  @Column({
    nullable: false,
    select: false,
    comment: '加密后的密码',
  })
  password: string;

  @Index('idx_email')
  @Column({
    unique: true,
    length: 100,
    nullable: false,
    comment: '用户邮箱，用于登录和通知',
  })
  email: string;

  // 添加角色字段
  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.COMMON,
    comment: '用户角色：admin-管理员，common-普通用户，vip-VIP用户',
  })
  role: 'admin' | 'common' | 'vip';

  // 新增 level 字段：默认 null，类型为 number
  @Column({
    type: 'int',
    nullable: true, // 允许为 null
    default: UserLevel.l1,
  })
  level: number | null; // TypeScript 类型定义（支持 null）

  @Column({
    length: 20,
    nullable: true,
    comment: '用户手机号码',
  })
  phone?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '用户头像URL',
  })
  avatar?: string;

  @Column({
    nullable: true,
    type: 'int',
    comment: '当前正在阅读的书籍的id',
  })
  currentBookId?: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '当前正在阅读的书籍的位置',
  })
  currentBookLoc?: string;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '用户状态：1-正常，0-禁用',
  })
  status: number;

  @Column({
    type: 'varchar',
    default: '',
    comment: '已经读完的书籍的id',
  })
  completeBookIds: string;

  readingBookId: number;

  // ========== 新增 myBookData 字段 ==========
  @Column({
    type: 'json', // JSON 类型（适配 SQLite/MySQL/PostgreSQL）
    nullable: true, // 允许为空
    default: () => "'[]'", // 默认值为空数组（SQLite 需用单引号包裹 JSON 字符串）
    comment: '书籍阅读数据：[{id:"书籍ID", location:"阅读位置"}]',
  })
  myBookData: BookReadingData[]; // 使用自定义 TS 类型约束数组项结构

  @CreateDateColumn({
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    comment: '更新时间',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    select: false,
    comment: '删除时间（软删除）',
  })
  deletedAt?: Date;
}
