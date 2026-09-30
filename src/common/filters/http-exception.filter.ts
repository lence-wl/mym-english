import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception.getStatus();
    // 获取异常的响应内容（可能包含详细错误信息）
    const errorResponse = exception.getResponse();

    // 解析详细错误信息
    let message = exception.message || '服务器错误';
    if (typeof errorResponse === 'object' && errorResponse !== null) {
      // 处理类验证器的错误信息（数组形式）
      if (Array.isArray((errorResponse as any).message)) {
        message = (errorResponse as any).message.join('; ');
      }
      // 处理自定义错误信息（对象形式）
      else if ((errorResponse as any).message) {
        message = (errorResponse as any).message;
      }
    }

    const errorResponseData: ApiResponse = {
      code: status,
      success: false,
      message: message, // 返回具体错误信息
      data: null,
      timestamp: Date.now(),
    };

    response.status(status).json(errorResponseData);
  }
}
