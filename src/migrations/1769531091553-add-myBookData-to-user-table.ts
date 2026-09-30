import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMyBookDataToUserTable1769531091553 implements MigrationInterface {
  // 可选：给迁移命名（保持和文件名一致即可）
  name = 'AddMyBookDataToUserTable1769531091553';

  // 执行迁移：新增 myBookData 字段（核心逻辑）
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 全新库已由 synchronize 依据实体建好该表与字段，此时无需再补列
    if (!(await queryRunner.hasTable('users'))) return;
    const columns: Array<{ name: string }> = await queryRunner.query(
      `PRAGMA table_info("users")`,
    );
    if (columns.some((column) => column.name === 'myBookData')) return;

    // 适配 SQLite 的 ALTER TABLE 语法，新增 JSON 类型字段，默认值为空数组
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "myBookData" json DEFAULT ('[]')`,
    );
  }

  // 回滚迁移：删除 myBookData 字段（出错时可恢复）
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "myBookData"`);
  }
}
