// src/tts/tts.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';
import { TtsCache, TtsCacheSchema } from './entities/tts-cache.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TtsCache.name, schema: TtsCacheSchema },
    ]),
  ],
  controllers: [TtsController],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
