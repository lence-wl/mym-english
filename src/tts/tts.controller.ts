// src/tts/tts.controller.ts
import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { TtsService } from './tts.service';
import { TtsRequestDto } from './dto/tts-request.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
@Controller('tts')
@UseGuards(JwtAuthGuard)
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  // 非流式合成接口（v3 分片在服务端聚合，对外契约保持不变）
  @Post('synth')
  async ttsSynth(@Body() dto: TtsRequestDto) {
    const body = await this.ttsService.ttsSynth(dto);
    // 统一响应拦截器会取返回值的 data 字段，这里包一层以保持前端既有契约
    return { data: body };
  }
}
