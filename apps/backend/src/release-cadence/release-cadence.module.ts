import { Module } from '@nestjs/common';
import { ReleaseCadenceService } from './release-cadence.service';
import { ReleaseCadenceController } from './release-cadence.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ReleaseCadenceController],
  providers: [ReleaseCadenceService],
  exports: [ReleaseCadenceService],
})
export class ReleaseCadenceModule {}
