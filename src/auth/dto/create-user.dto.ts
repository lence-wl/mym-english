import {
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString({ message: '用户名必须是字符串类型' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度不能少于3个字符' })
  @MaxLength(50, { message: '用户名长度不能超过50个字符' })
  username: string;

  @IsString({ message: '密码必须是字符串类型' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码长度不能少于8个字符' })
  @MaxLength(12, { message: '密码长度不能超过12个字符' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,12}$/, {
    message: '密码长度必须为8-12位，且必须包含至少一个字母和一个数字',
  })
  password: string;

  @IsString({ message: '确认密码必须是字符串类型' })
  @IsNotEmpty({ message: '确认密码不能为空' })
  @MinLength(8, { message: '确认密码长度不能少于8个字符' })
  @MaxLength(12, { message: '确认密码长度不能超过12个字符' })
  confirmPassword: string;

  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @MaxLength(100, { message: '邮箱长度不能超过100个字符' })
  email: string;

  // 可选角色字段，仅管理员可设置
  @IsOptional()
  @IsEnum(UserRole, { message: '角色必须是admin、common或vip' })
  role?: UserRole;
}
