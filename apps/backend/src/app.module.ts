import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import configuration from './common/config/configuration';
import { validationSchema } from './common/config/env.validation';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ReleaseCadenceModule } from './release-cadence/release-cadence.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { ProductivityModule } from './productivity/productivity.module';
import { HeadcountModule } from './headcount/headcount.module';
import { SavedViewsModule } from './saved-views/saved-views.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProjectsModule } from './projects/projects.module';
import { HealthModule } from './health/health.module';
import { FeaturesModule } from './features/features.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExportsModule } from './exports/exports.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    // ── Config (global) ──────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: false },
      // Allow .env files only in non-production; production uses env from OS/secret store
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),

    // ── Scheduled tasks ──────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Structured logging ────────────────────────────────────────────────────
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('nodeEnv') === 'production' ? 'info' : 'debug',
          transport:
            config.get<string>('nodeEnv') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true, singleLine: false } }
              : undefined,
          // Redact sensitive fields from request logs
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.passwordHash',
            'req.body.currentPassword',
          ],
          serializers: {
            req(req: Record<string, unknown>) {
              // Exclude large request bodies from logs in production
              return { method: req.method, url: req.url, correlationId: req.id };
            },
          },
        },
      }),
    }),

    // ── Rate limiting ─────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('throttle.ttl')! * 1000,
          limit: config.get<number>('throttle.limit')!,
        },
        {
          // Tighter limit for auth endpoints — 10 attempts / minute
          name: 'auth',
          ttl: 60_000,
          limit: 10,
        },
      ],
    }),

    // ── Core modules ─────────────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ReleaseCadenceModule,
    RoadmapModule,
    ProductivityModule,
    HeadcountModule,
    SavedViewsModule,
    DashboardModule,
    ProjectsModule,
    HealthModule,
    FeaturesModule,
    NotificationsModule,
    ExportsModule,
    PortfolioModule,
    IntegrationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Correlation ID on every request
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');

    // CSRF validation on all mutating requests
    // CsrfMiddleware internally skips GET/HEAD/OPTIONS and the /csrf endpoint
    consumer
      .apply(CsrfMiddleware)
      .exclude(
        { path: 'api/v1/auth/csrf', method: RequestMethod.GET },
        { path: 'api/(.*)/health', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
