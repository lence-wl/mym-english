import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/** 存放各集合自增序列的集合名 */
const COUNTER_COLLECTION = 'counters';

/**
 * 自增整数主键生成器
 *
 * Mongo 默认 _id 为 ObjectId，而本项目接口约定 id 为整数（沿用原 SQLite 的自增主键），
 * 因此用 counters 集合为指定集合维护自增序列；首次使用时以现有数据的最大 _id 作为起点，
 * 保证从 SQLite 迁移过来的数据与新写入的数据不会撞 id。
 */
@Injectable()
export class SequenceService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /** 取指定集合的下一个自增 id */
  async nextId(collection: string): Promise<number> {
    const counters = this.connection.collection(COUNTER_COLLECTION);

    const counter = await counters.findOne({ _id: collection as any });
    if (!counter) {
      // 初次使用：以现有数据最大 _id 作为起点
      const [latest] = await this.connection
        .collection(collection)
        .find({}, { projection: { _id: 1 } })
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
      const start = typeof latest?._id === 'number' ? latest._id : 0;
      await counters.updateOne(
        { _id: collection as any },
        { $setOnInsert: { seq: start } },
        { upsert: true },
      );
    }

    await counters.updateOne(
      { _id: collection as any },
      { $inc: { seq: 1 } },
      { upsert: true },
    );
    const updated = await counters.findOne({ _id: collection as any });
    return (updated?.seq as number) ?? 1;
  }
}