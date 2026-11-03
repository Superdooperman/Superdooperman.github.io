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

const disclaimer = 'A love letter to the Apple II classic Choplifter. Not affiliated with or endorsed by its owners.';
const visibleFiles = ['index.html', 'manifest.json', 'js/game.js', 'README.md'];
const leaks = [];
for (const file of visibleFiles) {
  let text = fs.readFileSync(path.join(dir, file), 'utf8');
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  text = text.replace(/\/\/.*$/gm, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.split(disclaimer).join('');
  text = text.replace(/choplifter-monitor/g, '');
  text = text.replace(/pwas\/choplifter/g, '');
  text = text.replace(/\/choplifter\//g, '');
  if (/choplifter/i.test(text)) leaks.push(file);
}
if (leaks.length) {
  console.error('choplifter still appears outside the disclaimer in ' + leaks.join(', '));
  process.exit(1);
}
console.log('choplifter selftest ok');
