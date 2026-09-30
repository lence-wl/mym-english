import { Global, Module } from '@nestjs/common';
import { SequenceService } from './sequence.service';

/** 全局提供自增 id 生成器，业务模块无需重复导入 */
@Global()
@Module({
  providers: [SequenceService],
  exports: [SequenceService],
})
export class SequenceModule {}