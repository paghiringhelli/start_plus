import crx3 from 'crx3';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const targets = {
  main: {
    keyPath: process.env.START_PLUS_MAIN_KEY_PATH || join(homedir(), '.ssh', 'start_plus_main.pem'),
    crxPath: 'dist_main.crx',
  },
  admin: {
    keyPath: process.env.START_PLUS_ADMIN_KEY_PATH || join(homedir(), '.ssh', 'start_plus_admin.pem'),
    crxPath: 'dist_admin.crx',
  },
};

const targetName = process.argv[2];
const target = targets[targetName];

if (!target) {
  console.error('Usage: node scripts/pack-crx.mjs <main|admin>');
  process.exitCode = 1;
} else if (!existsSync(target.keyPath)) {
  console.error(`Signing key not found for ${targetName}: ${target.keyPath}`);
  process.exitCode = 1;
} else {
  try {
    await crx3(['dist/manifest.json'], target);
    console.log(`Packed ${target.crxPath} for ${targetName} using key at ${target.keyPath}`);
  } catch (error) {
    console.error(`Failed to package ${targetName}: ${error.message}`);
    process.exitCode = 1;
  }
}
