import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDictCacheTable1790674599133 implements MigrationInterface {
  name = 'AddDictCacheTable1790674599133';

  // 执行迁移：新建释义缓存表（全新库已由 synchronize 建好，此时直接跳过）
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('dict_cache')) return;

    await queryRunner.query(
      `CREATE TABLE "dict_cache" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "cacheKey" varchar(600) NOT NULL,
        "result" text NOT NULL,
        "hitCount" integer NOT NULL DEFAULT (0),
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dict_cache_cacheKey" ON "dict_cache" ("cacheKey")`,
    );
  }

  // 回滚迁移：删除缓存表
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dict_cache"`);
  }
}