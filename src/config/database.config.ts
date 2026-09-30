import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { existsSync } from 'fs';

// 数据库文件路径：优先 DB_PATH；生产默认 /data/app.db，开发默认项目根目录下 database/database.sqlite
const dbPath =
  process.env.DB_PATH ||
  (process.env.NODE_ENV === 'production'
    ? '/data/app.db'
    : join(process.cwd(), 'database', 'database.sqlite'));

// 全新数据库文件由实体同步建表；存量库只跑迁移，避免 synchronize 造成结构漂移
const isNewDatabase = !existsSync(dbPath);

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: dbPath,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: process.env.NODE_ENV !== 'production' || isNewDatabase,
  migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
  logging: process.env.NODE_ENV === 'production' ? ['error'] : ['log', 'error'],
  migrationsRun: true,
  migrationsTableName: 'migrations', // 迁移表名
  extra: {
    charset: 'utf8',
  },
};