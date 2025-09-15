import { Controller, Get, Query } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Controller('redis')
export class RedisController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get('ping')
  async ping(): Promise<string> {
    return await this.redis.ping(); // "PONG"
  }

  @Get('get')
  async get(@Query('key') key: string): Promise<any> {
    const value = await this.redis.get(key);
    try {
      return JSON.parse(value ?? 'null');
    } catch {
      return value;
    }
  }

  @Get('ttl')
  async ttl(@Query('key') key: string): Promise<number> {
    return await this.redis.ttl(key);
  }
}
