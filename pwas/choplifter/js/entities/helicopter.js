class Helicopter {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = World.homeBaseX + 48;
    this.y = World.CHOPPER_GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.accelX = 0;
    this.facing = 'left';
    this.turnState = -5;
    this.landSquish = 0;
    this.landed = true;
    this.alive = true;
    this.fuel = 100;
    this.aboard = 0;
    this.shootCooldown = 0;
    this.w = 35;
    this.h = 13;
  }

  turnTarget() {
    if (this.facing === 'down') return 0;
    if (this.facing === 'left') return -5;
    return 5;
  }

  updateTurnState(dt) {
    const target = this.turnTarget();
    if (this.turnState === target) return;

    const diff = target - this.turnState;
    const step = Math.abs(diff) >= 3 ? 2 : 1;
    this.turnState += diff > 0 ? step : -step;

    if ((diff > 0 && this.turnState > target) || (diff < 0 && this.turnState < target)) {
      this.turnState = target;
    }
  }

  updateAccelX(dt, ix) {
    // Original ZP_ACCELX: positive = thrust left, negative = thrust right.
    const target = -ix * 5;
    const ramp = 14 * dt;

    if (Math.abs(ix) > 0.12) {
      if (target > this.accelX) this.accelX = Math.min(target, this.accelX + ramp);
      else this.accelX = Math.max(target, this.accelX - ramp);
    } else {
      const decay = 1 - Math.min(1, dt * 7);
      this.accelX *= decay;
      if (Math.abs(this.accelX) < 0.08) this.accelX = 0;
    }

    this.accelX = Math.max(-5, Math.min(5, this.accelX));
  }

  sideTiltIndex() {
    // chopperSideSpriteTable: index 0 = nose down, 5 = level, 10 = nose up.
    // When turnState < 0 (facing left) the original negates ACCELX before lookup.
    let ax = this.accelX;
    if (this.turnState < 0) ax = -ax;
    return Math.min(10, Math.max(0, Math.round(5 + ax)));
  }

  updateFacing(input) {
    if (input.aimDown || (this.landed && Math.abs(input.x) < 0.12)) {
      this.facing = 'down';
    } else if (input.x < -0.12) {
      this.facing = 'left';
    } else if (input.x > 0.12) {
      this.facing = 'right';
    }
  }

  update(dt, input) {
    if (!this.alive) return;

    const groundY = World.CHOPPER_GROUND_Y;
    const thrust = 280;
    const gravity = 140;
    const maxSpeed = 160;
    const ix = input.x || 0;
    const iy = input.y || 0;
    const wantsLift = iy < -0.15;

    this.updateFacing(input);
    this.updateTurnState(dt);
    this.updateAccelX(dt, ix);

    if (this.landed) {
      if (wantsLift) {
        this.landed = false;
        this.vy = -90;
      } else if (Math.abs(ix) > 0.15) {
        this.vx += ix * 200 * dt;
        this.vx = Math.max(-60, Math.min(60, this.vx));
      } else {
        this.vx *= 0.7;
      }
    } else {
      this.vx += ix * thrust * dt;
      this.vy += iy * thrust * dt;
      this.vy += gravity * dt;
      this.fuel -= 10 * dt;
      if (this.fuel <= 0) {
        this.fuel = 0;
        this.vy += gravity * 0.4 * dt;
      }
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }
    }

    if (!this.landed) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else if (Math.abs(ix) > 0.15) {
      this.x += this.vx * dt;
    }

    if (this.y >= groundY) {
      this.y = groundY;
      if (this.vy > 120) return 'crash';
      if (this.vy > 0) this.vy = 0;
      if (!wantsLift && Math.abs(this.vy) < 1) {
        if (!this.landed) this.landSquish = 0.25;
        this.landed = true;
        this.vx *= 0.5;
      }
    } else {
      this.landed = false;
    }

    if (this.landSquish > 0) this.landSquish -= dt;

    this.x = Math.max(10, Math.min(World.WORLD_WIDTH - 10, this.x));
    this.shootCooldown -= dt;

    if (this.fuel < 15 && Math.random() < 0.02) return 'lowfuel';
    return null;
  }

  gunMuzzle() {
    const o = { x: this.x, y: this.y };
    if (this.facing === 'left') { o.x -= 18; o.y -= 2; }
    else if (this.facing === 'right') { o.x += 18; o.y -= 2; }
    else { o.y += 8; }
    return o;
  }

  shoot(projectiles) {
    if (this.shootCooldown > 0) return false;
    this.shootCooldown = 0.12;
    const muzzle = this.gunMuzzle();
    const speed = 9;
    let vx = 0;
    let vy = 0;
    if (this.facing === 'left') vx = -speed;
    else if (this.facing === 'right') vx = speed;
    else vy = speed;
    projectiles.push(new Projectile(muzzle.x, muzzle.y, vx, vy, 'bullet', false));
    return true;
  }

  canBoard() {
    return this.landed && this.aboard < World.MAX_ABOARD;
  }

  refuel() {
    this.fuel = Math.min(100, this.fuel + 100);
  }

  draw(ctx, cameraX, input = { x: 0 }) {
    if (!this.alive) return;
    Sprites.drawHelicopter(
      ctx,
      this.x - cameraX,
      this.y,
      this.facing,
      this.landed,
      this.aboard,
      this.turnState,
      this.sideTiltIndex(),
      this.landSquish > 0
    );
  }
}