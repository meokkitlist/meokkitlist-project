import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

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

  // 3) CORS 설정 (🔥 전부 허용)
  app.enableCors({
    origin: '*', // 모든 오리진 허용
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  });

  // 4) Swagger 문서
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MeokkitList API')
    .setDescription('API documentation for MeokkitList project')
    .setVersion('1.0')
    .addServer('http://localhost:3001', 'Local server') // ✅ 로컬 서버
    .addServer('https://meokkitlist-project.onrender.com', 'Render server') // ✅ Render 배포 서버
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
  const PORT = parseInt(
    process.env.PORT ?? process.env.APP_PORT ?? '3001',
    10,
  );
  await app.listen(PORT, '0.0.0.0');

  logger.log(`🚀 Server is running on http://localhost:${PORT}`);
  logger.log(`📘 Swagger docs at http://localhost:${PORT}/api-docs`);
  logger.log(`🔐 Allowed CORS origins: * (all origins allowed)`);
}

bootstrap();
