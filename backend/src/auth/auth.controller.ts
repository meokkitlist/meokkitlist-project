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

  // ✅ 공통 쿠키 세팅
  private setAuthCookie(res: Response, token: string) {
    const isProd = this.cfg.get('NODE_ENV') === 'production';
    res.cookie('Authentication', token, {
      httpOnly: true,
      secure: isProd, // HTTPS 환경(Render)에서는 true
      sameSite: isProd ? 'none' : 'lax', // Vercel(프론트) ↔ Render(백엔드) 교차 허용
      // ❌ domain 제거 → 자동으로 현재 서버 도메인(onrender.com)에 설정됨
      maxAge: 1000 * 60 * 60 * 2, // 2시간
      path: '/',
    });
  }

  // ✅ 로그아웃 시 쿠키 제거
  private clearAuthCookie(res: Response) {
    const isProd = this.cfg.get('NODE_ENV') === 'production';
    res.clearCookie('Authentication', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      // ❌ domain 제거
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
    // 👉 Swagger 디버깅 편의를 위해 token도 같이 반환
    return { message: '로그인 성공', token };
  }

  @UseGuards(JwtCookieGuard)
  @Get('me')
  me(@Req() req: Request) {
    return { email: (req as any).user?.email };
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookie(res);
    return { message: '로그아웃 완료' };
  }
}
