class Jet {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.alive = true;
    this.cooldown = 1 + Math.random() * 2;
    this.speed = 80;
  }

  update(dt, heli, projectiles) {
    if (!this.alive) return;
    this.x += this.dir * this.speed * dt;
    this.cooldown -= dt;

    if (this.cooldown <= 0 && Math.abs(this.x - heli.x) < 120 && Math.abs(this.y - heli.y) < 60) {
      const dx = heli.x - this.x;
      const dy = heli.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      projectiles.push(new Projectile(
        this.x, this.y, (dx / len) * 4, (dy / len) * 4, 'missile', true
      ));
      this.cooldown = 2 + Math.random() * 2;
    }

    if (this.x < -50 || this.x > World.WORLD_WIDTH + 50) this.alive = false;
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    Sprites.drawJet(ctx, this.x - cameraX, this.y, this.dir);
  }
}