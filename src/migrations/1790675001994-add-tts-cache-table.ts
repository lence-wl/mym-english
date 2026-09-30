import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTtsCacheTable1790675001994 implements MigrationInterface {
  name = 'AddTtsCacheTable1790675001994';

  // 执行迁移：新建语音合成缓存表（全新库已由 synchronize 建好，此时直接跳过）
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('tts_cache')) return;

    await queryRunner.query(
      `CREATE TABLE "tts_cache" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "cacheKey" varchar(600) NOT NULL,
        "audio" text NOT NULL,
        "duration" varchar(20),
        "frontend" text,
        "hitCount" integer NOT NULL DEFAULT (0),
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tts_cache_cacheKey" ON "tts_cache" ("cacheKey")`,
    );
  }

  // 回滚迁移：删除缓存表
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tts_cache"`);
  }
}