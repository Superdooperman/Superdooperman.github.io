class Tank {
  constructor(x) {
    this.x = x;
    this.y = World.GROUND_Y - 6;
    this.alive = true;
    this.cooldown = 0;
    this.w = 16;
    this.h = 10;
  }

  update(dt, heli, projectiles) {
    if (!this.alive) return;
    this.cooldown -= dt;
    if (heli.landed && this.cooldown <= 0 && Math.abs(heli.x - this.x) < 200) {
      const dir = heli.x > this.x ? 1 : -1;
      projectiles.push(new Projectile(
        this.x + dir * 8, this.y - 4, dir * 3, -1, 'bullet', true
      ));
      this.cooldown = 1.5 + Math.random();
    }
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    Sprites.drawTank(ctx, this.x - cameraX, this.y);
  }
}