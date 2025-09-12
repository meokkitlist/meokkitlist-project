import { Redis } from 'ioredis';
export declare class RedisController {
    private readonly redis;
    constructor(redis: Redis);
    ping(): Promise<string>;
    get(key: string): Promise<any>;
    ttl(key: string): Promise<number>;
}
