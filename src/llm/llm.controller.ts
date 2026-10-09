import { Request, Body, Controller, Post, UseGuards, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { LLMService, StreamDataCallback, StreamCompleteCallback, StreamErrorCallback } from './llm.services';
import { GrammarRequestDto } from './dto/grammar-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dbmd')
@UseGuards(JwtAuthGuard)
export class LLMController {
    constructor(private readonly llmService: LLMService) { }

    /**
     * 单词或者句子释义（非流式，走统一响应拦截器）
     */
    @Post('superEnglishDict')
    async requestSuperDIct(@Request() req: any, @Body() body: any) {
        const user = req.user;
        // 非流式接口返回普通对象，拦截器会自动包装
        return this.llmService.getWordDataFormLLM(body, user.id);
    }

    /**
     * 语法解析（流式）：老师口吻的语法讲解，纯文本增量推送
     */
    @Post('grammar/stream')
    async getGrammarStream(
        @Body() body: GrammarRequestDto,
        @Res() res: Response,
        @Request() req: any
    ) {
        let abortController: AbortController | null = null;
        // 设置SSE响应头（关键：确保流式输出格式）
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
        res.status(HttpStatus.OK);

        if (!body?.text?.trim()) {
            res.write(`data: ${JSON.stringify({
                code: 400,
                success: false,
                message: '待分析的文本不能为空',
                data: null
            })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        // 命中缓存：一次性把完整结果推完，不再调用大模型（省费用）
        const cached = await this.llmService.getCachedDict(body.text, 'grammar3');
        if (cached) {
            res.write(`data: ${JSON.stringify({
                code: 200,
                success: true,
                message: '数据推送中',
                data: cached,
                timestamp: Date.now()
            })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        // 累计本次流式返回的完整内容，结束时写入缓存
        let streamedContent = '';

        const onData: StreamDataCallback = (content) => {
            streamedContent += content;
            try {
                res.write(`data: ${JSON.stringify({
                    code: 200,
                    success: true,
                    message: '数据推送中',
                    data: content,
                    timestamp: Date.now()
                })}\n\n`);
            } catch {
                // 前端断开连接，中断流
                abortController?.abort();
            }
        };

        const onComplete: StreamCompleteCallback = () => {
            // 流正常结束，写入语法解析缓存
            void this.llmService.saveDictCache(body.text, streamedContent, 'grammar3');

            res.write(`data: ${JSON.stringify({
                code: 200,
                success: true,
                message: '流式请求完成',
                data: null,
                timestamp: Date.now()
            })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        };

        const onError: StreamErrorCallback = (error) => {
            res.write(`data: ${JSON.stringify({
                code: 500,
                success: false,
                message: error.message,
                data: null,
                timestamp: Date.now()
            })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        };

        abortController = this.llmService.getGrammarFromLLMStream(
            body.text,
            req.user.id,
            onData,
            onComplete,
            onError
        );

        // 前端断开连接时中断流
        res.on('close', () => {
            abortController?.abort();
        });
    }

    // 流式接口（跳过统一响应拦截器）
  @Post('superEnglishDict/stream')
  async getDictStream(@Body() body: { text: string }, @Res() res: Response, @Request() req: any) {
      // 1. 提前定义 abortController 变量（保存方法返回的实例）
  let abortController: AbortController | null = null;
    // 设置SSE响应头（关键：确保流式输出格式）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
      res.status(HttpStatus.OK); // 设置200状态码
    // 入参校验（手动返回流式错误）
    if (!body?.text?.trim()) {
      res.write(`data: ${JSON.stringify({ 
        code: 400,
        success: false,
        message: '待查询的单词/句子不能为空',
        data: null
      })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    // 命中缓存：一次性把完整结果推完，不再调用大模型（省费用）
    const cached = await this.llmService.getCachedDict(body.text);
    if (cached) {
      res.write(`data: ${JSON.stringify({
        code: 200,
        success: true,
        message: '数据推送中',
        data: cached,
        timestamp: Date.now()
      })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    // 累计本次流式返回的完整内容，结束时写入缓存
    let streamedContent = '';

    // 定义流式回调（适配统一响应格式）
    const onData: StreamDataCallback = (content) => {
      streamedContent += content;
      try {
        // 流式数据也包装成统一响应格式
        res.write(`data: ${JSON.stringify({
          code: 200,
          success: true,
          message: '数据推送中',
          data: content,
          timestamp: Date.now()
        })}\n\n`);
      } catch (e) {
          console.error(e)
        // 前端断开连接，中断流
        if (abortController && typeof abortController.abort === 'function') {
        abortController.abort();
      }
      }
    };

    const onComplete: StreamCompleteCallback = () => {
      // 流正常结束，写入释义缓存（仅合法 JSON 会被保留）
      void this.llmService.saveDictCache(body.text, streamedContent);

      // 流结束时返回完成响应
      res.write(`data: ${JSON.stringify({
        code: 200,
        success: true,
        message: '流式请求完成',
        data: null,
        timestamp: Date.now()
      })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    };

    const onError: StreamErrorCallback = (error) => {
      // 错误响应也包装成统一格式
      res.write(`data: ${JSON.stringify({
        code: 500,
        success: false,
        message: error.message,
        data: null,
        timestamp: Date.now()
      })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    };

    // 调用流式方法
    abortController = this.llmService.getWordDataFormLLMStream(
      body.text,
      req.user.id,
      onData,
      onComplete,
      onError
    ) as any;

    // 前端断开连接时中断流
    res.on('close', () => {
      if (abortController && typeof abortController.abort === 'function') {
        abortController.abort();
      }
    });
  }
}