// src/tts/tts.service.ts
import { randomUUID } from 'crypto';
import axios from 'axios';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { TtsRequestDto } from './dto/tts-request.dto';
import { TtsCache, TtsCacheDocument } from './entities/tts-cache.entity';
import { SequenceService } from '../common/sequence.service';

// 豆包语音合成 2.0：v3 http 单向流式接口
const CONFIG = {
  API_URL: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional',
  // 官方固定的 app key
  APP_KEY: 'aGjiRDfUWi',
  SAMPLE_RATE: 24000,
  AUDIO_FORMAT: 'mp3',
};

// 语速倍率（1.0 为音色原始语速）；v3 的 speech_rate 取值为 [-50, 100]，100 表示 2.0 倍速
const SPEECH_SPEED_RATIO = 1;
const SPEECH_RATE = Math.round((SPEECH_SPEED_RATIO - 1) * 100);

// 缓存清理：两次清理最小间隔、每批处理行数、单次最多清理批数
const EVICT_INTERVAL_MS = 5 * 60 * 1000;
const EVICT_BATCH_SIZE = 200;
const EVICT_MAX_PASSES = 10;

// 前端消费的字级时间戳结构（毫秒）
interface FrontendWord {
  word: string;
  start_time: number;
  end_time: number;
}

