import {
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
  @IsString({ message: '用户名必须是字符串类型' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度不能少于3个字符' })
  @MaxLength(50, { message: '用户名长度不能超过50个字符' })
  username: string;

  @IsString({ message: '密码必须是字符串类型' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6个字符' })
  @MaxLength(20, { message: '密码长度不能超过20个字符' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,20}$/,
    {
      message: '密码至少包含一个大写字母、一个小写字母、一个数字和一个特殊字符',
    },
  )
  password: string;

  @IsString({ message: '确认密码必须是字符串类型' })
  @IsNotEmpty({ message: '确认密码不能为空' })
  confirmPassword: string;

  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @MaxLength(100, { message: '邮箱长度不能超过100个字符' })
  email: string;
}
