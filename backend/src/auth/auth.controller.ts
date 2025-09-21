import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dto';
import { JwtCookieGuard } from './jwt-cookie.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cfg: ConfigService,
  ) {}

  // ✅ 쿠키 설정 함수 (중복 제거)
  private setAuthCookie(res: Response, token: string) {
    res.cookie('Authentication', token, {
      httpOnly: true,
      secure: this.cfg.get('NODE_ENV') === 'production',
      sameSite: 'none', // ✅ 크로스사이트 인증 허용
      domain: this.cfg.get('COOKIE_DOMAIN') || undefined,
      maxAge: 1000 * 60 * 15, // 15분
      path: '/',
    });
  }

  private clearAuthCookie(res: Response) {
    res.clearCookie('Authentication', {
      httpOnly: true,
      secure: this.cfg.get('NODE_ENV') === 'production',
      sameSite: 'none',
      domain: this.cfg.get('COOKIE_DOMAIN') || undefined,
      path: '/',
    });
  }

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    await this.auth.signup(dto.email, dto.password);
    return { message: '회원가입 완료' };
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token } = await this.auth.login(dto.email, dto.password);
    this.setAuthCookie(res, token);
    return { message: '로그인 성공' };
  }

  @UseGuards(JwtCookieGuard)
  @Get('me')
  me(@Req() req: Request) {
    return { email: (req as any).user?.email }; // 🔐 req.user는 guard에서 주입됨
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookie(res);
    return { message: '로그아웃 완료' };
  }
}
