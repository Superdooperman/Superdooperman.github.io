// node rooster-fence-repro.mjs <base> <outprefix>: a player's route at the fence: arrive from the rooftop (bucket note,
// down the hatch), Talk to the yard roosters, then Use the rail (also Use the yard roosters). After each step: is he
// on screen (a visible .hero or .pose with a loaded image), which frame, any 404s; Talk to the roosters while seated.
import { chromium } from 'playwright-core';
const [BASE, OUT] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const res = {};
for (const [kind, vp] of [['desktop', { viewport: { width: 1280, height: 900 } }], ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  for (const target of ['rail', 'birds']) {
    const ctx = await b.newContext(vp); const p = await ctx.newPage();
    const errors = [], bad = []; p.on('pageerror', (x) => errors.push(x.message)); p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await p.goto(BASE + '?cb=' + Date.now(), { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: 'New game' }).click(); await p.waitForTimeout(500);
    const drain = async () => { for (let k = 0; k < 14; k++) { if (!(await p.evaluate(() => window.__RR.index < window.__RR.queue.length - 1))) break; await p.click('#caption'); await p.waitForTimeout(150); } };
    const verb = async (i) => p.locator('.verbs button').nth(i).click();
    const spot = async (id) => p.locator(`button.spot[data-id="${id}"]`).click();
    const seen = () => p.evaluate(() => {
      const vis = (n) => n && getComputedStyle(n).visibility !== 'hidden' && n.complete && n.naturalWidth > 0 && n.getBoundingClientRect().width > 2;
      const h = document.querySelector('.world .hero'), s = document.querySelector('.world .pose');
      return { room: window.__RR.state.room, pose: window.__RR.state.pose, hero: h && { file: h.dataset.file, vis: vis(h) }, sit: s && { file: s.dataset.file, vis: vis(s), nat: s.naturalWidth }, visible: vis(h) || vis(s), caption: document.querySelector('#caption').innerText.slice(0, 90) };
    });
    await drain();
    await verb(0); await spot('bucket'); await p.waitForTimeout(2500); await drain();
    await p.locator('nav.exits button', { hasText: 'Down the hatch' }).click(); await p.waitForTimeout(800); await drain();
    const steps = [];
    await verb(1); await spot('birds'); await p.waitForTimeout(1800); steps.push({ step: 'talk roosters', ...(await seen()) }); await drain();
    await verb(3); await spot(target); await p.waitForTimeout(120); steps.push({ step: `use ${target} +120ms`, ...(await seen()) });
    await p.waitForTimeout(900); steps.push({ step: `use ${target} +1s`, ...(await seen()) });
    await p.mouse.move(2, 2); await p.screenshot({ path: `${OUT}${kind}-${target}-seated.png` });
    await drain(); await p.waitForTimeout(400); steps.push({ step: 'after drain', ...(await seen()) });
    await p.screenshot({ path: `${OUT}${kind}-${target}-seated-drained.png` });
    await verb(1); await spot('birds'); await p.waitForTimeout(900); steps.push({ step: 'talk roosters seated', ...(await seen()) }); await drain(); await p.waitForTimeout(800);
    steps.push({ step: 'after', ...(await seen()) });
    res[`${kind}/${target}`] = { steps, errors, bad };
    await ctx.close();
  }
}
console.log(JSON.stringify(res, null, 1));
await b.close();
