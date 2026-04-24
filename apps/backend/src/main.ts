import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: true,
  });

  // ─── Graceful shutdown ───────────────────────────────────────────────────────
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const isProduction = config.get<string>('nodeEnv') === 'production';
  const corsOrigin = config.get<string>('cors.origin')!;

  // ─── Request body size limit (10 KB default, prevents large payload DoS) ────
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));

  // ─── Gzip compression ────────────────────────────────────────────────────────
  app.use(compression());

  // ─── Structured logger ───────────────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ─── Security headers via Helmet ────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // MUI/Emotion requires this; replace with nonce in prod
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    }),
  );

  // Additional OWASP headers not covered by helmet defaults
  // Note: X-Content-Type-Options is already set by helmet's noSniff option above.
  app.use((_req: any, res: any, next: any) => {
    // Restrict browser feature access
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), ' +
      'interest-cohort=(), accelerometer=(), gyroscope=(), magnetometer=()',
    );
    // Prevent browsers from pre-fetching DNS for links in the page
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    // Default cache policy for API responses — override per-route where needed
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  // ─── Cookie parsing ──────────────────────────────────────────────────────────
  app.use(cookieParser(config.get<string>('cookie.secret')));

  // ─── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
  });

  // ─── API versioning ──────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  // ─── Global validation pipe ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: isProduction,
      stopAtFirstError: false,
    }),
  );

  // ─── Global guards (secure by default) ──────────────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
    new PermissionsGuard(reflector),
  );

  // ─── Global exception filter ─────────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter(isProduction));

  // ─── OpenAPI / Swagger ────────────────────────────────────────────────────────
  if (config.get<string>('swagger.enabled') !== 'false') {
    const swaggerDoc = new DocumentBuilder()
      .setTitle('PMT API')
      .setDescription('Project Management Tool – REST API v1')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerDoc);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Application running on http://localhost:${port}/api/v1`);
  if (config.get<string>('swagger.enabled') !== 'false') {
    logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
