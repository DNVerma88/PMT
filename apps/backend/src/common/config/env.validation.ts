import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  COOKIE_SECRET: Joi.string().min(32).required(),

  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),
  RATE_LIMIT_AUTH_MAX: Joi.number().default(10),

  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),

  SMTP_ENABLED: Joi.string().valid('true', 'false').default('false'),
  SMTP_HOST: Joi.string().default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().default(''),
  SMTP_PASS: Joi.string().default(''),
  SMTP_FROM: Joi.string().default('noreply@pmt.local'),

  // Integration encryption key — 64-char hex (= 32-byte AES-256 key)
  INTEGRATION_ENCRYPTION_KEY: Joi.string().default(''),
  EXPORT_STORAGE_PATH: Joi.string().default(''),
});
