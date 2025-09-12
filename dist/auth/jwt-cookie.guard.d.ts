import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class JwtCookieGuard implements CanActivate {
    private cfg;
    constructor(cfg: ConfigService);
    canActivate(ctx: ExecutionContext): boolean;
}
