import { Module } from '@nestjs/common';
import { WsrService } from './wsr.service';
import { WsrController } from './wsr.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WsrController],
  providers: [WsrService],
  exports: [WsrService],
})
export class WsrModule {}
