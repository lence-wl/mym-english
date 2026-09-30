// src/llm/entities/dict-cache.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 单词/句子释义结果缓存
 * 同一个查询文本只调用一次大模型，降低 API 费用
 */
@Entity('dict_cache')
export class DictCache {
  @PrimaryGeneratedColumn()
  id: number;

  /** 归一化后的查询文本（去首尾空格、转小写、合并连续空格） */
  @Column({ length: 600, unique: true, nullable: false, comment: '查询文本' })
  cacheKey: string;

  /** 大模型返回的 JSON 字符串 */
  @Column({ type: 'text', nullable: false, comment: '模型返回的JSON结果' })
  result: string;

  /** 命中次数（用于评估节省效果） */
  @Column({ default: 0, comment: '缓存命中次数' })
  hitCount: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}