importScripts('../vendor/lame.min.js');   // lamejs 1.2.1 (LGPL-3.0), unmodified, vendored
onmessage = (e) => {
  try {
    const { L, R, sr, kbps } = e.data, enc = new lamejs.Mp3Encoder(2, sr, kbps), chunks = [], B = 1152;
    const toI16 = (f) => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) o[i] = Math.max(-1, Math.min(1, f[i])) * 32767; return o; };
    const l = toI16(L), r = toI16(R);
    for (let i = 0; i < l.length; i += B) { const c = enc.encodeBuffer(l.subarray(i, i + B), r.subarray(i, i + B)); if (c.length) chunks.push(new Uint8Array(c)); }
    const end = enc.flush(); if (end.length) chunks.push(new Uint8Array(end));
    postMessage({ chunks });
  } catch (err) { postMessage({ error: String(err) }); }
};
