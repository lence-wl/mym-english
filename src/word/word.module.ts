import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WordService } from './word.service';
import { WordController } from './word.controller';
import { Word, WordSchema } from './entities/word.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Word.name, schema: WordSchema }])],
  controllers: [WordController],
  providers: [WordService],
})
export class WordModule {}
