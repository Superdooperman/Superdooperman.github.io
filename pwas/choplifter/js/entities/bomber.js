class Bomber {
  constructor(x) {
    this.x = x;
    this.y = 40 + Math.random() * 30;
    this.alive = true;
    this.dir = Math.random() > 0.5 ? 1 : -1;
    this.cooldown = 1.5 + Math.random();
    this.speed = 50;
  }

  update(dt, heli, projectiles) {
    if (!this.alive) return;
    this.x += this.dir * this.speed * dt;
    this.cooldown -= dt;

    if (this.cooldown <= 0) {
      projectiles.push(new Projectile(this.x, this.y, 0, 1.5, 'bomb', true));
      this.cooldown = 2 + Math.random() * 2;
    }

    if (this.x < -60 || this.x > World.WORLD_WIDTH + 60) this.alive = false;
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    Sprites.drawBomber(ctx, this.x - cameraX, this.y);
  }
}