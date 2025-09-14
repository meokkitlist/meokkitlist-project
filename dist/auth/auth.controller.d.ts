import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dto';
import { ConfigService } from '@nestjs/config';
export declare class AuthController {
    private auth;
    private cfg;
    constructor(auth: AuthService, cfg: ConfigService);
    signup(dto: SignupDto): Promise<string>;
    login(dto: LoginDto, res: Response): Promise<string>;
    me(res: Response): {
        email: any;
    };
    logout(res: Response): string;
}
