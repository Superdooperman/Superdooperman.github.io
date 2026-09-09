class Alien {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this.cooldown = 1 + Math.random() * 2;
    this.frame = Math.random() * 4;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.hoverY = y;
    this.speed = 45;
  }

  update(dt, heli, projectiles) {
    if (!this.alive) return;
    this.frame += dt * 6;
    this.x += this.dir * this.speed * dt;
    this.y = this.hoverY + Math.sin(this.frame) * 4;
    this.cooldown -= dt;

    if (this.cooldown <= 0 && Math.abs(this.x - heli.x) < 140 && Math.abs(this.y - heli.y) < 70) {
      const dx = heli.x - this.x;
      const dy = heli.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      projectiles.push(new Projectile(
        this.x, this.y, (dx / len) * 3.5, (dy / len) * 3.5, 'missile', true
      ));
      this.cooldown = 2.5 + Math.random() * 2;
    }

    if (this.x < -40 || this.x > World.WORLD_WIDTH + 40) this.alive = false;
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    Sprites.drawAlien(ctx, this.x - cameraX, this.y, this.frame);
  }
}