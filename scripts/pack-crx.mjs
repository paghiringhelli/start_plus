import crx3 from 'crx3';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Private key lives outside the repo so it never gets committed.
const keyPath = join(homedir(), '.ssh', 'start_plus.pem');

try {
  await crx3(['dist/manifest.json'], {
    keyPath,
    crxPath: 'dist.crx',
  });
  console.log(`Packed dist.crx using key at ${keyPath}`);
} catch (err) {
  console.warn(`Skipping .crx packaging: ${err.message}`);
}
