import { IsString } from 'class-validator';

export class LoginUserDto {
  @IsString({ message: '用户名必须是字符串' })
  username: string;

  @IsString({ message: '密码必须是字符串' })
  password: string;
}
