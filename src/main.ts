import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

function parseOrigins(): (string | RegExp)[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    // 기본값: 프론트(3000) + Swagger(3001) 둘 다 허용
    return ['http://localhost:3000', 'http://localhost:3001'];
  }
  return raw.split(',').map((s) => s.trim());
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1) Cookie 파서 (HttpOnly 쿠키 기반 인증)
  app.use(cookieParser());

  // 2) 글로벌 ValidationPipe (DTO 유효성 검사)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // 3) CORS 설정
  const origins = parseOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // curl/Postman 허용

      if (
        origin === 'http://localhost:3000' ||
        origin === 'http://localhost:3001'
      ) {
        return callback(null, true);
      }

      if (origins.includes(origin)) return callback(null, true);

      const ok = origins.some((o) => o instanceof RegExp && o.test(origin));
      return ok
        ? callback(null, true)
        : callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  });

  // 4) Swagger 문서
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MeokkitList API')
    .setDescription('API documentation for MeokkitList project')
    .setVersion('1.0')
    .addCookieAuth('token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'token',
      description: 'HttpOnly JWT token cookie (set by /auth/login)',
    })
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDoc);

  // 5) 서버 시작 (PORT 환경변수 우선)
  const PORT = parseInt(process.env.PORT ?? process.env.APP_PORT ?? '3001', 10);
  await app.listen(PORT, '0.0.0.0');

  logger.log(`🚀 Server is running on http://localhost:${PORT}`);
  logger.log(`📘 Swagger docs at http://localhost:${PORT}/api-docs`);
  logger.log(
    `🔐 CORS origins: ${Array.isArray(origins) ? origins.join(', ') : origins}`,
  );
}

bootstrap();
