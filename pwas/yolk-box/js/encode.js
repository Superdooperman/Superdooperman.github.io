// WAV writer + MP3 (lamejs in a Web Worker).
export function wavBlob(L, R, sr) {
  const n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    v.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true); o += 4;
  }
  return new Blob([buf], { type: 'audio/wav' });
}
export function mp3Blob(L, R, sr, kbps = 192) {
  return new Promise((resolve, reject) => {
    const wk = new Worker(new URL('./mp3-worker.js', import.meta.url));
    wk.onmessage = (e) => { wk.terminate(); e.data.error ? reject(new Error(e.data.error)) : resolve(new Blob(e.data.chunks, { type: 'audio/mpeg' })); };
    wk.onerror = (e) => { wk.terminate(); reject(e); };
    const l = new Float32Array(L), r = new Float32Array(R);
    wk.postMessage({ L: l, R: r, sr, kbps }, [l.buffer, r.buffer]);
  });
}
export function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
