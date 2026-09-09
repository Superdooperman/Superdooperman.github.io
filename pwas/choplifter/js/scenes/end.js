const EndScene = {
  won: false,
  score: 0,
  rescued: 0,
  killed: 0,
  timer: 0,

  enter(won, score, rescued = 0, killed = 0) {
    this.won = won;
    this.score = score;
    this.rescued = rescued;
    this.killed = killed;
    this.timer = 0;
    if (won) AudioFX.fanfare();
    else AudioFX.gameOver();
  },

  update(dt) {
    this.timer += dt;
    if (this.timer > 1 && Input.consumeStart()) return 'title';
    return null;
  },

  draw(ctx) {
    Sprites.clear(ctx, World.WIDTH, World.HEIGHT);
    if (this.won) {
      Sprites.drawText(ctx, 'MISSION COMPLETE', 140, 72, 14, COLORS.orange, true);
      Sprites.drawText(ctx, '64 RESCUED', 140, 98, 10, COLORS.white, true);
      Sprites.drawText(ctx, 'BUNGELING EMPIRE DEFEATED', 140, 114, 7, COLORS.green, true);
    } else {
      Sprites.drawText(ctx, 'THE END', 140, 80, 16, COLORS.orange, true);
      Sprites.drawText(ctx, `SAVED ${this.rescued}  LOST ${this.killed}`, 140, 105, 8, COLORS.red, true);
      const msg = this.rescued + this.killed >= 64 ? 'TOO MANY LOST' : 'CHOPPER DESTROYED';
      Sprites.drawText(ctx, msg, 140, 120, 7, COLORS.gray, true);
    }
    Sprites.drawText(ctx, `SCORE ${this.score}`, 140, 130, 10, COLORS.green, true);
    if (Math.floor(this.timer * 2) % 2 === 0) {
      Sprites.drawText(ctx, 'PRESS SPACE', 140, 155, 8, COLORS.orange, true);
    }
  },
};