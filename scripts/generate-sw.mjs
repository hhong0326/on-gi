import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(join(root, 'public/sw.template.js'), 'utf8');
const version = Date.now().toString(36);

writeFileSync(join(root, 'public/sw.js'), template.replace('__BUILD_VERSION__', version));
console.log(`sw.js generated (cache: ongi-${version})`);
