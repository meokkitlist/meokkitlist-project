// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

function parseOrigins() {
  // ENV: CORS_ORIGIN="https://meokkitlist-project.vercel.app,http://localhost:3000,http://localhost:3001"
  const raw = process.env.CORS_ORIGIN ?? '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ✅ 프록시(Load balancer) 뒤의 secure 쿠키 신뢰
  (app.getHttpAdapter().getInstance() as import('express').Express).set('trust proxy', 1);

  // ✅ CORS: 허용 오리진을 명시 ( * 금지 )
  const allowedOrigins = parseOrigins();
  app.enableCors({
    origin: (origin, cb) => {
      // Swagger 같은 non-browser/curl은 origin 없을 수 있음 → 허용
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Origin','X-Requested-With','Content-Type','Accept','Authorization'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MeokkitList API')
    .setDescription('API documentation for MeokkitList project')
    .setVersion('1.0')
    .addServer('http://localhost:3001', 'Local server')
    .addServer('https://meokkitlist-project.onrender.com', 'Render server')
    .addCookieAuth('Authentication', {
      type: 'apiKey',
      in: 'cookie',
      name: 'Authentication',
      description: 'HttpOnly JWT token cookie (set by /auth/login)',
    })
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDoc);

  const PORT = parseInt(process.env.PORT ?? process.env.APP_PORT ?? '3001', 10);
  await app.listen(PORT, '0.0.0.0');
  logger.log(`🚀 http://localhost:${PORT}`);
}
bootstrap();
