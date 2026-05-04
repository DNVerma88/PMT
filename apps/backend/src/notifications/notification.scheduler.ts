import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /** Run every day at 08:00 to check milestone due dates */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleMilestoneAlerts() {
    this.logger.log('Scheduled milestone alert check triggered');
    try {
      await this.notificationsService.checkMilestoneAlerts();
    } catch (err) {
      this.logger.error({ err }, 'Milestone alert check failed');
    }
  }
}
