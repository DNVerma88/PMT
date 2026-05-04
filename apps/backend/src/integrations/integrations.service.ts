import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterRegistry } from './adapters/adapter-registry';
import {
  CreateIntegrationDto,
  SaveCredentialsDto,
  UpdateIntegrationDto,
  UpsertFieldMapDto,
} from './dto/integration.dto';

const ALGO = 'aes-256-gcm';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly encKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly registry: AdapterRegistry,
  ) {
    const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY ?? '';
    if (keyHex.length === 64) {
      this.encKey = Buffer.from(keyHex, 'hex');
    } else {
      // Derive a key from a fallback secret — acceptable for dev; production must set INTEGRATION_ENCRYPTION_KEY
      const secret = process.env.INTEGRATION_ENCRYPTION_KEY ?? 'CHANGE_ME_32BYTES_EXACTLY_HERE!!';
      this.encKey = Buffer.alloc(32);
      Buffer.from(secret).copy(this.encKey);
    }
  }

  // ─── Encryption helpers ──────────────────────────────────────────────────────

  private encrypt(plain: string): { cipher: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      cipher: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  private decrypt(cipherHex: string, ivHex: string, tagHex: string): string {
    const decipher = crypto.createDecipheriv(ALGO, this.encKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateIntegrationDto, createdBy: string) {
    return this.prisma.integrationConnection.create({
      data: {
        projectId: dto.projectId,
        provider: dto.provider as any,
        label: dto.label,
        baseUrl: dto.baseUrl,
        syncDirection: dto.syncDirection as any,
        config: dto.config ?? {},
        createdBy,
      },
      select: this.safeSelect(),
    });
  }

  async findAll(projectId?: string) {
    return this.prisma.integrationConnection.findMany({
      where: {
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
      },
      select: this.safeSelect(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const conn = await this.prisma.integrationConnection.findFirst({
      where: { id, deletedAt: null },
      include: { fieldMaps: true },
    });
    if (!conn) throw new NotFoundException('Integration not found');
    // Strip credential fields from response
    const { credentialsCipher, credentialsIv, credentialsTag, ...safe } = conn;
    return safe;
  }

  async update(id: string, dto: UpdateIntegrationDto) {
    await this.assertExists(id);
    return this.prisma.integrationConnection.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.baseUrl !== undefined && { baseUrl: dto.baseUrl }),
        ...(dto.syncDirection !== undefined && { syncDirection: dto.syncDirection as any }),
        ...(dto.config !== undefined && { config: dto.config }),
      },
      select: this.safeSelect(),
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.integrationConnection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Credentials ─────────────────────────────────────────────────────────────

  async saveCredentials(id: string, dto: SaveCredentialsDto) {
    await this.assertExists(id);
    const plain = JSON.stringify(dto.credentials);
    const { cipher, iv, tag } = this.encrypt(plain);
    await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        credentialsCipher: cipher,
        credentialsIv: iv,
        credentialsTag: tag,
        status: 'PENDING_AUTH',
        errorMsg: null,
      },
    });
    return { message: 'Credentials saved. Use /test to validate them.' };
  }

  private async getCredentials(id: string): Promise<Record<string, string>> {
    const conn = await this.prisma.integrationConnection.findUnique({
      where: { id },
      select: { credentialsCipher: true, credentialsIv: true, credentialsTag: true },
    });
    if (!conn?.credentialsCipher) throw new BadRequestException('No credentials saved for this connection');
    const plain = this.decrypt(conn.credentialsCipher, conn.credentialsIv!, conn.credentialsTag!);
    return JSON.parse(plain);
  }

  // ─── Test connection ─────────────────────────────────────────────────────────

  async testConnection(id: string) {
    const conn = await this.prisma.integrationConnection.findFirst({ where: { id, deletedAt: null } });
    if (!conn) throw new NotFoundException('Integration not found');

    const credentials = await this.getCredentials(id);
    const adapter = this.registry.get(conn.provider);

    try {
      await adapter.validateCredentials(credentials, { ...((conn.config as any) ?? {}), baseUrl: conn.baseUrl ?? undefined });
      await this.prisma.integrationConnection.update({
        where: { id },
        data: { status: 'ACTIVE', errorMsg: null },
      });
      return { success: true, message: 'Credentials validated successfully' };
    } catch (err) {
      await this.prisma.integrationConnection.update({
        where: { id },
        data: { status: 'ERROR', errorMsg: String(err) },
      });
      throw new BadRequestException(`Credential validation failed: ${String(err)}`);
    }
  }

  // ─── Manual sync ─────────────────────────────────────────────────────────────

  async triggerSync(connectionId: string): Promise<{ syncLogId: string }> {
    const conn = await this.prisma.integrationConnection.findFirst({
      where: { id: connectionId, deletedAt: null, status: 'ACTIVE' },
    });
    if (!conn) throw new NotFoundException('Active integration connection not found');

    const log = await this.prisma.integrationSyncLog.create({
      data: { connectionId, status: 'RUNNING', startedAt: new Date() },
    });

    // Run asynchronously
    this.runSync(connectionId, log.id).catch((err) =>
      this.logger.error({ err, connectionId, syncLogId: log.id }, 'Sync run failed'),
    );

    return { syncLogId: log.id };
  }

  private async runSync(connectionId: string, logId: string) {
    const start = Date.now();
    try {
      const conn = await this.prisma.integrationConnection.findUniqueOrThrow({ where: { id: connectionId } });
      const credentials = await this.getCredentials(connectionId);
      const adapter = this.registry.get(conn.provider);
      const result = await adapter.fetchItems(credentials, {
        ...((conn.config as any) ?? {}),
        baseUrl: conn.baseUrl ?? undefined,
      });

      await this.prisma.integrationSyncLog.update({
        where: { id: logId },
        data: {
          status: 'SUCCESS',
          itemsSynced: result.items.length,
          itemsFailed: 0,
          details: result.items.slice(0, 20) as any,
          durationMs: Date.now() - start,
          finishedAt: new Date(),
        },
      });

      await this.prisma.integrationConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date(), errorMsg: null },
      });
    } catch (err) {
      await this.prisma.integrationSyncLog.update({
        where: { id: logId },
        data: {
          status: 'FAILED',
          errorMsg: String(err),
          durationMs: Date.now() - start,
          finishedAt: new Date(),
        },
      });
      await this.prisma.integrationConnection.update({
        where: { id: connectionId },
        data: { status: 'ERROR', errorMsg: String(err) },
      });
    }
  }

  // ─── Sync logs ───────────────────────────────────────────────────────────────

  async getSyncLogs(connectionId: string) {
    await this.assertExists(connectionId);
    return this.prisma.integrationSyncLog.findMany({
      where: { connectionId },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        itemsSynced: true,
        itemsFailed: true,
        durationMs: true,
        errorMsg: true,
        startedAt: true,
        finishedAt: true,
      },
    });
  }

  // ─── Field maps ──────────────────────────────────────────────────────────────

  async upsertFieldMap(connectionId: string, dto: UpsertFieldMapDto) {
    await this.assertExists(connectionId);
    return this.prisma.integrationFieldMap.upsert({
      where: { connectionId_pmtField: { connectionId, pmtField: dto.pmtField } },
      create: { connectionId, pmtField: dto.pmtField, externalField: dto.externalField, transform: dto.transform },
      update: { externalField: dto.externalField, transform: dto.transform },
    });
  }

  async deleteFieldMap(connectionId: string, pmtField: string) {
    await this.prisma.integrationFieldMap.deleteMany({ where: { connectionId, pmtField } });
  }

  // ─── Available providers ─────────────────────────────────────────────────────

  listProviders() {
    return this.registry.listProviders();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async assertExists(id: string) {
    const count = await this.prisma.integrationConnection.count({ where: { id, deletedAt: null } });
    if (!count) throw new NotFoundException('Integration not found');
  }

  /** Returns a field selection that never exposes credential fields */
  private safeSelect() {
    return {
      id: true,
      projectId: true,
      provider: true,
      label: true,
      baseUrl: true,
      status: true,
      syncDirection: true,
      config: true,
      lastSyncAt: true,
      errorMsg: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
    };
  }
}
