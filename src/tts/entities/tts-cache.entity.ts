// src/tts/entities/tts-cache.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 语音合成结果缓存
 * 相同文本+音色只调用一次合成接口，降低 API 费用
 */
@Entity('tts_cache')
export class TtsCache {
  @PrimaryGeneratedColumn()
  id: number;

  /** 缓存键：归一化文本 + 音色 + 音频格式（见 TtsService.buildCacheKey） */
  @Column({ length: 600, unique: true, nullable: false, comment: '缓存键' })
  cacheKey: string;

  /** 合成音频（base64 字符串） */
  @Column({ type: 'text', nullable: false, comment: '音频base64' })
  audio: string;

  /** 音频时长（毫秒） */
  @Column({ length: 20, nullable: true, comment: '音频时长(毫秒)' })
  duration: string;

  /** 字级时间戳 JSON 字符串（{words:[...]}） */
  @Column({ type: 'text', nullable: true, comment: '字级时间戳JSON' })
  frontend: string;

  /** 命中次数（用于评估节省效果） */
  @Column({ default: 0, comment: '缓存命中次数' })
  hitCount: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}