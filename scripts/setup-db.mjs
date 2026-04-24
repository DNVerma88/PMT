/**
 * Cross-platform DB setup script.
 * Usage: node scripts/setup-db.mjs
 *
 * Steps:
 *  1. Start the PostgreSQL Docker container
 *  2. Wait until PostgreSQL is accepting connections
 *  3. Run Prisma migrations
 *  4. Run Prisma seed
 */

import { execSync, spawn } from 'child_process';
import net from 'net';

const POSTGRES_HOST = 'localhost';
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT ?? '5432', 10);
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 2000;

function run(cmd, cwd = process.cwd()) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function waitForPort(host, port, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        socket.destroy();
        if (++attempts >= retries) {
          reject(new Error(`PostgreSQL not ready after ${retries} attempts on ${host}:${port}`));
        } else {
          console.log(`  Waiting for PostgreSQL... (attempt ${attempts}/${retries})`);
          setTimeout(attempt, RETRY_DELAY_MS);
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        if (++attempts >= retries) {
          reject(new Error(`PostgreSQL timed out after ${retries} attempts`));
        } else {
          setTimeout(attempt, RETRY_DELAY_MS);
        }
      });

      socket.connect(port, host);
    };

    attempt();
  });
}

async function main() {
  console.log('=== PMT Database Setup ===\n');

  // 1. Start PostgreSQL container
  console.log('[1/4] Starting PostgreSQL container...');
  run('docker-compose up -d postgres');

  // 2. Wait for PostgreSQL to be ready
  console.log(`[2/4] Waiting for PostgreSQL on ${POSTGRES_HOST}:${POSTGRES_PORT}...`);
  await waitForPort(POSTGRES_HOST, POSTGRES_PORT);
  console.log('  PostgreSQL is ready.');

  // 3. Run Prisma migrations
  console.log('[3/4] Running Prisma migrations...');
  run('npm run prisma:migrate -w @pmt/backend');

  // 4. Run seed
  console.log('[4/4] Seeding database...');
  run('npm run prisma:seed -w @pmt/backend');

  console.log('\n=== Database setup complete! ===');
  console.log('  You can now start the application:');
  console.log('    npm run backend   (in one terminal)');
  console.log('    npm run frontend  (in another terminal)\n');
}

main().catch((err) => {
  console.error('\n[ERROR] Database setup failed:', err.message);
  process.exit(1);
});
