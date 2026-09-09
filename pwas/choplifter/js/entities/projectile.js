class Projectile {
  constructor(x, y, vx, vy, type, fromEnemy = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.fromEnemy = fromEnemy;
    this.alive = true;
    this.w = type === 'bomb' ? 6 : 4;
    this.h = type === 'bomb' ? 6 : 4;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    if (this.type === 'bomb') this.vy += 0.15 * dt * 60;
    if (this.x < -20 || this.x > World.WORLD_WIDTH + 20 || this.y > World.HEIGHT + 20) {
      this.alive = false;
    }
  }

  draw(ctx, cameraX) {
    const sx = this.x - cameraX;
    if (this.type === 'bullet') Sprites.drawBullet(ctx, sx, this.y, this.vx, this.vy);
    else if (this.type === 'missile') Sprites.drawMissile(ctx, sx, this.y);
    else Sprites.drawBomb(ctx, sx, this.y);
  }
}