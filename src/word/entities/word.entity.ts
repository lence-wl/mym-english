// src/word/entities/word.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 600, nullable: false, comment: '单词' })
  word: string;

  @Column({ length: 100, nullable: true, comment: '音标' })
  phonetic?: string;

  @Column({ type: 'text', nullable: true, comment: '释义' })
  definition?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '常用短语搭配（JSON字符串）',
  })
  phrases?: string;

  @Column({ name: 'user_id', nullable: false, comment: '用户ID' })
  userId: number;

  @Column({ name: 'book_id', nullable: true, comment: '关联书籍ID' })
  bookId?: number;

  @Column({ default: false, nullable: true, comment: '是否是句子' })
  isSentence?: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', select: false, comment: '删除时间' })
  deletedAt?: Date;
}
