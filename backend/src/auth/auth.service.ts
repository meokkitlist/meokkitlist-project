import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private cfg: ConfigService,
  ) {}

  async signup(email: string, password: string) {
    if (!email || !password) throw new BadRequestException('MISSING_FIELDS');
    const exists = await this.users.findOne({ where: { email } });
    if (exists) throw new ConflictException('EMAIL_EXISTS');
    const passwordHash = await bcrypt.hash(password, 12);
    await this.users.save(this.users.create({ email, passwordHash }));
    // 굳이 리턴 없어도 되지만 응답 안정성을 위해 메시지 반환해도 OK
    return { message: 'SIGNUP_OK' };
  }

  async login(email: string, password: string) {
    if (!email || !password) throw new BadRequestException('MISSING_FIELDS');

    const user = await this.users.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('INVALID_CREDENTIALS');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('INVALID_CREDENTIALS');

    // ✅ JWT 시크릿: ACCESS 우선, 없으면 JWT_SECRET 폴백
    const secret =
      this.cfg.get<string>('JWT_ACCESS_SECRET') ??
      this.cfg.get<string>('JWT_SECRET');

    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET_NOT_SET');
    }

    const expiresIn = this.cfg.get<string>('JWT_EXPIRES') ?? '15m';

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      secret,
      { expiresIn },
    );

    return { token, email: user.email };
  }
}
