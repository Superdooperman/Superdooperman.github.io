const Game = (() => {
  const canvas = document.getElementById('game');
  const screen = canvas.getContext('2d');
  const buffer = document.createElement('canvas');
  buffer.width = 280;
  buffer.height = 192;
  const bctx = buffer.getContext('2d', { alpha: false });
  bctx.imageSmoothingEnabled = false;
  const sharp = document.createElement('canvas');
  const sctx = sharp.getContext('2d');

  let last = 0;
  let acc = 0;
  let fit = null;
  let dpr = 1;

  function readSafe() {
    const probe = document.getElementById('safe-probe');
    if (!probe) return { top: 0, right: 0, bottom: 0, left: 0 };
    const style = getComputedStyle(probe);
    return {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    };
  }

  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const vv = window.visualViewport;
    const viewW = vv ? vv.width : window.innerWidth;
    const viewH = vv ? vv.height : window.innerHeight;
    const ox = vv ? vv.offsetLeft : 0;
    const oy = vv ? vv.offsetTop : 0;
    fit = GameApp.fitFrame(viewW, viewH, readSafe());
    const px = fit.scale * dpr;
    const dw = Math.max(1, Math.round(280 * px));
    const dh = Math.max(1, Math.round(192 * px));
    canvas.width = dw;
    canvas.height = dh;
    const cssW = dw / dpr;
    const cssH = dh / dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.style.left = (ox + fit.left) + 'px';
    canvas.style.top = (oy + fit.top) + 'px';
    const root = document.documentElement.style;
    root.setProperty('--game-top', (oy + fit.top) + 'px');
    root.setProperty('--game-left', (ox + fit.left) + 'px');
    root.setProperty('--game-w', cssW + 'px');
    root.setProperty('--game-h', cssH + 'px');
    document.body.dataset.orient = fit.portrait ? 'portrait' : 'landscape';
  }

  function paint() {
    GameApp.draw(bctx);
    const step = fit ? fit.sharp : 1;
    const iw = 280 * step;
    const ih = 192 * step;
    if (sharp.width !== iw || sharp.height !== ih) {
      sharp.width = iw;
      sharp.height = ih;
    }
    sctx.imageSmoothingEnabled = false;
    sctx.setTransform(step, 0, 0, step, 0, 0);
    sctx.drawImage(buffer, 0, 0);
    screen.setTransform(1, 0, 0, 1, 0, 0);
    const integer = fit && Math.abs(fit.scale - step) < 0.02;
    screen.imageSmoothingEnabled = !integer;
    if (!integer) screen.imageSmoothingQuality = 'high';
    screen.drawImage(sharp, 0, 0, iw, ih, 0, 0, canvas.width, canvas.height);
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
    window.addEventListener('orientationchange', resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resize);
      window.visualViewport.addEventListener('scroll', resize);
    }
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
