import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
eval(fs.readFileSync(path.join(dir, 'js/sprites.js'), 'utf8'));
const code = fs.readFileSync(path.join(dir, 'js/game.js'), 'utf8');
eval(code);
const result = globalThis.GameApp.selfTest();
if (!result.ok) {
  console.error(result.failures.join('\n'));
  process.exit(1);
}
console.log('choplifter selftest ok');
