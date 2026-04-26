import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

function validateRequiredEnv(configService: ConfigService): void {
  const required: { key: string; envVar: string }[] = [
    { key: 'jwt.secret',        envVar: 'JWT_SECRET' },
    { key: 'jwt.refreshSecret', envVar: 'JWT_REFRESH_SECRET' },
    { key: 'database.url',      envVar: 'DATABASE_URL' },
  ];

  const missing = required.filter(({ key }) => !configService.get(key));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.map((m) => m.envVar).join(', ')}`,
    );
  }
}

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProd ? ['log', 'error', 'warn'] : ['log', 'error', 'warn', 'debug'],
  });

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // Fail fast if required config is missing
  validateRequiredEnv(configService);

  const port    = configService.get<number>('port');
  const appName = configService.get<string>('appName');
  const corsOrigins = configService.get<string[]>('cors.origins');

  // Graceful shutdown on SIGTERM (required for Railway / Docker)
  app.enableShutdownHooks();

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger — only in non-production
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle(`${appName} API`)
      .setDescription('CobranzaPro SaaS - REST API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth',          'Authentication endpoints')
      .addTag('Companies',     'Company management')
      .addTag('Users',         'User management')
      .addTag('Clients',       'Client management')
      .addTag('Invoices',      'Invoice management')
      .addTag('Payments',      'Payment registration and management')
      .addTag('Notifications', 'Automated collection reminders')
      .addTag('Dashboard',     'KPI metrics and collection analytics')
      .addTag('Health',        'Service health check')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }

  // Listen on 0.0.0.0 — required for Railway and Docker
  await app.listen(port, '0.0.0.0');
  logger.log(`${appName} running on port ${port} [${process.env.NODE_ENV ?? 'development'}]`);
}

bootstrap();
