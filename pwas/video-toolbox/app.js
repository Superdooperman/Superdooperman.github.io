// Video Toolbox: own-files video editing with ffmpeg.wasm. Nothing is uploaded.
import { FFmpeg } from './vendor/ffmpeg/index.js';

const CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/';
const $ = (id) => document.getElementById(id);
const S = Object.assign({ tool: 'trim', preset: 'balanced', aFmt: 'mp3', vFmt: 'mp4' }, JSON.parse(localStorage.getItem('vtSettings') || '{}'));
const saveS = () => localStorage.setItem('vtSettings', JSON.stringify(S));
let coreURLs = null, files = [], ff = null, loading = null, result = null, info = {}, busy = false;

// ---------- engine ----------
async function blobURL(url, type) {
  const r = await fetch(url); if (!r.ok) throw new Error('engine download failed (' + r.status + ')');
  return URL.createObjectURL(new Blob([await r.arrayBuffer()], { type }));
}
function engine(txt, cls) { $('engine').textContent = 'engine: ' + txt; $('engine').className = 'engine ' + (cls || ''); }
async function getFF() {
  if (ff && ff.loaded) return ff;
  if (loading) return loading;
  loading = (async () => {
    engine(coreURLs ? 'warming up…' : 'downloading… (first time ~32 MB)', 'busy');
    const f = new FFmpeg();
    f.on('log', ({ message }) => { logLines.push(message); if (logLines.length > 400) logLines.shift(); parseInfo(message); });
    f.on('progress', ({ progress }) => setProg(progress));
    if (!coreURLs) coreURLs = { coreURL: await blobURL(CORE + 'ffmpeg-core.js', 'text/javascript'), wasmURL: await blobURL(CORE + 'ffmpeg-core.wasm', 'application/wasm') };
    await f.load(coreURLs);
    ff = f; engine('ready', 'ok'); loading = null; return f;
  })().catch((e) => { loading = null; engine('failed: ' + (navigator.onLine ? e.message : 'offline, and not downloaded yet'), 'err'); throw e; });
  return loading;
}
let logLines = [];
function parseInfo(m) {
  let x;
  if ((x = /Duration: (\d+):(\d+):([\d.]+)/.exec(m))) info.dur = +x[1] * 3600 + +x[2] * 60 + +x[3];
  if ((x = /Video: (\w+).*?, (\d{2,5})x(\d{2,5})/.exec(m))) { info.vcodec = x[1]; info.w = +x[2]; info.h = +x[3]; }
  if ((x = /Audio: (\w+)/.exec(m))) info.acodec = x[1];
}

// ---------- files ----------
const fmtT = (s) => { s = Math.max(0, s || 0); const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };
const parseT = (v) => { const p = String(v).trim().split(':').map(Number); if (p.some(isNaN)) return NaN; return p.reduce((a, b) => a * 60 + b, 0); };
const mb = (n) => (n / 1048576).toFixed(n > 1e8 ? 0 : 1) + ' MB';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function setFiles(list) {
  files = [...list].filter((f) => f.size); if (!files.length) return;
  const f = files[0]; $('work').hidden = false; $('out').hidden = true; info = {};
  const v = $('video'); if (v.src) URL.revokeObjectURL(v.src); v.src = URL.createObjectURL(f);
  v.onloadedmetadata = () => { info.dur = v.duration; info.w = v.videoWidth; info.h = v.videoHeight; $('tIn').value = fmtT(0); $('tOut').value = fmtT(v.duration); showInfo(); trimUI(); estimate(); };
  v.onerror = () => { showInfo('Preview not supported by this browser for this format; tools still work.'); };
  showInfo();
  $('clipList').innerHTML = files.map((x) => `<li>${esc(x.name)} <small>${mb(x.size)}</small></li>`).join('');
  if (files.some((x) => x.size > 1.5 * 1073741824)) alert('Heads up: files over ~1.5 GB may run out of browser memory.');
  getFF().catch(() => {}); // warm up
}
function showInfo(extra) {
  const f = files[0]; if (!f) return;
  $('finfo').innerHTML = `<b>${esc(f.name)}</b> · ${mb(f.size)}${info.dur ? ' · ' + fmtT(info.dur) : ''}${info.w ? ` · ${info.w}×${info.h}` : ''}${files.length > 1 ? ` · +${files.length - 1} more clip(s)` : ''}${extra ? '<br><small>' + extra + '</small>' : ''}`;
}
$('file').onchange = (e) => setFiles(e.target.files);
const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => setFiles(e.dataTransfer.files));
// Launched as a file handler (installed PWA)
if ('launchQueue' in window) launchQueue.setConsumer(async (p) => { if (p.files && p.files.length) setFiles(await Promise.all(p.files.map((h) => h.getFile()))); });

