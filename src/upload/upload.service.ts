// src/upload/upload.service.ts
import { Injectable } from '@nestjs/common';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { isAbsolute, join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  private uploadPath: string;

  constructor(private configService: ConfigService) {
    // 上传目录：统一由 UPLOAD_DIR 控制，相对项目根目录（容器内 cwd=/app → /app/uploads），
    // 与 main.ts 里 /uploads 的静态托管路径保持一致
    const uploadDir =
      this.configService.get<string>('UPLOAD_DIR') || 'uploads';
    this.uploadPath = join(process.cwd(), uploadDir);

    // 确保上传目录存在
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * 把数据库里存的 filePath（仅文件名）解析为绝对路径
   * @param filePath 数据库中的 filePath 字段
   */
  resolveFilePath(filePath: string): string {
    // 兼容历史上可能存过绝对路径的数据
    return isAbsolute(filePath) ? filePath : join(this.uploadPath, filePath);
  }

  /**
   * 保存上传的文件
   * @param file 上传的文件对象
   * @returns 包含文件信息的对象
   */
  async saveFile(file: Express.Multer.File) {
    if (!file) {
      throw new Error('文件不能为空');
    }

    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split('.').pop();
    const filename = `${file.fieldname}-${uniqueSuffix}.${ext}`;
    const filePath = join(this.uploadPath, filename);

    // 保存文件
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath);
      stream.write(file.buffer);
      stream.end();
      stream.on('finish', () => { resolve(); file.buffer = null as any; });
      stream.on('error', reject);
    });

    return {
      filename,
      originalName: file.originalname,
      filePath: filename,
      fileSize: file.size,
      fileType: file.mimetype,
    };
  }
}
