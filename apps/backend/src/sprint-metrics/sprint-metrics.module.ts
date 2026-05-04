import { Module } from '@nestjs/common';
import { SprintMetricsService } from './sprint-metrics.service';
import { SprintMetricsController } from './sprint-metrics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SprintMetricsController],
  providers: [SprintMetricsService],
  exports: [SprintMetricsService],
})
export class SprintMetricsModule {}
