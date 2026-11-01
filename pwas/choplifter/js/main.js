const Game = (() => {
  const canvas = document.getElementById('game');
  const screen = canvas.getContext('2d');
  const buffer = document.createElement('canvas');
  buffer.width = 280;
  buffer.height = 192;
  const bctx = buffer.getContext('2d', { alpha: false });
  bctx.imageSmoothingEnabled = false;

  let last = 0;
  let acc = 0;
  let scale = 1;
  let dpr = 1;

  function resize() {
    dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    scale = GameApp.integerScale(window.innerWidth, window.innerHeight);
    const cssW = 280 * scale;
    const cssH = 192 * scale;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    screen.imageSmoothingEnabled = false;
  }

  function paint() {
    GameApp.draw(bctx);
    screen.imageSmoothingEnabled = false;
    screen.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    screen.drawImage(buffer, 0, 0);
  }

  function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts || 0;
    acc += dt;
    const step = 1 / 12;
    if (acc >= step) {
      GameApp.frame();
      acc -= step;
      if (acc >= step) acc = step * 0.5;
    }
    document.body.dataset.scene = GameApp.scene();
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      const scene = GameApp.scene();
      startBtn.textContent = scene === 'end' ? 'TAP TO CONTINUE' : 'TAP TO START';
    }
    paint();
    requestAnimationFrame(loop);
  }

  function init() {
    Input.init();
    window.addEventListener('resize', resize);
    resize();
    document.body.dataset.scene = 'title';
    const bootAudio = () => { try { AudioFX.init(); } catch (_) { /* ignore */ } };
    document.body.addEventListener('pointerdown', bootAudio, { once: true });
    document.body.addEventListener('keydown', bootAudio, { once: true });
    GameApp.boot();
    requestAnimationFrame((ts) => { last = ts; requestAnimationFrame(loop); });
  }

  return { init };
})();

window.addEventListener('DOMContentLoaded', () => Game.init());
