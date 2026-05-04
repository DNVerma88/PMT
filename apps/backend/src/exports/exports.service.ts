import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExportDto, ExportReportType, ExportFormatDto } from './dto/create-export.dto';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);
  private readonly exportDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.exportDir = process.env.EXPORT_STORAGE_PATH ?? path.join(os.tmpdir(), 'pmt-exports');
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  // ─── Create export job and generate synchronously ───────────────────────────

  async createExport(dto: CreateExportDto, userId: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const job = await this.prisma.exportJob.create({
      data: {
        userId,
        reportType: dto.reportType,
        format: dto.format,
        params: dto as any,
        status: 'PENDING',
        expiresAt,
      },
    });

    // Run generation asynchronously — return jobId immediately
    this.generate(job.id, dto, userId).catch((err) =>
      this.logger.error({ err, jobId: job.id }, 'Export generation failed'),
    );

    return { jobId: job.id, status: 'PENDING' };
  }

  async getJobStatus(jobId: string, userId: string) {
    const job = await this.prisma.exportJob.findFirst({
      where: { id: jobId, userId },
      select: { id: true, status: true, reportType: true, format: true, fileName: true, errorMsg: true, createdAt: true, readyAt: true },
    });
    if (!job) throw new NotFoundException('Export job not found');
    return job;
  }

  async getHistory(userId: string) {
    return this.prisma.exportJob.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, status: true, reportType: true, format: true, fileName: true, createdAt: true, readyAt: true },
    });
  }

  getFilePath(jobId: string): string {
    return path.join(this.exportDir, jobId);
  }

  async getJobForDownload(jobId: string, userId: string) {
    const job = await this.prisma.exportJob.findFirst({
      where: { id: jobId, userId, status: 'READY' },
    });
    if (!job || !job.filePath) throw new NotFoundException('Export not ready or not found');
    if (!fs.existsSync(job.filePath)) throw new NotFoundException('Export file no longer available');
    return job;
  }

  // ─── Scheduled cleanup of expired exports ───────────────────────────────────

  async cleanupExpired() {
    const expired = await this.prisma.exportJob.findMany({
      where: { expiresAt: { lt: new Date() }, status: 'READY' },
      select: { id: true, filePath: true },
    });

    for (const job of expired) {
      if (job.filePath && fs.existsSync(job.filePath)) {
        fs.unlinkSync(job.filePath);
      }
    }

    await this.prisma.exportJob.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    this.logger.log(`Cleaned up ${expired.length} expired exports`);
  }

  // ─── Generation dispatcher ──────────────────────────────────────────────────

  private async generate(jobId: string, dto: CreateExportDto, userId: string) {
    try {
      let data: Record<string, any>;

      switch (dto.reportType) {
        case ExportReportType.ROADMAP:
          data = await this.fetchRoadmapData(dto);
          break;
        case ExportReportType.HEADCOUNT:
          data = await this.fetchHeadcountData(dto);
          break;
        case ExportReportType.PRODUCTIVITY:
          data = await this.fetchProductivityData(dto);
          break;
        case ExportReportType.RELEASE:
          data = await this.fetchReleaseData(dto);
          break;
        default:
          throw new Error(`Unknown report type: ${dto.reportType}`);
      }

      let filePath: string;
      let fileName: string;
      const ts = Date.now();

      if (dto.format === ExportFormatDto.EXCEL) {
        fileName = `${dto.reportType}-${ts}.xlsx`;
        filePath = path.join(this.exportDir, `${jobId}.xlsx`);
        await this.generateExcel(dto.reportType, data, filePath);
      } else if (dto.format === ExportFormatDto.CSV) {
        fileName = `${dto.reportType}-${ts}.csv`;
        filePath = path.join(this.exportDir, `${jobId}.csv`);
        await this.generateCsv(dto.reportType, data, filePath);
      } else {
        fileName = `${dto.reportType}-${ts}.pdf`;
        filePath = path.join(this.exportDir, `${jobId}.pdf`);
        await this.generatePdf(dto.reportType, data, filePath);
      }

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { status: 'READY', filePath, fileName, readyAt: new Date() },
      });
    } catch (err) {
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMsg: String(err) },
      });
      throw err;
    }
  }

  // ─── Data fetchers ──────────────────────────────────────────────────────────

  private async fetchRoadmapData(dto: CreateExportDto) {
    const releases = await this.prisma.releasePlan.findMany({
      where: {
        deletedAt: null,
        parentId: null,
        ...(dto.projectId ? { projectId: dto.projectId } : {}),
        ...(dto.from || dto.to ? {
          OR: [
            { plannedStart: { gte: dto.from ? new Date(dto.from) : undefined, lte: dto.to ? new Date(dto.to) : undefined } },
            { plannedEnd: { gte: dto.from ? new Date(dto.from) : undefined } },
          ],
        } : {}),
      },
      include: {
        milestones: { orderBy: { plannedDate: 'asc' } },
        children: { where: { deletedAt: null }, include: { milestones: { orderBy: { plannedDate: 'asc' } } } },
        project: { select: { name: true, code: true } },
      },
      orderBy: { plannedStart: 'asc' },
    });
    return { releases };
  }

  private async fetchHeadcountData(dto: CreateExportDto) {
    const records = await this.prisma.headcountRecord.findMany({
      where: {
        ...(dto.projectId ? { projectId: dto.projectId } : {}),
        ...(dto.from ? { period: { gte: new Date(dto.from) } } : {}),
        ...(dto.to ? { period: { lte: new Date(dto.to) } } : {}),
      },
      include: {
        project: { select: { name: true, code: true } },
        team: { select: { name: true } },
      },
      orderBy: [{ period: 'asc' }, { role: 'asc' }],
    });
    return { records };
  }

  private async fetchProductivityData(dto: CreateExportDto) {
    const records = await this.prisma.productivityRecord.findMany({
      where: {
        ...(dto.projectId ? { projectId: dto.projectId } : {}),
        ...(dto.from ? { period: { gte: new Date(dto.from) } } : {}),
        ...(dto.to ? { period: { lte: new Date(dto.to) } } : {}),
      },
      include: {
        metricDef: { select: { name: true, unit: true } },
        project: { select: { name: true, code: true } },
        team: { select: { name: true } },
        sprint: { select: { name: true } },
      },
      orderBy: [{ period: 'asc' }],
    });
    return { records };
  }

  private async fetchReleaseData(dto: CreateExportDto) {
    const where = dto.releaseId
      ? { id: dto.releaseId, deletedAt: null }
      : { deletedAt: null, parentId: null, ...(dto.projectId ? { projectId: dto.projectId } : {}) };

    const releases = await this.prisma.releasePlan.findMany({
      where,
      include: {
        milestones: { orderBy: { plannedDate: 'asc' } },
        children: { where: { deletedAt: null }, include: { milestones: { orderBy: { plannedDate: 'asc' } } } },
        project: { select: { name: true, code: true } },
        team: { select: { name: true } },
      },
      orderBy: { plannedStart: 'asc' },
    });
    return { releases };
  }

  // ─── Excel generator ────────────────────────────────────────────────────────

  private async generateExcel(reportType: string, data: Record<string, any>, filePath: string) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'PMT';
    wb.created = new Date();

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } },
      alignment: { horizontal: 'center' },
    };

    if (reportType === ExportReportType.ROADMAP || reportType === ExportReportType.RELEASE) {
      // Sheet 1: Releases
      const ws = wb.addWorksheet('Releases');
      ws.columns = [
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Version', key: 'version', width: 12 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Project', key: 'project', width: 20 },
        { header: 'Planned Start', key: 'plannedStart', width: 16 },
        { header: 'Planned End', key: 'plannedEnd', width: 16 },
        { header: 'Actual Start', key: 'actualStart', width: 16 },
        { header: 'Actual End', key: 'actualEnd', width: 16 },
      ];
      ws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

      for (const r of data.releases ?? []) {
        ws.addRow({
          name: r.name,
          version: r.version,
          type: r.type,
          status: r.status,
          project: r.project?.name ?? '',
          plannedStart: r.plannedStart ? new Date(r.plannedStart).toLocaleDateString() : '',
          plannedEnd: r.plannedEnd ? new Date(r.plannedEnd).toLocaleDateString() : '',
          actualStart: r.actualStart ? new Date(r.actualStart).toLocaleDateString() : '',
          actualEnd: r.actualEnd ? new Date(r.actualEnd).toLocaleDateString() : '',
        });
        for (const child of r.children ?? []) {
          ws.addRow({
            name: `  ↳ ${child.name}`,
            version: child.version,
            type: child.type,
            status: child.status,
            project: r.project?.name ?? '',
            plannedStart: child.plannedStart ? new Date(child.plannedStart).toLocaleDateString() : '',
            plannedEnd: child.plannedEnd ? new Date(child.plannedEnd).toLocaleDateString() : '',
            actualStart: child.actualStart ? new Date(child.actualStart).toLocaleDateString() : '',
            actualEnd: child.actualEnd ? new Date(child.actualEnd).toLocaleDateString() : '',
          });
        }
      }

      // Sheet 2: Milestones
      const mws = wb.addWorksheet('Milestones');
      mws.columns = [
        { header: 'Release', key: 'release', width: 30 },
        { header: 'Milestone Type', key: 'type', width: 22 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Planned Date', key: 'plannedDate', width: 16 },
        { header: 'Actual Date', key: 'actualDate', width: 16 },
        { header: 'Notes', key: 'notes', width: 40 },
      ];
      mws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
      for (const r of data.releases ?? []) {
        for (const m of [...(r.milestones ?? []), ...(r.children?.flatMap((c: any) => c.milestones ?? []) ?? [])]) {
          mws.addRow({
            release: r.name,
            type: m.type?.replace(/_/g, ' ') ?? '',
            status: m.status,
            plannedDate: m.plannedDate ? new Date(m.plannedDate).toLocaleDateString() : '',
            actualDate: m.actualDate ? new Date(m.actualDate).toLocaleDateString() : '',
            notes: m.notes ?? '',
          });
        }
      }

    } else if (reportType === ExportReportType.HEADCOUNT) {
      const ws = wb.addWorksheet('Headcount');
      ws.columns = [
        { header: 'Period', key: 'period', width: 14 },
        { header: 'Project', key: 'project', width: 20 },
        { header: 'Team', key: 'team', width: 20 },
        { header: 'Role', key: 'role', width: 20 },
        { header: 'Opening', key: 'opening', width: 12 },
        { header: 'Added', key: 'added', width: 10 },
        { header: 'Removed', key: 'removed', width: 10 },
        { header: 'Closing', key: 'closing', width: 12 },
        { header: 'Planned', key: 'planned', width: 12 },
      ];
      ws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
      for (const r of data.records ?? []) {
        ws.addRow({
          period: r.period ? new Date(r.period).toLocaleDateString('en', { year: 'numeric', month: 'short' }) : '',
          project: r.project?.name ?? '',
          team: r.team?.name ?? '',
          role: r.role ?? '',
          opening: r.openingCount,
          added: r.addedCount,
          removed: r.removedCount,
          closing: r.closingCount,
          planned: r.plannedCount ?? '',
        });
      }

    } else if (reportType === ExportReportType.PRODUCTIVITY) {
      const ws = wb.addWorksheet('Productivity');
      ws.columns = [
        { header: 'Period', key: 'period', width: 14 },
        { header: 'Metric', key: 'metric', width: 24 },
        { header: 'Project', key: 'project', width: 20 },
        { header: 'Team', key: 'team', width: 20 },
        { header: 'Sprint', key: 'sprint', width: 16 },
        { header: 'Work Type', key: 'workType', width: 16 },
        { header: 'Role', key: 'role', width: 16 },
        { header: 'Planned', key: 'planned', width: 12 },
        { header: 'Actual', key: 'actual', width: 12 },
        { header: 'Unit', key: 'unit', width: 10 },
      ];
      ws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
      for (const r of data.records ?? []) {
        ws.addRow({
          period: r.period ? new Date(r.period).toLocaleDateString() : '',
          metric: r.metricDef?.name ?? '',
          project: r.project?.name ?? '',
          team: r.team?.name ?? '',
          sprint: r.sprint?.name ?? '',
          workType: r.workType ?? '',
          role: r.role ?? '',
          planned: r.planned ?? '',
          actual: r.actual,
          unit: r.metricDef?.unit ?? '',
        });
      }
    }

    await wb.xlsx.writeFile(filePath);
  }

  // ─── CSV generator ──────────────────────────────────────────────────────────

  private async generateCsv(reportType: string, data: Record<string, any>, filePath: string) {
    const rows: string[][] = [];

    if (reportType === ExportReportType.HEADCOUNT) {
      rows.push(['Period', 'Project', 'Team', 'Role', 'Opening', 'Added', 'Removed', 'Closing', 'Planned']);
      for (const r of data.records ?? []) {
        rows.push([
          r.period ? new Date(r.period).toLocaleDateString('en', { year: 'numeric', month: 'short' }) : '',
          r.project?.name ?? '',
          r.team?.name ?? '',
          r.role ?? '',
          String(r.openingCount),
          String(r.addedCount),
          String(r.removedCount),
          String(r.closingCount),
          String(r.plannedCount ?? ''),
        ]);
      }
    } else if (reportType === ExportReportType.PRODUCTIVITY) {
      rows.push(['Period', 'Metric', 'Project', 'Team', 'Sprint', 'Work Type', 'Planned', 'Actual', 'Unit']);
      for (const r of data.records ?? []) {
        rows.push([
          r.period ? new Date(r.period).toLocaleDateString() : '',
          r.metricDef?.name ?? '',
          r.project?.name ?? '',
          r.team?.name ?? '',
          r.sprint?.name ?? '',
          r.workType ?? '',
          String(r.planned ?? ''),
          String(r.actual),
          r.metricDef?.unit ?? '',
        ]);
      }
    } else {
      rows.push(['Name', 'Version', 'Type', 'Status', 'Project', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End']);
      for (const r of data.releases ?? []) {
        rows.push([r.name, r.version, r.type, r.status, r.project?.name ?? '',
          r.plannedStart ? new Date(r.plannedStart).toLocaleDateString() : '',
          r.plannedEnd ? new Date(r.plannedEnd).toLocaleDateString() : '',
          r.actualStart ? new Date(r.actualStart).toLocaleDateString() : '',
          r.actualEnd ? new Date(r.actualEnd).toLocaleDateString() : '']);
      }
    }

    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    fs.writeFileSync(filePath, csv, 'utf-8');
  }

  // ─── PDF generator ──────────────────────────────────────────────────────────

  private async generatePdf(reportType: string, data: Record<string, any>, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ margin: 50, size: 'A4', layout: 'landscape' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const BRAND = '#1565C0';

      // Title
      doc.fontSize(20).fillColor(BRAND).text(`PMT — ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, { align: 'center' });
      doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      if (reportType === ExportReportType.ROADMAP || reportType === ExportReportType.RELEASE) {
        doc.fontSize(13).fillColor(BRAND).text('Releases', { underline: true });
        doc.moveDown(0.5);

        for (const r of data.releases ?? []) {
          doc.fontSize(11).fillColor('#000').text(`${r.name}  v${r.version}  [${r.status}]`, { continued: true });
          doc.fontSize(9).fillColor('#666').text(`  — ${r.project?.name ?? 'No project'}   ${new Date(r.plannedStart).toLocaleDateString()} → ${new Date(r.plannedEnd).toLocaleDateString()}`);

          for (const m of r.milestones ?? []) {
            doc.fontSize(9).fillColor('#444').text(
              `    • ${m.type?.replace(/_/g, ' ')}:  planned ${new Date(m.plannedDate).toLocaleDateString()}  [${m.status}]${m.actualDate ? `  actual ${new Date(m.actualDate).toLocaleDateString()}` : ''}`,
              { indent: 20 },
            );
          }
          doc.moveDown(0.5);
        }

      } else if (reportType === ExportReportType.HEADCOUNT) {
        doc.fontSize(13).fillColor(BRAND).text('Headcount Records', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#000');
        const COL = [80, 120, 120, 100, 55, 55, 55, 55, 55];
        const headers = ['Period', 'Project', 'Team', 'Role', 'Opening', 'Added', 'Removed', 'Closing', 'Planned'];
        let x = 50;
        doc.fontSize(9).fillColor('#fff').rect(50, doc.y, 780, 16).fill(BRAND);
        headers.forEach((h, i) => { doc.fillColor('#fff').text(h, x + 2, doc.y - 14, { width: COL[i] - 4 }); x += COL[i]; });
        doc.moveDown(0.5);

        for (const r of data.records ?? []) {
          const y = doc.y;
          x = 50;
          const cols = [
            r.period ? new Date(r.period).toLocaleDateString('en', { year: 'numeric', month: 'short' }) : '',
            r.project?.name ?? '', r.team?.name ?? '', r.role ?? '',
            String(r.openingCount), String(r.addedCount), String(r.removedCount), String(r.closingCount), String(r.plannedCount ?? ''),
          ];
          doc.fillColor('#000');
          cols.forEach((c, i) => { doc.fontSize(8).text(c, x + 2, y, { width: COL[i] - 4 }); x += COL[i]; });
          doc.moveDown(0.3);
        }

      } else if (reportType === ExportReportType.PRODUCTIVITY) {
        doc.fontSize(13).fillColor(BRAND).text('Productivity Records', { underline: true });
        doc.moveDown(0.5);
        for (const r of data.records ?? []) {
          doc.fontSize(9).fillColor('#000').text(
            `${r.period ? new Date(r.period).toLocaleDateString() : ''}  ${r.metricDef?.name ?? ''}  [${r.project?.name ?? ''}${r.team ? ` / ${r.team.name}` : ''}]  Planned: ${r.planned ?? '—'}  Actual: ${r.actual}  ${r.metricDef?.unit ?? ''}`,
          );
        }
      }

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}
