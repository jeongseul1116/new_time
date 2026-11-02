import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve(process.argv[2] || 'release');
const names = (await readdir(directory)).filter(name => name.endsWith('.exe') || name === 'Defender-scan.json').sort();
if (names.filter(name => name.endsWith('.exe')).length !== 1 || !names.includes('Defender-scan.json')) {
  throw new Error('Expected one EXE and a completed Defender scan report.');
}
const lines = [];
for (const name of names) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path.join(directory, name))) hash.update(chunk);
  lines.push(`${hash.digest('hex')}  ${name}`);
}
await writeFile(path.join(directory, 'SHA256SUMS.txt'), lines.join('\n') + '\n', 'utf8');
console.log('Release checksums generated for:', names.join(', '));
