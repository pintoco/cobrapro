import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';

// Nuevos módulos
import { AuditModule } from './audit/audit.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { CollectionNotesModule } from './collection-notes/collection-notes.module';
import { ImportModule } from './import/import.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { AdminModule } from './admin/admin.module';

import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Rate limiting: 100 requests por 60 segundos por IP
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 100 },
    ]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
      }),
    }),
    PrismaModule,
    // Módulos @Global() primero
    AuditModule,
    SubscriptionsModule,
    // Módulos de negocio
    AuthModule,
    CompaniesModule,
    UsersModule,
    ClientsModule,
    InvoicesModule,
    PaymentsModule,
    NotificationsModule,
    DashboardModule,
    HealthModule,
    // Nuevas fases
    CollectionNotesModule,
    ImportModule,
    WhatsAppModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Rate limiting como guard global (después de JWT)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
