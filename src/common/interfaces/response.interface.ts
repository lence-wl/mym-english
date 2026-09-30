// src/common/interfaces/response.interface.ts
export interface ApiResponse<T = any> {
  code: number; // 状态码（业务自定义，非HTTP状态码）
  success?: boolean; // 是否成功
  message?: string; // 提示信息
  data: T | null; // 业务数据（成功时返回）
  timestamp: number; // 响应时间戳
}
