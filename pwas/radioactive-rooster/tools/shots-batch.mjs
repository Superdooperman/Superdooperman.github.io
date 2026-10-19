// node rooster-batch-shots.mjs <base> <outdir>: one shot per batch item (inventory, push Peck, push Henny, Ned's bell
// unscrew) and the Mortgage grub cutscene frame sequence. Desktop only.
import { chromium } from 'playwright-core';
const [BASE, OUT] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
const errors = [], bad = []; p.on('pageerror', (x) => errors.push(x.message)); p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
await p.goto(BASE + '?cb=' + Date.now(), { waitUntil: 'networkidle' });
await p.evaluate(() => window.__RR.start());
const go = (room, extra = {}) => p.evaluate(([room, extra]) => { const s = window.__RR.state; s.room = room; Object.assign(s.flags, extra.flags || {}); if (extra.inv) s.inv = extra.inv; s.verb = extra.verb || 'look'; window.__RR.setArtMode(window.__RR.artMode()); }, [room, extra]);
const drainAll = async () => { for (let k = 0; k < 10; k++) { await p.evaluate(() => window.__RR.advance()); await p.waitForTimeout(60); } };
const walk = async (x, y, ms = 2500) => { await p.evaluate(([x, y]) => window.__RR.walkTo(x, y), [x, y]); await p.waitForTimeout(ms); };
const act = (verb, id, pending) => p.evaluate(([verb, id, pending]) => { const s = window.__RR.state; s.verb = verb; if (pending) s.pending = pending; window.__RR.act({ t: 'hotspot', id }); }, [verb, id, pending]);
const shot = (name) => p.screenshot({ path: `${OUT}/${name}.png` });
const out = {};
// 1 inventory: every item
const all = ['geiger', 'bulb', 'photo', 'spoon', 'stub', 'half', 'ticket', 'grub', 'ribbon', 'sauce', 'mirror', 'bill', 'speaker', 'map', 'pass', 'vip', 'basket', 'tickets'];
await go('barn', { inv: all }); await p.waitForTimeout(600); await shot('inventory-desktop');
out.icons = await p.evaluate(() => [...document.querySelectorAll('.inv img')].map((i) => [i.dataset.file, i.naturalWidth, i.currentSrc.split('/').slice(-2).join('/')]));
// 2 push Peck
await go('barn', { inv: ['grub'] }); await walk(200, 150); await act('push', 'peck'); await p.waitForTimeout(260); await shot('push-peck'); await drainAll();
// 3 Mortgage cutscene frames
await walk(104, 152, 2500);
await act('use', 'goat', 'grub');
const t0 = Date.now(); out.frames = [];
for (const t of [300, 1200, 2100, 2750, 3050, 3300, 3900, 4400, 5300, 6000, 6800, 7600]) {
  await p.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
  const n = String(out.frames.length).padStart(2, '0'); await shot(`cutscene-${n}-${t}ms`);
  out.frames.push(await p.evaluate(() => [...document.querySelectorAll('.cs-actor')].map((n) => n.dataset.file).join(' ') + ' | ' + document.querySelector('#caption').innerText.slice(0, 50)));
}
out.after = await p.evaluate(() => ({ ribbon: window.__RR.state.inv.includes('ribbon'), flag: window.__RR.state.flags.got_ribbon, block: !!document.querySelector('.cs-block') }));
await drainAll();
// 4 push Henny
await go('fence'); await p.waitForTimeout(400); await walk(108, 118, 2000); await act('push', 'henny'); await p.waitForTimeout(450); await shot('push-henny'); await drainAll();
// 5 Ned's bell, ring 6: twisting
await go('store', { flags: { bell_rings: 5 } }); await p.waitForTimeout(400); await walk(105, 150, 2500);
await act('use', 'bell'); await p.waitForTimeout(200); await p.evaluate(() => window.__RR.advance());
await p.waitForTimeout(2000); await shot('ned-bell-unscrew');
out.ned = await p.evaluate(() => { const n = document.querySelector('.world img.cast[data-spot="clerk"]'); return n && n.dataset.file; });
await p.evaluate(() => window.__RR.advance()); await p.waitForTimeout(300);
out.nedLift = await p.evaluate(() => ({ ned: document.querySelector('.world img.cast[data-spot="clerk"]').dataset.file, bellOverlay: !!document.querySelector('.world img.overlay[data-id="fg/store--bell"]') }));
await p.screenshot({ path: `/tmp/wt/ned-lift.png` });
out.errors = errors; out.bad = bad;
console.log(JSON.stringify(out, null, 1));
await b.close();
