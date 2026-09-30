import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt'; // 引入JWT服务
import { ConfigService } from '@nestjs/config'; // 导入
import { UserRole } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService, // 注入JWT服务
    private configService: ConfigService, // 注入
  ) {}

  /**
   * 验证用户身份（供Passport策略使用）
   * @param username 用户名
   * @param password 原始密码
   * @returns 验证通过的用户信息（不含密码）
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    // 严格类型检查与基础校验
    if (!username?.trim() || !password?.trim()) {
      throw new BadRequestException('用户名和密码不能为空');
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException('用户名或密码格式错误');
    }

    // 查询用户（包含密码用于验证）
    const user = await this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'password', 'email', 'status'],
    });
    if (!user) {
      // 此处使用相同错误信息避免账户枚举攻击
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 剔除密码字段后返回
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 用户登录
   * @param loginUserDto 登录信息
   * @returns 包含token和用户信息的对象
   */
  async login(loginUserDto: LoginUserDto) {
    // 验证用户身份
    const user = await this.validateUser(
      loginUserDto.username,
      loginUserDto.password,
    );

    // 生成JWT令牌
    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      token,
      tokenType: 'Bearer',
      user,
    };
  }

  /**
   * 注册参数校验
   * @param dto 注册信息
   */
  private validateRegisterParams(dto: CreateUserDto) {
    // 用户名格式校验
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(dto.username)) {
      throw new BadRequestException('用户名必须为3-20位字母、数字或下划线');
    }

    // 密码强度二次校验
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(dto.password)) {
      throw new BadRequestException('密码至少8位，且必须包含字母和数字');
    }

    // 邮箱格式校验
    if (dto.email && !/^[\w-]+@([\w-]+\.)+[\w-]+$/.test(dto.email)) {
      throw new BadRequestException('邮箱格式不正确');
    }

    // 确认密码匹配校验（补充实现）
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('两次输入的密码不一致');
    }
  }

  // 在register方法中添加角色处理逻辑
  async register(
    createUserDto: CreateUserDto,
    currentUser?: User, // 新增：当前登录用户，用于权限控制
  ): Promise<Omit<User, 'password'>> {
    // 基础参数校验
    this.validateRegisterParams(createUserDto);

    // 角色权限控制：只有管理员可以指定角色，普通用户注册默认为common
    let role = UserRole.COMMON;
    if (createUserDto.role) {
      // 检查当前用户是否为管理员
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        throw new UnauthorizedException('没有权限设置用户角色');
      }
      role = createUserDto.role;
    }

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUser) {
      throw new ConflictException('用户名已被占用');
    }

    // 检查邮箱是否已经注册
    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingEmail) {
      throw new ConflictException('邮箱已注册');
    }

    // 密码加密
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    // 创建并保存用户
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role, // 使用处理后的角色
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const savedUser = await this.userRepository.save(user);

    // 剔除密码字段后返回
    const { password: _, ...result } = savedUser;
    return result;
  }
  async getUserById(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
