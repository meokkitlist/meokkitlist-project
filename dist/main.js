"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
function parseOrigins() {
    const raw = process.env.CORS_ORIGIN?.trim();
    if (!raw) {
        return ['http://localhost:3000', 'http://localhost:3001'];
    }
    return raw.split(',').map((s) => s.trim());
}
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
    }));
    const origins = parseOrigins();
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (origin === 'http://localhost:3000' ||
                origin === 'http://localhost:3001') {
                return callback(null, true);
            }
            if (origins.includes(origin))
                return callback(null, true);
            const ok = origins.some((o) => o instanceof RegExp && o.test(origin));
            return ok ? callback(null, true) : callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Set-Cookie'],
    });
    const swaggerConfig = new swagger_1.DocumentBuilder()
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
    const swaggerDoc = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api-docs', app, swaggerDoc);
    const PORT = parseInt(process.env.APP_PORT ?? '3001', 10);
    await app.listen(PORT);
    logger.log(`🚀 Server is running on http://localhost:${PORT}`);
    logger.log(`📘 Swagger docs at http://localhost:${PORT}/api-docs`);
    logger.log(`🔐 CORS origins: ${Array.isArray(origins) ? origins.join(', ') : origins}`);
}
bootstrap();
//# sourceMappingURL=main.js.map