// ---------- tools UI ----------
function showTool(t) { S.tool = t; saveS(); document.querySelectorAll('#tools button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); document.querySelectorAll('.tool').forEach((s) => s.classList.toggle('on', s.dataset.t === t)); }
document.querySelectorAll('#tools button').forEach((b) => b.onclick = () => showTool(b.dataset.t));
showTool(S.tool);
function trimUI() { const d = info.dur || 1, a = parseT($('tIn').value), b = parseT($('tOut').value); $('trimSel').style.left = (a / d * 100) + '%'; $('trimSel').style.width = Math.max(0, (b - a) / d * 100) + '%'; }
['tIn', 'tOut'].forEach((id) => $(id).oninput = trimUI);
$('setIn').onclick = () => { $('tIn').value = fmtT($('video').currentTime); trimUI(); };
$('setOut').onclick = () => { $('tOut').value = fmtT($('video').currentTime); trimUI(); };
$('stepB').onclick = () => { const v = $('video'); v.pause(); v.currentTime = Math.max(0, v.currentTime - 1 / 30); };
$('stepF').onclick = () => { const v = $('video'); v.pause(); v.currentTime += 1 / 30; };
document.querySelectorAll('#cPreset button').forEach((b) => { b.classList.toggle('on', b.dataset.p === S.preset); b.onclick = () => { S.preset = b.dataset.p; saveS(); document.querySelectorAll('#cPreset button').forEach((x) => x.classList.toggle('on', x === b)); estimate(); }; });
$('aFmt').value = S.aFmt; $('aFmt').onchange = (e) => { S.aFmt = e.target.value; saveS(); };
$('vFmt').value = S.vFmt; $('vFmt').onchange = (e) => { S.vFmt = e.target.value; saveS(); };
const PRE = { small: { h: 480, crf: 30, ab: '96k', kbps: 900 }, balanced: { h: 720, crf: 26, ab: '128k', kbps: 2200 }, high: { h: 1080, crf: 22, ab: '160k', kbps: 5000 } };
function estimate() { if (!info.dur) return; const p = PRE[S.preset]; $('cEst').textContent = `Rough estimate: ~${mb(p.kbps * 1000 / 8 * info.dur)} (was ${mb(files[0].size)}). Actual size depends on the footage.`; }

// ---------- build the ffmpeg job ----------
const ext = (n) => (n.match(/\.([a-z0-9]{1,5})$/i) || [, 'mp4'])[1].toLowerCase();
const base = (n) => n.replace(/\.[^.]+$/, '');
const scale = (h) => `scale=-2:'min(${h},ih)'`;
function job() {
  const f = files[0], inName = 'in.' + ext(f.name), name = base(f.name);
  const H264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'], AAC = ['-c:a', 'aac', '-b:a', '128k'];
  switch (S.tool) {
    case 'trim': {
      const a = parseT($('tIn').value), b = parseT($('tOut').value);
      if (!(b > a)) throw new Error('End must be after start.');
      const out = `${name}-trim.${$('tPrecise').checked ? 'mp4' : ext(f.name)}`;
      return { inputs: [[inName, f]], out, args: $('tPrecise').checked ? ['-ss', a.toFixed(3), '-to', b.toFixed(3), '-i', inName, ...H264, '-crf', '20', ...AAC, out] : ['-ss', a.toFixed(3), '-to', b.toFixed(3), '-i', inName, '-c', 'copy', '-avoid_negative_ts', 'make_zero', out], dur: b - a };
    }
    case 'audio': {
      const out = `${name}.${S.aFmt}`, codec = { mp3: ['-c:a', 'libmp3lame', '-b:a', '192k'], m4a: ['-c:a', 'aac', '-b:a', '192k'], wav: ['-c:a', 'pcm_s16le'] }[S.aFmt];
      return { inputs: [[inName, f]], out, args: ['-i', inName, '-vn', ...codec, out] };
    }
    case 'compress': {
      const p = PRE[S.preset], out = `${name}-${S.preset}.mp4`;
      return { inputs: [[inName, f]], out, args: ['-i', inName, '-vf', scale(p.h), ...H264, '-crf', String(p.crf), '-c:a', 'aac', '-b:a', p.ab, '-movflags', '+faststart', out] };
    }
    case 'convert': {
      if (S.vFmt === 'mp4') { const out = name + '.mp4'; return { inputs: [[inName, f]], out, args: ['-i', inName, ...H264, '-crf', '23', ...AAC, '-movflags', '+faststart', out] }; }
      if (S.vFmt === 'webm') { const out = name + '.webm'; return { inputs: [[inName, f]], out, args: ['-i', inName, '-c:v', 'libvpx', '-b:v', '1M', '-crf', '10', '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libopus', '-b:a', '96k', out] }; }
      const out = name + '.gif';
      return { inputs: [[inName, f]], out, dur: Math.min(10, info.dur || 10), args: ['-t', '10', '-i', inName, '-vf', 'fps=12,scale=480:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer', '-loop', '0', out] };
    }
    case 'flatten': {
      const cap = $('capText').value.trim(), out = `${name}-${files.length > 1 ? 'joined' : 'captioned'}.mp4`;
      if (files.length < 2 && !cap) throw new Error('Pick 2+ clips to join, or type a caption.');
      const inputs = files.map((x, i) => [`c${i}.${ext(x.name)}`, x]);
      const W = 1280, Hh = 720, n = files.length;
      let fc = files.map((_, i) => `[${i}:v]scale=${W}:${Hh}:force_original_aspect_ratio=decrease,pad=${W}:${Hh}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`).join(';');
      fc += ';' + files.map((_, i) => `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo[a${i}]`).join(';');
      fc += ';' + files.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${n}:v=1:a=1[vc][a]`;
      const y = $('capPos').value === 'top' ? '40' : 'h-th-40';
      fc += cap ? `;[vc]drawtext=fontfile=/font.ttf:textfile=/cap.txt:expansion=none:fontsize=54:fontcolor=white:borderw=5:bordercolor=black:x=(w-tw)/2:y=${y}[v]` : ';[vc]null[v]';
      const args = []; inputs.forEach(([nm]) => args.push('-i', nm));
      return { inputs, out, font: !!cap, cap, needsAudio: true, args: [...args, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', ...H264, '-crf', '23', ...AAC, '-movflags', '+faststart', out] };
    }
  }
}

// ---------- run ----------
function setProg(p) { if (!busy) return; p = Math.max(0, Math.min(1, p)); $('progBar').style.width = (p * 100).toFixed(1) + '%'; $('progTxt').textContent = (p * 100).toFixed(0) + '%'; }
async function hasAudio(f, name) { logLines = []; await f.exec(['-hide_banner', '-i', name]).catch(() => {}); return logLines.some((l) => /Stream #.*Audio:/.test(l)); }
async function run() {
  if (busy || !files.length) return;
  let j; try { j = job(); } catch (e) { alert(e.message); return; }
  $('cmd').textContent = 'ffmpeg ' + j.args.map((a) => /[\s;'\[]/.test(a) ? `"${a}"` : a).join(' ');
  busy = true; $('runBtn').disabled = true; $('cancelBtn').hidden = false; $('prog').hidden = false; setProg(0); $('progTxt').textContent = 'loading engine…';
  const t0 = performance.now();
  try {
    const f = await getFF(); engine('working…', 'busy');
    for (const [nm, file] of j.inputs) await f.writeFile(nm, new Uint8Array(await file.arrayBuffer()));
    if (j.cap) await f.writeFile('/cap.txt', j.cap);
    if (j.font) await f.writeFile('/font.ttf', new Uint8Array(await (await fetch(new URL('./LilitaOne-Regular.ttf', import.meta.url))).arrayBuffer()));
    if (j.needsAudio) { // clips without sound get a silent track so concat works
      for (let i = 0; i < j.inputs.length; i++) if (!(await hasAudio(f, j.inputs[i][0]))) {
        const nm = j.inputs[i][0], fixed = 'fx' + i + '.mp4';
        await f.exec(['-i', nm, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'copy', '-c:a', 'aac', fixed]);
        j.args[j.args.indexOf(nm)] = fixed;
      }
    }
    logLines = [];
    const code = await f.exec(['-hide_banner', '-y', ...j.args]);
    $('log').textContent = logLines.slice(-60).join('\n');
    if (code !== 0) throw new Error('ffmpeg exited with code ' + code + '. See the log under Advanced.');
    const data = await f.readFile(j.out);
    for (const [nm] of j.inputs) await f.deleteFile(nm).catch(() => {});
    await f.deleteFile(j.out).catch(() => {});
    const type = { mp4: 'video/mp4', webm: 'video/webm', gif: 'image/gif', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', mov: 'video/quicktime', mkv: 'video/x-matroska' }[ext(j.out)] || 'application/octet-stream';
    showResult(new File([data.buffer], j.out, { type }), (performance.now() - t0) / 1000);
    engine('ready', 'ok');
  } catch (e) {
    if (!busy) return; // cancelled
    engine('error', 'err'); alert(e.message || String(e)); $('log').textContent = logLines.slice(-60).join('\n');
  } finally {
    try { ff && ff.terminate(); } catch {} ff = null; getFF().catch(() => {}); // fresh engine for the next job (wasm heap can corrupt between runs)
    busy = false; $('runBtn').disabled = false; $('cancelBtn').hidden = true; $('prog').hidden = true; }
}
function showResult(file, secs) {
  if (result && result.url) URL.revokeObjectURL(result.url);
  result = { file, url: URL.createObjectURL(file) };
  $('out').hidden = false; ['outVideo', 'outAudio', 'outImg'].forEach((id) => { $(id).hidden = true; $(id).removeAttribute('src'); });
  const el = file.type.startsWith('video') ? 'outVideo' : file.type.startsWith('audio') ? 'outAudio' : 'outImg';
  $(el).hidden = false; $(el).src = result.url;
  $('outInfo').textContent = `${file.name} · ${mb(file.size)} · done in ${secs.toFixed(1)} s`;
  $('out').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('runBtn').onclick = run;
$('cancelBtn').onclick = () => { if (!busy) return; busy = false; try { ff && ff.terminate(); } catch {} ff = null; engine('stopped (reloads on next run)'); $('runBtn').disabled = false; $('cancelBtn').hidden = true; $('prog').hidden = true; };
$('saveBtn').onclick = async () => {
  if (!result) return;
  if (window.showSaveFilePicker) {
    try { const h = await showSaveFilePicker({ suggestedName: result.file.name }); const w = await h.createWritable(); await w.write(result.file); await w.close(); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = result.url; a.download = result.file.name; a.click();
};
$('useBtn').onclick = () => { if (result) setFiles([result.file]); };
window.__vt = { getFF, run, files: () => files, result: () => result };
