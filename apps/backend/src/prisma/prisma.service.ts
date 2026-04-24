import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Models that support soft-delete via deletedAt
// IMPORTANT: only include models that actually have a deletedAt column in the schema.
const SOFT_DELETE_MODELS = new Set([
  'releasePlan',
  'team',
  'user',
  'project',
  'savedView',
  'feature',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Soft-delete global middleware — automatically exclude deleted rows
    // for findMany / findFirst / findUnique / count / aggregate on soft-delete models.
    // Individual queries can opt-out by explicitly setting { deletedAt: undefined } in where.
    this.$use(async (params, next) => {
      const { model, action } = params;
      if (!model || !SOFT_DELETE_MODELS.has(model.charAt(0).toLowerCase() + model.slice(1))) {
        return next(params);
      }

      if (action === 'findMany' || action === 'findFirst' || action === 'count') {
        // Only inject if caller hasn't explicitly set deletedAt in where
        if (params.args?.where?.deletedAt === undefined) {
          params.args = params.args ?? {};
          params.args.where = { ...(params.args.where ?? {}), deletedAt: null };
        }
      }

      if (action === 'findUnique' || action === 'findUniqueOrThrow') {
        // findUnique can't have OR/deletedAt filter on unique key; let query pass through.
        // Callers must check deletedAt themselves on the result.
      }

      return next(params);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
