import { Module } from '@nestjs/common';
import { HeadcountService } from './headcount.service';
import { HeadcountController } from './headcount.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HeadcountController],
  providers: [HeadcountService],
  exports: [HeadcountService],
})
export class HeadcountModule {}
