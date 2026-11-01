import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(dir, 'js/game.js'), 'utf8');
eval(code);
const result = globalThis.GameApp.selfTest();
if (!result.ok) {
  console.error(result.failures.join('\n'));
  process.exit(1);
}
console.log('choplifter selftest ok');
