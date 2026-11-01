const Game = (() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let last = 0;
  let acc = 0;

  function resize() {
    const scale = Math.min(window.innerWidth / 280, window.innerHeight / 192);
    canvas.style.width = `${Math.floor(280 * scale)}px`;
    canvas.style.height = `${Math.floor(192 * scale)}px`;
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts || 0;
    acc += dt;
    let steps = 0;
    while (acc >= 1 / 12 && steps < 4) {
      GameApp.frame();
      acc -= 1 / 12;
      steps += 1;
    }
    document.body.dataset.scene = GameApp.scene();
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      const scene = GameApp.scene();
      startBtn.textContent = scene === 'end' ? 'TAP TO CONTINUE' : 'TAP TO START';
    }
    GameApp.draw(ctx);
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
