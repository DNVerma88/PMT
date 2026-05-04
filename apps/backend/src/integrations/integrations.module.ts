import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { AdapterRegistry } from './adapters/adapter-registry';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, AdapterRegistry],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
