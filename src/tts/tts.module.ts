// src/tts/tts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';
import { TtsCache } from './entities/tts-cache.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TtsCache])],
  controllers: [TtsController],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
