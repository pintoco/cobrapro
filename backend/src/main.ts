import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
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
      `Variables de entorno faltantes: ${missing.map((m) => m.envVar).join(', ')}`,
    );
  }
}

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProd ? ['log', 'error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  validateRequiredEnv(configService);

  const port    = configService.get<number>('port');
  const appName = configService.get<string>('appName');
  const corsOrigins = configService.get<string[]>('cors.origins');

  // Graceful shutdown
  app.enableShutdownHooks();

  // Helmet — seguridad HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: isProd,
      crossOriginEmbedderPolicy: false, // Necesario para Swagger en dev
    }),
  );

  // Prefijo global
  app.setGlobalPrefix('api/v1');

  // CORS estricto
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (curl, Postman, mobile)
      if (!origin) return callback(null, true);
      if (!corsOrigins || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: origin "${origin}" not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    credentials: true,
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger — solo en no-producción
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle(`${appName} API`)
      .setDescription('CobranzaPro SaaS Chile — Documentación REST API')
      .setVersion('2.0')
      .addBearerAuth()
      .addTag('Auth',            'Autenticación')
      .addTag('Companies',       'Gestión de empresas')
      .addTag('Users',           'Gestión de usuarios')
      .addTag('Clients',         'Gestión de clientes')
      .addTag('Invoices',        'Gestión de facturas')
      .addTag('Payments',        'Registro de pagos')
      .addTag('Notifications',   'Recordatorios automáticos')
      .addTag('CollectionNotes', 'Notas internas de cobranza')
      .addTag('Subscriptions',   'Planes y suscripciones SaaS')
      .addTag('Import',          'Importación masiva Excel')
      .addTag('WhatsApp',        'Integración WhatsApp Business')
      .addTag('Admin',           'Panel Super Admin')
      .addTag('Audit',           'Logs de auditoría')
      .addTag('Dashboard',       'KPIs y analytics')
      .addTag('Health',          'Health check')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log(`Swagger: http://localhost:${port}/api/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`${appName} iniciado en puerto ${port} [${process.env.NODE_ENV ?? 'development'}]`);
}

bootstrap();
