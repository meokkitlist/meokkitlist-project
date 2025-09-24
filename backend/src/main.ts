import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

/**
 * 기본 허용 오리진(환경변수 미설정 시 사용)
 * - 운영: Vercel 배포 주소
 * - 로컬 개발: 주요 포트
 * - 필요에 따라 추가하세요.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'https://meokkitlist-project.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4200',
];

/** CORS_ORIGIN 환경변수 파싱 (쉼표 구분) */
function getAllowedOriginsFromEnv(): string[] | null {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return null;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 간단한 와일드카드(*.domain.com) 패턴 → RegExp 변환 */
function patternToRegex(pattern: string): RegExp {
  const trimmed = pattern.replace(/\/+$/, ''); // 트레일링 슬래시 제거
  const escaped = trimmed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

/** origin 검사 함수 생성 */
function buildOriginChecker(allowedOrigins: string[]) {
  const regexes = allowedOrigins.map(patternToRegex);

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // 서버에서 직접 호출/Swagger UI 등 Origin 헤더 없음 → 허용
    if (!origin) return callback(null, true);

    const allowed = regexes.some((re) => re.test(origin));
    if (allowed) return callback(null, true);

    // 차단 + 로그
    const err = new Error(`Blocked by CORS. Origin not allowed: ${origin}`);
    return callback(err, false);
  };
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1) Cookie 파서
  app.use(cookieParser());

  // 2) 글로벌 ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // 3) CORS 설정
  const allowedFromEnv = getAllowedOriginsFromEnv();
  const allowedOrigins = allowedFromEnv ?? DEFAULT_ALLOWED_ORIGINS;
  app.enableCors({
    origin: buildOriginChecker(allowedOrigins),
    credentials: true, // 쿠키/인증정보 포함 요청 허용
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  });

  // 4) Swagger 문서
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MeokkitList API')
    .setDescription('API documentation for MeokkitList project')
    .setVersion('1.0')
    .addCookieAuth('Authentication', {
      type: 'apiKey',
      in: 'cookie',
      name: 'Authentication',
      description: 'HttpOnly JWT token cookie (set by /auth/login)',
    })
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDoc);

  // 5) 서버 시작
  const PORT = parseInt(process.env.PORT ?? process.env.APP_PORT ?? '3001', 10);
  await app.listen(PORT, '0.0.0.0');

  logger.log(`🚀 Server is running on http://localhost:${PORT}`);
  logger.log(`📘 Swagger docs at http://localhost:${PORT}/api-docs`);
  logger.log(
    `🔐 Allowed CORS origins: ${(allowedOrigins || []).join(', ')}${allowedFromEnv ? ' (from env)' : ' (default)'}`
  );
}

bootstrap();
