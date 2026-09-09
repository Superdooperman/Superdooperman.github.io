const TitleScene = {
  timer: 0,

  enter() {
    this.timer = 0;
  },

  update(dt) {
    this.timer += dt;
    if (Input.consumeStart()) return 'play';
    return null;
  },

  draw(ctx) {
    Sprites.clear(ctx, World.WIDTH, World.HEIGHT);
    Sprites.drawText(ctx, 'CHOPLIFTER!', 140, 60, 16, COLORS.orange, true);
    Sprites.drawText(ctx, 'RESCUE THE HOSTAGES', 140, 85, 8, COLORS.white, true);
    Sprites.drawText(ctx, 'FROM THE BUNGELING EMPIRE', 140, 98, 7, COLORS.green, true);
    const touch = Input.isTouchDevice();
    if (Math.floor(this.timer * 2) % 2 === 0) {
      Sprites.drawText(ctx, touch ? 'TAP TO START' : 'PRESS SPACE TO START', 140, 130, 8, COLORS.orange, true);
    }
    Sprites.drawText(ctx, 'SHOOT BARRACK DOORS THEN LAND TO PICK UP', 140, 148, 6, COLORS.gray, true);
    Sprites.drawText(ctx, touch ? 'STICK FLY   AIM DN   FIRE' : 'ARROWS FLY  S=AIM DOWN  SPACE FIRE', 140, 162, 6, COLORS.gray, true);
    Sprites.drawText(ctx, 'RESCUE 64! LOAD 5 PER TRIP, RETURN TO USPS', 140, 176, 6, COLORS.gray, true);
    Sprites.drawHelicopter(ctx, 140, 115, 1, false);
  },
};