// v3 正常结束标记
const CODE_SUCCESS_END = 20000000;

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly appId: string;
  private readonly accessKey: string;
  private readonly resourceId: string;
  private readonly appKey: string;
  private readonly speaker: string;
  private readonly cacheMaxBytes: number;
  private lastEvictAt = 0;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(TtsCache.name)
    private readonly ttsCacheModel: Model<TtsCacheDocument>,
    private readonly sequenceService: SequenceService,
  ) {
    this.appId = this.configService.get<string>('TTS_APP_ID') || '';
    this.accessKey = this.configService.get<string>('TTS_TOKEN') || '';
    this.resourceId =
      this.configService.get<string>('TTS_RESOURCE_ID') || 'seed-tts-2.0';
    this.appKey = this.configService.get<string>('TTS_APP_KEY') || CONFIG.APP_KEY;
    this.speaker =
      this.configService.get<string>('TTS_SPEAKER') ||
      'zh_female_vv_uranus_bigtts';

    // 缓存容量上限（MB），超出后按最久未使用淘汰
    this.cacheMaxBytes =
      (Number(this.configService.get('TTS_CACHE_MAX_MB')) || 500) * 1024 * 1024;

    if (!this.appId || !this.accessKey) {
      this.logger.warn('缺少环境变量 TTS_APP_ID / TTS_TOKEN，语音合成将不可用');
    }
  }

  // 启动后先收敛一次历史膨胀的缓存；清理失败不影响服务启动
  async onModuleInit(): Promise<void> {
    await this.evictCache(true);
  }

  /**
   * 缓存清理：超出容量上限时按「最久未使用」淘汰（命中或写入都会刷新 updated_at）
   * 由写入缓存后触发，5 分钟内最多执行一次，避免每次写入都做全表统计
   */
  private async evictCache(force = false): Promise<void> {
    if (!force && Date.now() - this.lastEvictAt < EVICT_INTERVAL_MS) return;
    this.lastEvictAt = Date.now();

    try {
      // 音频总长度（base64 为 ASCII，字符数即字节数）
      const [usage] = await this.ttsCacheModel.aggregate<{ sum: number }>([
        { $group: { _id: null, sum: { $sum: { $strLenCP: '$audio' } } } },
      ]);
      const usedBytes = usage?.sum ?? 0;
      if (usedBytes <= this.cacheMaxBytes) return;

      // 分批淘汰最久未使用（updatedAt 最旧在前）；一批内只删到刚好回到上限之下，
      // 未收敛则继续下一批，直至收敛或达到批次上限
      let remaining = usedBytes;
      let deletedTotal = 0;
      for (let pass = 0; pass < EVICT_MAX_PASSES; pass++) {
        const victims = await this.ttsCacheModel.aggregate<{
          _id: number;
          size: number;
        }>([
          { $project: { size: { $strLenCP: '$audio' }, updatedAt: 1 } },
          { $sort: { updatedAt: 1 } },
          { $limit: EVICT_BATCH_SIZE },
        ]);
        if (!victims.length) break;

        const ids: number[] = [];
        let freed = 0;
        for (const victim of victims) {
          if (remaining - freed <= this.cacheMaxBytes) break;
          ids.push(victim._id);
          freed += victim.size || 0;
        }
        if (!ids.length) break;

        await this.ttsCacheModel.deleteMany({ _id: { $in: ids } });
        deletedTotal += ids.length;
        remaining -= freed;
      }

      this.logger.log(
        `TTS 缓存超限，按最久未使用淘汰 ${deletedTotal} 条，释放 ${((usedBytes - Math.max(remaining, this.cacheMaxBytes)) / 1024 / 1024).toFixed(1)}MB（上限 ${Math.round(this.cacheMaxBytes / 1024 / 1024)}MB）`,
      );
    } catch (error) {
      this.logger.warn(`TTS 缓存清理失败：${(error as Error).message}`);
    }
  }

  /**
   * 合成语音：优先读缓存，未命中才调用 v3 单向流式接口，
   * 并归一化成前端既有的 v1 响应结构（字级时间戳放在 addition.frontend）
   */
  async ttsSynth(dto: TtsRequestDto) {
    if (!dto.text) {
      throw new Error('合成文本不能为空');
    }

    const cacheKey = this.buildCacheKey(dto.text);

    // 命中缓存：直接返回，不再调用合成接口（省费用）
    const cached = await this.getCached(cacheKey);
    if (cached) {
      return this.buildResponse(cached.audio, cached.duration, cached.frontend);
    }

    const { audioBase64, words } = await this.requestV3(dto.text);

    // 末字结束时间即音频时长（毫秒）
    const duration = words.length ? String(words[words.length - 1].end_time) : '0';
    const frontend = JSON.stringify({ words });

    await this.saveCache(cacheKey, audioBase64, duration, frontend);

    return this.buildResponse(audioBase64, duration, frontend);
  }

  /**
   * 缓存键：归一化文本 + 音色 + 语速 + 音频格式
   * 不做小写化——大小写会影响读音（如 US / us）
   */
  private buildCacheKey(text: string): string {
    const normalized = (text || '').trim().replace(/\s+/g, ' ');
    return `${normalized}|${this.speaker}|rate${SPEECH_RATE}|${CONFIG.AUDIO_FORMAT}@${CONFIG.SAMPLE_RATE}`;
  }

  /** 读取语音缓存 */
  private async getCached(cacheKey: string): Promise<TtsCacheDocument | null> {
    try {
      const hit = await this.ttsCacheModel.findOne({ cacheKey });
      if (!hit) return null;

      // 刷新命中次数与最近使用时间（updatedAt 由 schema 的 timestamps 自动更新，是 LRU 淘汰的依据）
      await this.ttsCacheModel.updateOne(
        { cacheKey },
        { $inc: { hitCount: 1 } },
      );

      return hit;
    } catch (error) {
      // 缓存异常不应影响主流程
      this.logger.warn(`读取语音缓存失败：${(error as Error).message}`);
      return null;
    }
  }

  /** 写入语音缓存 */
  private async saveCache(
    cacheKey: string,
    audio: string,
    duration: string,
    frontend: string,
  ): Promise<void> {
    if (!audio) return;

    try {
      await this.ttsCacheModel.updateOne(
        { cacheKey },
        {
          $set: { audio, duration, frontend },
          // 仅新增时分配自增 id（更新时该字段被忽略）
          $setOnInsert: {
            _id: await this.sequenceService.nextId('tts_cache'),
          },
        },
        { upsert: true },
      );

      // 写入后惰性检查容量上限（内部有节流，不阻塞响应）
      void this.evictCache();
    } catch (error) {
      this.logger.warn(`写入语音缓存失败：${(error as Error).message}`);
    }
  }

  /** 组装前端契约响应（命中缓存与实时合成共用） */
  private buildResponse(data: string, duration: string, frontend: string) {
    return {
      code: 3000,
      message: 'Success',
      reqid: randomUUID(),
      sequence: -1,
      data,
      addition: {
        duration,
        frontend,
      },
    };
  }

  /**
   * 调用 v3 接口（返回 NDJSON 分片流），拼接音频并提取字级时间戳
   */
  private async requestV3(
    text: string,
  ): Promise<{ audioBase64: string; words: FrontendWord[] }> {
    let raw: string;
    try {
      const res = await axios({
        method: 'POST',
        url: CONFIG.API_URL,
        headers: {
          'X-Api-App-Id': this.appId,
          'X-Api-Access-Key': this.accessKey,
          'X-Api-Resource-Id': this.resourceId,
          'X-Api-App-Key': this.appKey,
          'Content-Type': 'application/json',
        },
        data: {
          req_params: {
            text,
            speaker: this.speaker,
            audio_params: {
              format: CONFIG.AUDIO_FORMAT,
              sample_rate: CONFIG.SAMPLE_RATE,
              speech_rate: SPEECH_RATE,
              enable_subtitle: true,
            },
          },
        },
        responseType: 'text',
        // 保留原始 NDJSON 文本，避免 axios 尝试 JSON.parse 失败
        transformResponse: [(data) => data],
        timeout: 30000,
      });
      raw = String(res.data ?? '');
    } catch (error) {
      const upstream = error?.response?.data;
      const detail =
        (typeof upstream === 'string' ? upstream : JSON.stringify(upstream)) ||
        error?.message;
      throw new Error(`TTS 请求失败：${detail}`);
    }

    const lines = raw.split(/\r?\n/).filter((line) => line.trim());

    let audioBase64 = '';
    const words: FrontendWord[] = [];

    for (const line of lines) {
      let chunk: any;
      try {
        chunk = JSON.parse(line);
      } catch {
        this.logger.warn(`忽略无法解析的响应分片: ${line.slice(0, 80)}`);
        continue;
      }

      const code = chunk.header?.code ?? chunk.code;
      const message = chunk.header?.message ?? chunk.message ?? '';
      // 0 与 20000000 均为成功
      if (code && code !== 0 && code !== CODE_SUCCESS_END) {
        throw new Error(`TTS 合成失败：[${code}] ${message}`);
      }

      // 音频分片（base64）
      if (typeof chunk.data === 'string' && chunk.data) {
        audioBase64 += chunk.data;
      }

      // 字级时间戳：秒 -> 毫秒
      const sentenceWords = chunk.sentence?.words;
      if (Array.isArray(sentenceWords)) {
        for (const item of sentenceWords) {
          words.push({
            word: item.word,
            start_time: Math.round((item.startTime ?? 0) * 1000),
            end_time: Math.round((item.endTime ?? 0) * 1000),
          });
        }
      }
    }

    if (!audioBase64) {
      throw new Error('TTS 返回成功但未包含音频数据');
    }

    return { audioBase64, words };
  }
}