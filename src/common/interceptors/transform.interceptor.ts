import {
  Injectable,
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';

interface CustomResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T | CustomResponse<T>, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<CustomResponse<T>>,
  ): Observable<ApiResponse<T>> {
    const defaultMessage = '操作成功';
    const defaultSuccess = true;

    // 获取当前请求对象
    const request = context.switchToHttp().getRequest();
    // 判断是否是流式接口（根据接口路径匹配）
    const isStreamApi = request?.originalUrl?.includes('/dbmd/dict/stream');

    // 如果是流式接口，直接返回原始响应（不包装）
    if (isStreamApi) {
      return next.handle() as Observable<ApiResponse<T>>;
    }

    // 非流式接口，安全包装统一响应（核心修复：处理response为undefined的情况）
    return next.handle().pipe(
      map((response) => {
        // 安全处理：如果response为undefined，默认空对象
        const safeResponse = response || {};
        return {
          code: 200,
          // 先判断safeResponse是否有success属性，再用默认值
          success: 'success' in safeResponse ? safeResponse.success : defaultSuccess,
          message: safeResponse.message ?? defaultMessage,
          data: safeResponse.data ?? null,
          timestamp: Date.now(),
        };
      }),
    );
  }
}