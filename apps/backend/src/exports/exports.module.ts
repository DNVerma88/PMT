import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { ExportsScheduler } from './exports.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExportsController],
  providers: [ExportsService, ExportsScheduler],
  exports: [ExportsService],
})
export class ExportsModule {}
