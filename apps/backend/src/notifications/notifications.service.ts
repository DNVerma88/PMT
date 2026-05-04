import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { UpdatePreferencesDto } from './dto/notification.dto';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailer: Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    if (this.config.get<boolean>('smtp.enabled')) {
      this.mailer = nodemailer.createTransport({
        host: this.config.get<string>('smtp.host'),
        port: this.config.get<number>('smtp.port'),
        auth: {
          user: this.config.get<string>('smtp.user'),
          pass: this.config.get<string>('smtp.pass'),
        },
      });
    }
  }

  // ─── Create a notification for a user ──────────────────────────────────────

  async createForUser(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    const pref = await this.getOrCreatePreference(params.userId);

    // Check per-type preference
    if (!this.isTypeEnabled(pref, params.type)) return;
    if (!pref.inAppEnabled && !pref.emailEnabled) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
      },
    });

    // Send email if enabled
    if (pref.emailEnabled && this.mailer) {
      await this.sendEmail(params.userId, params.title, params.message).catch((err) =>
        this.logger.error({ err }, 'Failed to send notification email'),
      );
    }

    return notification;
  }

  // ─── Notify all members of a project ───────────────────────────────────────

  async createForProjectMembers(
    projectId: string,
    params: Omit<Parameters<typeof this.createForUser>[0], 'userId'>,
  ) {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });
    await Promise.all(
      members.map((m) => this.createForUser({ ...params, userId: m.userId })),
    );
  }

  // ─── List notifications for a user ─────────────────────────────────────────

  async findAll(userId: string, onlyUnread?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  // ─── Mark read ──────────────────────────────────────────────────────────────

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({ where: { id, userId } });
  }

  // ─── Preferences ────────────────────────────────────────────────────────────

  async getPreference(userId: string) {
    return this.getOrCreatePreference(userId);
  }

  async updatePreference(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  // ─── Scheduler: check milestone due dates ──────────────────────────────────

  async checkMilestoneAlerts() {
    this.logger.log('Running milestone notification check');

    // Collect all user preferences with inApp or email enabled
    const prefs = await this.prisma.notificationPreference.findMany({
      where: {
        OR: [{ inAppEnabled: true }, { emailEnabled: true }],
        notifyMilestoneDue: true,
      },
    });

    if (prefs.length === 0) return;

    // Global defaults for users with no preference row (assume defaults)
    const defaultLeadDays = 3;
    const maxLeadDays = Math.max(...prefs.map((p) => p.milestoneDueSoonDays), defaultLeadDays);

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() + maxLeadDays);

    // Find upcoming milestones not yet completed
    const upcoming = await this.prisma.releaseMilestone.findMany({
      where: {
        plannedDate: { gte: now, lte: cutoff },
        status: { notIn: ['COMPLETED', 'SKIPPED'] },
      },
      include: {
        releasePlan: {
          select: {
            id: true,
            name: true,
            version: true,
            projectId: true,
          },
        },
      },
    });

    for (const milestone of upcoming) {
      if (!milestone.releasePlan.projectId) continue;

      const daysUntil = Math.ceil(
        (milestone.plannedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const members = await this.prisma.projectMember.findMany({
        where: { projectId: milestone.releasePlan.projectId },
        select: { userId: true },
      });

      for (const member of members) {
        const pref = prefs.find((p) => p.userId === member.userId);
        const leadDays = pref?.milestoneDueSoonDays ?? defaultLeadDays;

        if (daysUntil > leadDays) continue;
        if (pref && !pref.notifyMilestoneDue) continue;

        // Deduplicate: don't re-notify if already sent today
        const existing = await this.prisma.notification.findFirst({
          where: {
            userId: member.userId,
            type: 'MILESTONE_DUE_SOON',
            resourceId: milestone.id,
            createdAt: { gte: new Date(now.toDateString()) },
          },
        });
        if (existing) continue;

        await this.createForUser({
          userId: member.userId,
          type: NotificationType.MILESTONE_DUE_SOON,
          title: `Milestone Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
          message: `${milestone.type.replace(/_/g, ' ')} for ${milestone.releasePlan.name} v${milestone.releasePlan.version} is due on ${milestone.plannedDate.toLocaleDateString()}.`,
          resourceType: 'release_milestone',
          resourceId: milestone.id,
        });
      }
    }

    // Overdue milestones
    const overdue = await this.prisma.releaseMilestone.findMany({
      where: {
        plannedDate: { lt: now },
        status: { notIn: ['COMPLETED', 'SKIPPED', 'DELAYED'] },
      },
      include: {
        releasePlan: {
          select: { id: true, name: true, version: true, projectId: true },
        },
      },
    });

    for (const milestone of overdue) {
      if (!milestone.releasePlan.projectId) continue;

      const members = await this.prisma.projectMember.findMany({
        where: { projectId: milestone.releasePlan.projectId },
        select: { userId: true },
      });

      for (const member of members) {
        const pref = prefs.find((p) => p.userId === member.userId);
        if (pref && !pref.notifyMilestoneOverdue) continue;

        const existing = await this.prisma.notification.findFirst({
          where: {
            userId: member.userId,
            type: 'MILESTONE_OVERDUE',
            resourceId: milestone.id,
            createdAt: { gte: new Date(now.toDateString()) },
          },
        });
        if (existing) continue;

        await this.createForUser({
          userId: member.userId,
          type: NotificationType.MILESTONE_OVERDUE,
          title: 'Milestone Overdue',
          message: `${milestone.type.replace(/_/g, ' ')} for ${milestone.releasePlan.name} v${milestone.releasePlan.version} was due on ${milestone.plannedDate.toLocaleDateString()} and is not yet complete.`,
          resourceType: 'release_milestone',
          resourceId: milestone.id,
        });
      }
    }
  }

  // ─── Domain event handlers (called from other services) ─────────────────────

  async onReleaseStatusChanged(
    releasePlanId: string,
    releaseName: string,
    releaseVersion: string,
    projectId: string | null,
    newStatus: string,
  ) {
    if (!projectId) return;
    if (newStatus !== 'DELAYED' && newStatus !== 'AT_RISK') return;

    await this.createForProjectMembers(projectId, {
      type: NotificationType.RELEASE_STATUS_CHANGED,
      title: `Release ${newStatus === 'DELAYED' ? 'Delayed' : 'At Risk'}`,
      message: `${releaseName} v${releaseVersion} has been marked as ${newStatus.replace('_', ' ').toLowerCase()}.`,
      resourceType: 'release_plan',
      resourceId: releasePlanId,
    });
  }

  async onMilestoneStatusChanged(
    milestoneId: string,
    milestoneType: string,
    releaseName: string,
    releaseVersion: string,
    projectId: string | null,
    newStatus: string,
  ) {
    if (!projectId) return;

    await this.createForProjectMembers(projectId, {
      type: NotificationType.MILESTONE_STATUS_CHANGED,
      title: 'Milestone Status Updated',
      message: `${milestoneType.replace(/_/g, ' ')} for ${releaseName} v${releaseVersion} is now ${newStatus.replace(/_/g, ' ').toLowerCase()}.`,
      resourceType: 'release_milestone',
      resourceId: milestoneId,
    });
  }

  async onMemberAdded(userId: string, projectName: string, projectId: string) {
    await this.createForUser({
      userId,
      type: NotificationType.MEMBER_ADDED,
      title: 'Added to Project',
      message: `You have been added to the project "${projectName}".`,
      resourceType: 'project',
      resourceId: projectId,
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getOrCreatePreference(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  private isTypeEnabled(
    pref: { notifyMilestoneDue: boolean; notifyMilestoneOverdue: boolean; notifyReleaseStatus: boolean; notifyMemberAdded: boolean },
    type: NotificationType,
  ): boolean {
    switch (type) {
      case NotificationType.MILESTONE_DUE_SOON: return pref.notifyMilestoneDue;
      case NotificationType.MILESTONE_OVERDUE: return pref.notifyMilestoneOverdue;
      case NotificationType.RELEASE_STATUS_CHANGED: return pref.notifyReleaseStatus;
      case NotificationType.MILESTONE_STATUS_CHANGED: return pref.notifyReleaseStatus;
      case NotificationType.MEMBER_ADDED: return pref.notifyMemberAdded;
      default: return true;
    }
  }

  private async sendEmail(userId: string, subject: string, text: string) {
    if (!this.mailer) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) return;

    await this.mailer.sendMail({
      from: this.config.get<string>('smtp.from'),
      to: user.email,
      subject: `[PMT] ${subject}`,
      text,
    });
  }
}
