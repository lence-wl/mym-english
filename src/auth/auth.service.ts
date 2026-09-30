import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User,
  UserDocument,
  UserRole,
} from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt'; // 引入JWT服务
import { ConfigService } from '@nestjs/config'; // 导入
import { SequenceService } from '../common/sequence.service';

/** 对外返回的用户信息：已剔除密码，id 为数字 */
type PublicUser = Omit<User, 'password' | '_id'> & { id: number };

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService, // 注入JWT服务
    private configService: ConfigService, // 注入
    private readonly sequenceService: SequenceService,
  ) {}

  /** 文档转对外结构：剔除密码（_id -> id 由 schema 的 toObject 完成） */
  private toPublicUser(doc: UserDocument): PublicUser {
    const plain = doc.toObject() as unknown as Record<string, any>;
    delete plain.password;
    return plain as PublicUser;
  }

  /**
   * 验证用户身份（供Passport策略使用）
   * @param username 用户名
   * @param password 原始密码
   * @returns 验证通过的用户信息（不含密码）
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<PublicUser> {
    // 严格类型检查与基础校验
    if (!username?.trim() || !password?.trim()) {
      throw new BadRequestException('用户名和密码不能为空');
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException('用户名或密码格式错误');
    }

    // 查询用户（包含密码用于验证；password 在 schema 中默认不返回）
    const user = await this.userModel
      .findOne({ username, deletedAt: null })
      .select('+password');
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
    return this.toPublicUser(user);
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
  ): Promise<PublicUser> {
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
    const existingUser = await this.userModel.findOne({
      username: createUserDto.username,
      deletedAt: null,
    });
    if (existingUser) {
      throw new ConflictException('用户名已被占用');
    }

    // 检查邮箱是否已经注册
    const existingEmail = await this.userModel.findOne({
      email: createUserDto.email,
      deletedAt: null,
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

    // 创建并保存用户（id 沿用自增整数，与原 SQLite 主键语义一致）
    const user = new this.userModel({
      _id: await this.sequenceService.nextId('users'),
      ...createUserDto,
      password: hashedPassword,
      role, // 使用处理后的角色
    });
    const savedUser = await user.save();

    // 剔除密码字段后返回
    return this.toPublicUser(savedUser);
  }

  async getUserById(id: number): Promise<PublicUser> {
    const user = await this.userModel.findOne({ _id: id, deletedAt: null });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return this.toPublicUser(user);
  }
}