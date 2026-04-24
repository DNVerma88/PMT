import { Module } from '@nestjs/common';
import { ProductivityService } from './productivity.service';
import { ProductivityController } from './productivity.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductivityController],
  providers: [ProductivityService],
  exports: [ProductivityService],
})
export class ProductivityModule {}
