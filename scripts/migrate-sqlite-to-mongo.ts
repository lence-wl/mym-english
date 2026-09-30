/**
 * SQLite → MongoDB 数据迁移脚本
 *
 * 只读读取项目根目录 database/database.sqlite（Node 内置 node:sqlite，无需额外依赖），
 * 原样迁移到 Mongo（字段名对齐 Schema：user_id→userId、book_id→bookId、
 * created_at/updated_at/deleted_at→驼峰、isSentence 0/1→boolean、myBookData JSON 串→数组），
 * 显式写入数字 _id 沿用原主键，保证前端 id 语义不变。
 *
 * 用法：
 *   MONGODB_URI=mongodb://127.0.0.1:27017/mym-english npm run migrate:mongo
 * （默认即上面这条连接串，可省略）
 *
 * 结束后会比对各集合行数，不一致则退出码非 0。
 */
import 'reflect-metadata';
import { DatabaseSync } from 'node:sqlite';
import mongoose from 'mongoose';

const SQLITE_PATH = process.env.SQLITE_PATH || 'database/database.sqlite';
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mym-english';

/**
 * sqlite 日期字符串（可能无毫秒、以空格分隔）→ Date；空值 → null
 * 注意：SQLite/TypeORM 存的是 UTC（datetime('now') 即 UTC），因此无时区标记时按 UTC 解析
 */
function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim().replace(' ', 'T');
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s}Z`;
  return new Date(withZone);
}

/** 布尔：sqlite 存 0/1 → boolean */
function toBool(v: unknown): boolean {
  return v === 1 || v === true || v === '1' || v === 'true';
}

/** JSON 字符串 → 数组/对象；解析失败回落默认值 */
function parseJson(v: unknown, fallback: unknown): unknown {
  if (v === null || v === undefined || v === '') return fallback;
  try {
    return JSON.parse(String(v));
  } catch {
    return fallback;
  }
}

interface TableConfig {
  table: string; // sqlite 表名
  collection: string; // mongo 集合名
  /** 显式映射（其余同名字段原样拷贝） */
  rename: Record<string, string>;
  /** 字段值转换 */
  transforms: Record<string, (v: unknown) => unknown>;
  /** 迁移后目标行数（与 sqlite 一致） */
  expectedCount: number;
}

const TABLES: TableConfig[] = [
  {
    table: 'users',
    collection: 'users',
    rename: { created_at: 'createdAt', updated_at: 'updatedAt', deleted_at: 'deletedAt' },
    transforms: {
      myBookData: (v) => parseJson(v, []),
      level: (v) => (v === null ? null : Number(v)),
      deletedAt: parseDate,
      createdAt: parseDate,
      updatedAt: parseDate,
    },
    expectedCount: 1,
  },
  {
    table: 'books',
    collection: 'books',
    rename: {
      user_id: 'userId',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      deleted_at: 'deletedAt',
    },
    transforms: { deletedAt: parseDate, createdAt: parseDate, updatedAt: parseDate },
    expectedCount: 1,
  },
  {
    table: 'words',
    collection: 'words',
    rename: {
      user_id: 'userId',
      book_id: 'bookId',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      deleted_at: 'deletedAt',
    },
    transforms: {
      isSentence: toBool,
      bookId: (v) => (v === null ? undefined : v),
      deletedAt: parseDate,
      createdAt: parseDate,
      updatedAt: parseDate,
    },
    expectedCount: 885,
  },
  {
    table: 'dict_cache',
    collection: 'dict_cache',
    rename: { created_at: 'createdAt', updated_at: 'updatedAt' },
    transforms: { createdAt: parseDate, updatedAt: parseDate },
    expectedCount: 6,
  },
  {
    table: 'tts_cache',
    collection: 'tts_cache',
    rename: { created_at: 'createdAt', updated_at: 'updatedAt' },
    transforms: { createdAt: parseDate, updatedAt: parseDate },
    expectedCount: 6,
  },
];

async function main() {
  console.log(`[migrate] 读取 SQLite：${SQLITE_PATH}`);
  const db = new DatabaseSync(SQLITE_PATH, { readOnly: true });

  console.log(`[migrate] 连接 MongoDB：${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);

  const dbHandle = mongoose.connection.db!;
  let ok = true;

  for (const cfg of TABLES) {
    const rows = db.prepare(`SELECT * FROM "${cfg.table}"`).all() as Record<
      string,
      unknown
    >[];
    console.log(`[migrate] ${cfg.table}: 读得 ${rows.length} 行`);

    const docs = rows.map((row) => {
      const doc: Record<string, unknown> = {};
      for (const [col, value] of Object.entries(row)) {
        // 主键单独处理为 _id，不保留 id 字段
        if (col === 'id') continue;
        const key = cfg.rename[col] ?? col;
        const transform = cfg.transforms[key];
        doc[key] = transform ? transform(value) : value;
      }
      // 显式写入数字主键（沿用原 SQLite 自增 id）
      doc._id = row.id;
      return doc;
    });

    // 幂等：先清空目标集合再写入
    await dbHandle.collection(cfg.collection).deleteMany({});
    if (docs.length > 0) {
      await dbHandle.collection(cfg.collection).insertMany(docs);
    }
    const after = await dbHandle.collection(cfg.collection).countDocuments();

    const match = after === cfg.expectedCount;
    console.log(
      `[migrate] ${cfg.collection}: 写入 ${after} 行（期望 ${cfg.expectedCount}）${match ? '✓' : '✗ 不一致！'}`,
    );
    if (!match) ok = false;
  }

  // 初始化自增计数器（SequenceService 首次 nextId 会以最大 _id 兜底，这里预置更稳妥）
  const counters = dbHandle.collection('counters');
  for (const cfg of TABLES) {
    const maxDoc = await dbHandle
      .collection(cfg.collection)
      .find({}, { projection: { _id: 1 } })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();
    const maxId = typeof maxDoc[0]?._id === 'number' ? (maxDoc[0]._id as number) : 0;
    await counters.updateOne(
      { _id: cfg.collection as any },
      { $setOnInsert: { seq: maxId } },
      { upsert: true },
    );
    console.log(`[migrate] counters['${cfg.collection}'] 起点 = ${maxId}`);
  }

  db.close();
  await mongoose.disconnect();

  if (!ok) {
    console.error('[migrate] 迁移失败：集合行数与 SQLite 不一致，请检查后重试（脚本幂等，可重复执行）。');
    process.exit(1);
  }
  console.log('[migrate] 迁移完成，全部集合行数一致。');
}

main().catch((err) => {
  console.error('[migrate] 迁移异常：', err);
  process.exit(1);
});
