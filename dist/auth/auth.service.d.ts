import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
export declare class AuthService {
    private users;
    private cfg;
    constructor(users: Repository<User>, cfg: ConfigService);
    signup(email: string, password: string): Promise<void>;
    login(email: string, password: string): Promise<{
        token: any;
        email: string;
    }>;
}
