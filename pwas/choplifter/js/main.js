const Game = (() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let scene = 'title';
  let last = 0;
  let pendingEnd = null;

  function resize() {
    const scale = Math.min(window.innerWidth / World.WIDTH, window.innerHeight / World.HEIGHT);
    canvas.style.width = `${World.WIDTH * scale}px`;
    canvas.style.height = `${World.HEIGHT * scale}px`;
  }

  function setScene(name) {
    scene = name;
    if (name === 'title') TitleScene.enter();
    if (name === 'play') PlayScene.enter();
    if (name === 'end') {
      EndScene.enter(pendingEnd.won, pendingEnd.score, pendingEnd.rescued, pendingEnd.killed);
    }
  }

  function update(dt) {
    if (scene === 'title') {
      const next = TitleScene.update(dt);
      if (next) setScene(next);
    } else if (scene === 'play') {
      const result = PlayScene.update(dt);
      if (result && result.end) {
        pendingEnd = {
          won: result.won,
          score: PlayScene.getScore(),
          rescued: PlayScene.rescued,
          killed: PlayScene.killed,
        };
        setScene('end');
      } else if (PlayScene.lives <= 0 || PlayScene.gameOver) {
        pendingEnd = {
          won: false,
          score: PlayScene.getScore(),
          rescued: PlayScene.rescued,
          killed: PlayScene.killed,
        };
        setScene('end');
      }
    } else if (scene === 'end') {
      const next = EndScene.update(dt);
      if (next) setScene(next);
    }
  }

  function draw() {
    if (scene === 'title') TitleScene.draw(ctx);
    else if (scene === 'play') PlayScene.draw(ctx);
    else if (scene === 'end') EndScene.draw(ctx);
  }

  function loop(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  async function init() {
    Input.init();
    window.addEventListener('resize', resize);
    resize();
    await Sprites.load();
    document.body.addEventListener('click', () => AudioFX.init(), { once: true });
    document.body.addEventListener('touchstart', () => AudioFX.init(), { once: true });
    TitleScene.enter();
    requestAnimationFrame(loop);
  }

  return { init };
})();

window.addEventListener('DOMContentLoaded', () => Game.init());