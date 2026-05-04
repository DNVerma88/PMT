"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const RESOURCES = [
    'users',
    'roles',
    'projects',
    'teams',
    'release_plans',
    'release_milestones',
    'sprint_calendars',
    'productivity_metrics',
    'headcount',
    'saved_views',
    'audit_logs',
    'exports',
    'portfolio',
    'integrations',
    'sprint_metrics',
    'leaves',
    'wsr',
];
const ACTIONS = ['create', 'read', 'update', 'delete', 'manage', 'export', 'share'];
const ROLE_PERMISSIONS = {
    SUPER_ADMIN: RESOURCES.map((r) => ({ resource: r, actions: ['manage'] })),
    ADMIN: RESOURCES.filter((r) => r !== 'audit_logs').map((r) => ({
        resource: r,
        actions: ['create', 'read', 'update', 'delete', 'export', 'share'],
    })),
    DELIVERY_MANAGER: [
        { resource: 'projects', actions: ['read'] },
        { resource: 'teams', actions: ['read'] },
        { resource: 'release_plans', actions: ['create', 'read', 'update'] },
        { resource: 'release_milestones', actions: ['create', 'read', 'update'] },
        { resource: 'sprint_calendars', actions: ['read'] },
        { resource: 'productivity_metrics', actions: ['create', 'read', 'update'] },
        { resource: 'headcount', actions: ['create', 'read', 'update'] },
        { resource: 'saved_views', actions: ['create', 'read', 'update', 'delete', 'share'] },
        { resource: 'exports', actions: ['export'] },
        { resource: 'portfolio', actions: ['read'] },
        { resource: 'integrations', actions: ['read'] },
        { resource: 'sprint_metrics', actions: ['read', 'create', 'update', 'delete'] },
        { resource: 'leaves', actions: ['read', 'manage'] },
        { resource: 'wsr', actions: ['read', 'manage'] },
    ],
    PROJECT_MANAGER: [
        { resource: 'projects', actions: ['read'] },
        { resource: 'teams', actions: ['read'] },
        { resource: 'release_plans', actions: ['create', 'read', 'update'] },
        { resource: 'release_milestones', actions: ['create', 'read', 'update'] },
        { resource: 'sprint_calendars', actions: ['read'] },
        { resource: 'productivity_metrics', actions: ['create', 'read', 'update'] },
        { resource: 'headcount', actions: ['read'] },
        { resource: 'saved_views', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'exports', actions: ['export'] },
        { resource: 'portfolio', actions: ['read'] },
        { resource: 'integrations', actions: ['read'] },
        { resource: 'sprint_metrics', actions: ['read', 'create', 'update'] },
        { resource: 'leaves', actions: ['read', 'manage'] },
        { resource: 'wsr', actions: ['read', 'manage'] },
    ],
    ENGINEERING_MANAGER: [
        { resource: 'projects', actions: ['read'] },
        { resource: 'teams', actions: ['read', 'update'] },
        { resource: 'release_plans', actions: ['read', 'update'] },
        { resource: 'release_milestones', actions: ['read', 'update'] },
        { resource: 'sprint_calendars', actions: ['create', 'read', 'update'] },
        { resource: 'productivity_metrics', actions: ['create', 'read', 'update'] },
        { resource: 'headcount', actions: ['create', 'read', 'update'] },
        { resource: 'saved_views', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'exports', actions: ['export'] },
        { resource: 'portfolio', actions: ['read'] },
        { resource: 'integrations', actions: ['read'] },
        { resource: 'sprint_metrics', actions: ['read', 'create', 'update'] },
        { resource: 'leaves', actions: ['read', 'manage'] },
        { resource: 'wsr', actions: ['read'] },
    ],
    TEAM_LEAD: [
        { resource: 'projects', actions: ['read'] },
        { resource: 'teams', actions: ['read'] },
        { resource: 'release_plans', actions: ['read'] },
        { resource: 'release_milestones', actions: ['read', 'update'] },
        { resource: 'sprint_calendars', actions: ['read'] },
        { resource: 'productivity_metrics', actions: ['read', 'update'] },
        { resource: 'headcount', actions: ['read'] },
        { resource: 'saved_views', actions: ['create', 'read', 'update'] },
        { resource: 'exports', actions: ['export'] },
        { resource: 'portfolio', actions: ['read'] },
        { resource: 'sprint_metrics', actions: ['read', 'create'] },
        { resource: 'leaves', actions: ['read'] },
        { resource: 'wsr', actions: ['read'] },
    ],
    VIEWER: [
        { resource: 'projects', actions: ['read'] },
        { resource: 'teams', actions: ['read'] },
        { resource: 'release_plans', actions: ['read'] },
        { resource: 'release_milestones', actions: ['read'] },
        { resource: 'sprint_calendars', actions: ['read'] },
        { resource: 'productivity_metrics', actions: ['read'] },
        { resource: 'headcount', actions: ['read'] },
        { resource: 'saved_views', actions: ['read'] },
        { resource: 'exports', actions: ['export'] },
        { resource: 'portfolio', actions: ['read'] },
        { resource: 'sprint_metrics', actions: ['read'] },
        { resource: 'leaves', actions: ['read'] },
        { resource: 'wsr', actions: ['read'] },
    ],
};
async function main() {
    console.log('Starting database seed...');
    console.log('  Seeding permissions...');
    const permissionUpserts = RESOURCES.flatMap((resource) => ACTIONS.map((action) => prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: {
            resource,
            action,
            description: `${action} on ${resource}`,
        },
    })));
    await Promise.all(permissionUpserts);
    console.log('  Seeding roles...');
    const roleNames = Object.keys(ROLE_PERMISSIONS);
    for (const roleName of roleNames) {
        await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: {
                name: roleName,
                description: roleName.replace(/_/g, ' '),
                isSystem: true,
            },
        });
    }
    console.log('  Assigning role permissions...');
    for (const [roleName, permDefs] of Object.entries(ROLE_PERMISSIONS)) {
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (!role)
            continue;
        for (const permDef of permDefs) {
            for (const action of permDef.actions) {
                const permission = await prisma.permission.findUnique({
                    where: { resource_action: { resource: permDef.resource, action } },
                });
                if (!permission)
                    continue;
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
                    update: {},
                    create: { roleId: role.id, permissionId: permission.id },
                });
            }
        }
    }
    console.log('  Creating admin user...');
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@2025!';
    const adminHash = await bcryptjs_1.default.hash(adminPassword, 12);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@pmt.local' },
        update: {},
        create: {
            email: 'admin@pmt.local',
            username: 'admin',
            passwordHash: adminHash,
            firstName: 'System',
            lastName: 'Admin',
            status: 'ACTIVE',
        },
    });
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (superAdminRole) {
        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
            update: {},
            create: { userId: adminUser.id, roleId: superAdminRole.id, grantedBy: adminUser.id },
        });
    }
    console.log('  Seeding sample project and team...');
    const project = await prisma.project.upsert({
        where: { code: 'DEMO' },
        update: {},
        create: {
            name: 'Demo Project',
            code: 'DEMO',
            description: 'A sample project to demonstrate the PMT application.',
            isActive: true,
            createdBy: adminUser.id,
        },
    });
    const team = await prisma.team.upsert({
        where: { name_projectId: { name: 'Alpha Team', projectId: project.id } },
        update: {},
        create: {
            name: 'Alpha Team',
            description: 'Core engineering team',
            projectId: project.id,
            isActive: true,
            createdBy: adminUser.id,
        },
    });
    console.log('  Seeding sample sprint calendar...');
    const sprintCalendar = await prisma.sprintCalendar.upsert({
        where: { id: 'sprint-cal-demo-001' },
        update: {},
        create: {
            id: 'sprint-cal-demo-001',
            name: 'Demo Sprint Calendar',
            projectId: project.id,
            startDate: new Date('2025-01-06'),
            sprintLength: 14,
        },
    });
    for (let i = 1; i <= 10; i++) {
        const startDate = new Date('2025-01-06');
        startDate.setDate(startDate.getDate() + (i - 1) * 14);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);
        await prisma.sprint.upsert({
            where: { sprintCalendarId_number: { sprintCalendarId: sprintCalendar.id, number: i } },
            update: {},
            create: {
                sprintCalendarId: sprintCalendar.id,
                name: `Sprint ${i}`,
                number: i,
                startDate,
                endDate,
            },
        });
    }
    console.log('  Seeding productivity metric definitions...');
    const metricDefs = [
        { name: 'Story Points Completed', key: 'story_points_completed', unit: 'pts' },
        { name: 'Tickets Closed', key: 'tickets_closed', unit: 'count' },
        { name: 'Defects Closed', key: 'defects_closed', unit: 'count' },
        { name: 'Bug Leakage', key: 'bug_leakage', unit: '%' },
        { name: 'PRs Merged', key: 'prs_merged', unit: 'count' },
        { name: 'Throughput', key: 'throughput', unit: 'items/sprint' },
        { name: 'Lead Time', key: 'lead_time', unit: 'days' },
        { name: 'Cycle Time', key: 'cycle_time', unit: 'days' },
        { name: 'Automation Contribution', key: 'automation_contribution', unit: '%' },
    ];
    for (const def of metricDefs) {
        await prisma.productivityMetricDefinition.upsert({
            where: { key: def.key },
            update: {},
            create: { ...def, isCustom: false, isActive: true },
        });
    }
    await prisma.auditLog.create({
        data: {
            userId: adminUser.id,
            action: client_1.AuditAction.CREATE,
            resource: 'system',
            resourceId: 'seed',
            changes: { note: 'Initial database seed completed' },
        },
    });
    console.log('\nSeed completed successfully.');
    console.log(`  Admin credentials: admin@pmt.local / ${adminPassword}`);
    console.log('  IMPORTANT: Change the admin password after first login.\n');
}
main()
    .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map