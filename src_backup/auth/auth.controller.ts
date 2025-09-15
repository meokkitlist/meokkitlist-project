import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dto';
import { JwtCookieGuard } from './jwt-cookie.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private cfg: ConfigService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    await this.auth.signup(dto.email, dto.password);
    return '회원가입 완료';
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token } = await this.auth.login(dto.email, dto.password);
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cfg.get('NODE_ENV') === 'production',
      domain: this.cfg.get('COOKIE_DOMAIN') || undefined,
      maxAge: 1000 * 60 * 15, // 15분
      path: '/',
    });
    return '로그인 성공';
  }

  @UseGuards(JwtCookieGuard)
  @Get('me')
  me(@Res({ passthrough: true }) res: Response) {
    const req: any = (res as any).req;
    return { email: req.user.email };
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cfg.get('NODE_ENV') === 'production',
      domain: this.cfg.get('COOKIE_DOMAIN') || undefined,
      path: '/',
    });
    return '로그아웃 완료';
  }
}
