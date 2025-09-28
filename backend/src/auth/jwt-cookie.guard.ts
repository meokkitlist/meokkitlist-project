import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(private cfg: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();

    // 쿠키 이름 통일 (기본값: Authentication)
    const cookieName = this.cfg.get('AUTH_COOKIE_NAME') ?? 'Authentication';

    // 1) 쿠키에서 먼저 찾고
    let token =
      req.cookies?.[cookieName] ?? req.signedCookies?.[cookieName];

    // 2) 없으면 Authorization: Bearer ...도 허용(스웨거나 테스트용)
    if (!token) {
      const h = req.headers['authorization'];
      if (h && h.startsWith('Bearer ')) token = h.slice(7);
    }

    if (!token) throw new UnauthorizedException('NO_TOKEN');

    const secret =
      this.cfg.get<string>('JWT_ACCESS_SECRET') ??
      this.cfg.get<string>('JWT_SECRET');
    if (!secret) throw new UnauthorizedException('JWT_SECRET_NOT_SET');

    try {
      const payload = jwt.verify(token, secret) as any;
      // 로그인에서 { sub, email }로 넣었으니 정규화
      (req as any).user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('INVALID_TOKEN');
    }
  }
}
