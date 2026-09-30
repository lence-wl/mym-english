import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from "src/utils/request";
import { DictCache } from "./entities/dict-cache.entity";

// 定义回调类型
export type StreamDataCallback = (content: string) => void;
export type StreamCompleteCallback = () => void;
export type StreamErrorCallback = (error: Error) => void;

// 默认模型（可被环境变量 ARK_MODEL 覆盖，支持模型 ID 或推理接入点 ep-xxxx）
const DEFAULT_ARK_MODEL = 'doubao-seed-2-1-lite-260915';

const API_CONFIG = {
  // 密钥/模型改由环境变量注入（见 LLMService.getApiKey / getModel）
  url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  systemPrompt: '你是一名专业的英语老师，只输出可被 JSON.parse 解析的 JSON，不要输出解释文字或代码块。规则：1.输入是句子：先翻译整句，再列出不太常见的固定搭配（两个词及以上，类似 look at、want to do sth.），最多5个，格式 {"t":"整句翻译","l":[{"w":"搭配","d":"释义"}]}；2.输入是单词：输出词典数据（不含原单词），只含英式/美式音标和释义，格式 {"p":"音标","d":"释义"}。'
};

// 生成参数：关闭思考、低温、限定输出长度 + JSON 模式，减少无效 token 消耗
const GENERATION_CONFIG = {
  maxCompletionTokens: 500,
  temperature: 0.2,
  responseFormat: { type: 'json_object' },
};

