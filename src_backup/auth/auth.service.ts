import { Injectable, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
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
  }

  async login(email: string, password: string) {
    if (!email || !password) throw new BadRequestException('MISSING_FIELDS');
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('INVALID_CREDENTIALS');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('INVALID_CREDENTIALS');
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      this.cfg.get<string>('JWT_ACCESS_SECRET')!,
      { expiresIn: this.cfg.get<string>('JWT_EXPIRES') || '15m' },
    );
    return { token, email: user.email };
  }
}
