import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200, nullable: false })
  title: string; // 书名

  @Column({ length: 100, nullable: false })
  author: string; // 作者

  @Column({ type: 'text', nullable: true })
  description?: string; // 简介

  @Column({ nullable: false }) // 关键：确保非空
  filePath: string; // 文件保存路径

  @Column({ nullable: false })
  filename: string; // 原始文件名

  @Column({ nullable: false })
  fileType: string; // 文件类型（如application/epub+zip）

  @Column({ type: 'int', nullable: false })
  fileSize: number; // 文件大小（字节）

  @Column({ type: 'int', default: 0 })
  downloadCount: number; // 下载次数

  @Column({ type: 'tinyint', default: 1 })
  status: number; // 状态：1-正常，0-禁用

  @Column({ name: 'user_id', nullable: false })
  userId: number; // 上传者ID

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User; // 关联上传者

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', select: false })
  deletedAt?: Date;
}
