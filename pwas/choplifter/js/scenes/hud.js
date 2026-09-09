const HUD = {
  draw(ctx, state) {
    const { heli, rescued, killed, left, level, lives, paused } = state;
    Sprites.drawText(ctx, `LOADED ${heli.aboard}/${World.MAX_ABOARD}`, 4, 10, 7, COLORS.white);
    Sprites.drawText(ctx, `SAVED ${rescued}`, 4, 20, 7, COLORS.green);
    Sprites.drawText(ctx, `LOST ${killed}`, 4, 30, 7, COLORS.red);
    Sprites.drawText(ctx, `LEFT ${left}`, 60, 30, 7, COLORS.gray);
    const sortieNum = Math.min(3, Math.max(1, 4 - lives));
    Sprites.drawText(ctx, `SORTIE ${sortieNum}/3`, 200, 10, 7, COLORS.orange);
    Sprites.drawText(ctx, `LVL ${level}`, 200, 20, 7, COLORS.white);
    if (paused) {
      Sprites.drawText(ctx, 'PAUSED', 140, 96, 12, COLORS.white, true);
    }
    const facing = { left: '<<', right: '>>', down: 'VV' }[heli.facing] || '';
    Sprites.drawText(ctx, facing, 4, 186, 7, COLORS.green);
    if (heli.landed && heli.aboard < World.MAX_ABOARD) {
      Sprites.drawText(ctx, 'LANDED', 120, 186, 7, COLORS.orange, true);
    }
  },
};