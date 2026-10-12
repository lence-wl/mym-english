import { IsBoolean } from 'class-validator';

export class UpdateVisibilityDto {
  /** 是否公开：true-公开给所有登录用户，false-仅上传者与管理员可见 */
  @IsBoolean({ message: 'isPublic 必须为布尔值' })
  isPublic: boolean;
}