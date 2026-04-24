/**
 * One-off migration: create "Old System" project and adopt all existing
 * records (release plans, headcount, productivity, sprint calendars, teams)
 * that currently have no project association or belong to no project.
 *
 * Run once with:
 *   npx ts-node --project tsconfig.json -e "require('./prisma/migrate-old-system')"
 * Or simply via:
 *   npx ts-node prisma/migrate-old-system.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Old System migration...\n');

  // ── 1. Resolve admin user ────────────────────────────────────────────────────
  const admin = await prisma.user.findUnique({ where: { email: 'admin@pmt.local' } });
  if (!admin) throw new Error('Admin user not found. Run the seed first.');

  // ── 2. Upsert "Old System" project ──────────────────────────────────────────
  const oldProject = await prisma.project.upsert({
    where: { code: 'OLD_SYS' },
    update: {},
    create: {
      name: 'Old System',
      code: 'OLD_SYS',
      description: 'Legacy project containing records imported from the old system.',
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log(`✓ Project: "${oldProject.name}" (${oldProject.id})`);

  // ── 3. Add admin as ADMIN member (idempotent) ────────────────────────────────
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: oldProject.id, userId: admin.id } },
    update: {},
    create: { projectId: oldProject.id, userId: admin.id, role: 'ADMIN' },
  });
  console.log('✓ Admin added as project member');

  // ── 4. Adopt orphaned Teams (no projectId isn't possible — teams always have one)
  //       Adopt teams whose project has been soft-deleted or belongs to DEMO project
  //       We only reassign teams that are directly under the DEMO project if it exists.
  //       SKIP — teams require a non-null projectId so they already have one.

  // ── 5. Adopt orphaned Release Plans (projectId IS NULL) ─────────────────────
  const rpResult = await prisma.releasePlan.updateMany({
    where: { projectId: null, deletedAt: null },
    data: { projectId: oldProject.id },
  });
  console.log(`✓ Release plans adopted: ${rpResult.count}`);

  // ── 6. Adopt orphaned Headcount Records (projectId IS NULL) ─────────────────
  const hcResult = await prisma.headcountRecord.updateMany({
    where: { projectId: null },
    data: { projectId: oldProject.id },
  });
  console.log(`✓ Headcount records adopted: ${hcResult.count}`);

  // ── 7. Adopt orphaned Productivity Records (projectId IS NULL) ───────────────
  const prResult = await prisma.productivityRecord.updateMany({
    where: { projectId: null },
    data: { projectId: oldProject.id },
  });
  console.log(`✓ Productivity records adopted: ${prResult.count}`);

  // ── 8. Adopt orphaned Sprint Calendars (projectId IS NULL) ──────────────────
  const scResult = await prisma.sprintCalendar.updateMany({
    where: { projectId: null },
    data: { projectId: oldProject.id },
  });
  console.log(`✓ Sprint calendars adopted: ${scResult.count}`);

  console.log('\n✅ Migration complete!');
  console.log(`   Project: "${oldProject.name}" — code: OLD_SYS — id: ${oldProject.id}`);
}

main()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