// 首尾的装饰符号：空白、引号、括号、句读等（只用于缓存键，不影响发给模型的原文本）
const EDGE_SYMBOLS = '\\s"\u201c\u201d\u2018\u2019\'()（）\\[\\]{}<>《》「」.,!?;:。，、！？；：…—–\\-·';
const LEADING_SYMBOLS = new RegExp(`^[${EDGE_SYMBOLS}]+`);
const TRAILING_SYMBOLS = new RegExp(`[${EDGE_SYMBOLS}]+$`, 'g');

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(DictCache)
    private readonly dictCacheRepo: Repository<DictCache>,
  ) {}

  // 从环境变量读取豆包（火山方舟）API Key
  private getApiKey(): string {
    const apiKey = this.configService.get<string>('ARK_API_KEY');
    if (!apiKey) {
      throw new Error('缺少环境变量 ARK_API_KEY，请在 .env 中配置');
    }
    return apiKey;
  }

  // 模型 ID 或推理接入点（ep-xxxx），优先取环境变量 ARK_MODEL
  private getModel(): string {
    return this.configService.get<string>('ARK_MODEL') || DEFAULT_ARK_MODEL;
  }

  // 归一化查询文本作为缓存键：去首尾空格、合并连续空格、去首尾标点、转小写
  // 避免大小写、多余空格、句读符号导致重复调用大模型
  private buildCacheKey(text: string): string {
    const normalized = (text || '').trim().replace(/\s+/g, ' ');
    const stripped = normalized
      .replace(LEADING_SYMBOLS, '')
      .replace(TRAILING_SYMBOLS, '')
      .trim();
    // 整串都是符号时退回原文本，避免不同内容塌缩成同一个空键
    return (stripped || normalized).toLowerCase();
  }

  /** 读取释义缓存：命中则不再调用大模型 */
  async getCachedDict(text: string): Promise<string | null> {
    const cacheKey = this.buildCacheKey(text);
    if (!cacheKey) return null;

    try {
      const hit = await this.dictCacheRepo.findOne({ where: { cacheKey } });
      if (!hit) return null;
      await this.dictCacheRepo.increment({ cacheKey }, 'hitCount', 1);
      return hit.result;
    } catch (error) {
      // 缓存异常不应影响主流程
      this.logger.warn(`读取释义缓存失败：${(error as Error).message}`);
      return null;
    }
  }

  /** 写入释义缓存：只缓存合法 JSON，避免把坏结果固化下来 */
  async saveDictCache(text: string, result: string): Promise<void> {
    const cacheKey = this.buildCacheKey(text);
    if (!cacheKey || !result) return;

    try {
      JSON.parse(result);
    } catch {
      // 模型返回的不是合法 JSON，缓存无意义（下次仍会重新询问）
      return;
    }

    try {
      await this.dictCacheRepo.upsert({ cacheKey, result }, ['cacheKey']);
    } catch (error) {
      this.logger.warn(`写入释义缓存失败：${(error as Error).message}`);
    }
  }

  // 非流式方法（保持不变）
  async getWordDataFormLLM(data: { text: string }, userId: string | number) {
    const str = data.text?.trim() || '';
    const standardizedUserId = String(userId);
    
    if (!str) {
      throw new Error('待查询的单词/句子不能为空');
    }

    // 命中缓存直接返回，不再调用大模型（省费用）
    const cached = await this.getCachedDict(str);
    if (cached) {
      return { data: cached };
    }

    try {
      const llmRes: any = await request.post<any>(
        API_CONFIG.url,
        {
          messages: [
            {
              role: 'system',
              content: [{ type: 'text', text: API_CONFIG.systemPrompt }],
            },
            {
              role: 'user',
              content: [{ type: 'text', text: str }],
            },
          ],
          model: this.getModel(),
          max_completion_tokens: GENERATION_CONFIG.maxCompletionTokens,
          temperature: GENERATION_CONFIG.temperature,
          response_format: GENERATION_CONFIG.responseFormat,
          stream: false,
          user_id: standardizedUserId,
          thinking: { type: 'disabled' },
          cache_config: {
            enable: true,
            cache_ttl: 86400,
            cache_key: 'llm_dict_fixed_system_prompt'
          },
          prompt_cache_strategy: "auto"
        },
        {
          headers: {
            Authorization: `Bearer ${this.getApiKey()}`,
            'Content-Type': 'application/json'
          },
        }
      );

      const content = (llmRes.choices?.[0])?.message?.content || '';
      await this.saveDictCache(str, content);

      return { data: content };

    } catch (error) {
      // 带上游返回的错误码与说明，便于区分“密钥失效 / 模型未开通 / 参数非法”
      const upstream = error?.response?.data?.error;
      const detail =
        upstream?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : '') ||
        error?.message;
      throw new Error(
        `非流式请求失败：${upstream?.code ? `[${upstream.code}] ` : ''}${detail}`
      );
    }
  }

  /**
   * 后端流式调用大模型（纯原生 API，无第三方依赖）
   */
  getWordDataFormLLMStream(
    text: string,
    userId: string | number,
    onData: StreamDataCallback,
    onComplete: StreamCompleteCallback,
    onError: StreamErrorCallback
  ): AbortController {
    const str = text?.trim() || '';
    const standardizedUserId = String(userId);

    // 1. 使用 Node.js 原生 AbortController（全局内置）
    const abortController = new AbortController();
    const signal = abortController.signal;

    // 密钥缺失时通过回调报错，避免同步抛出破坏调用方流程
    let apiKey: string;
    try {
      apiKey = this.getApiKey();
    } catch (error) {
      onError(error as Error);
      return abortController;
    }

    if (!str) {
      onError(new Error('待查询的单词/句子不能为空'));
      return abortController;
    }

    // 构建大模型请求体
    const requestBody = {
      messages: [
        { role: 'system', content: [{ type: 'text', text: API_CONFIG.systemPrompt }] },
        { role: 'user', content: [{ type: 'text', text: str }] }
      ],
      model: this.getModel(),
      max_completion_tokens: GENERATION_CONFIG.maxCompletionTokens,
      temperature: GENERATION_CONFIG.temperature,
      response_format: GENERATION_CONFIG.responseFormat,
      stream: true,
      user_id: standardizedUserId,
      thinking: { type: 'disabled' },
      cache_config: { enable: true, cache_ttl: 86400, cache_key: 'llm_dict_fixed_system_prompt' },
      prompt_cache_strategy: "auto"
    };

    // 2. 原生 fetch 调用（signal 为原生 AbortSignal）
    fetch(API_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: signal // 原生 signal，无类型问题
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`大模型接口返回错误：${response.status} ${response.statusText}`);
      }

      // 读取流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取流式响应读取器');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      // 循环读取流式数据
      const readStream = async () => {
        try {
          const { done, value } = await reader.read();
          
          // 流结束
          if (done) {
            onComplete();
            return;
          }

          // 解码并解析数据
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留未完成的行

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === '[DONE]') continue;
            
            // 兼容大模型流式格式（data: xxx）
            let jsonStr = trimmedLine.startsWith('data:') 
              ? trimmedLine.replace(/^data: /, '') 
              : trimmedLine;

            if (jsonStr === '[DONE]' || !jsonStr) continue;

            try {
              const json = JSON.parse(jsonStr);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                onData(content); // 传递实时内容到控制器
              }
            } catch (e) {
              console.warn('单条数据解析失败，跳过：', line, e);
              continue;
            }
          }

          // 继续读取下一块数据
          readStream();
        } catch (e) {
          if (!signal.aborted) {
            onError(new Error(`解析大模型流式数据失败：${(e as Error).message}`));
          }
        }
      };

      readStream();
    }).catch((err) => {
      if (!signal.aborted) {
        onError(new Error(`大模型流式请求失败：${err.message}`));
      }
    });

    return abortController;
  }
}