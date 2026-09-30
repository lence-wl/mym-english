import { DataSource } from 'typeorm';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import { databaseConfig } from './database.config';

// 使用更严格的类型定义
const dataSourceOptions: SqliteConnectionOptions = {
  ...(databaseConfig as any),
};

export const AppDataSource = new DataSource(dataSourceOptions);

// 可选：添加数据源初始化函数
export const initializeDataSource = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Data Source has been initialized!');
    }
    return AppDataSource;
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    throw error;
  }
};
