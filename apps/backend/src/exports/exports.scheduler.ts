import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExportsService } from './exports.service';

@Injectable()
export class ExportsScheduler {
  private readonly logger = new Logger(ExportsScheduler.name);

  constructor(private readonly exportsService: ExportsService) {}

  /** Run daily at 03:00 to clean up expired export files */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredExports() {
    this.logger.log('Running expired export cleanup');
    try {
      await this.exportsService.cleanupExpired();
    } catch (err) {
      this.logger.error({ err }, 'Export cleanup failed');
    }
  }
}
