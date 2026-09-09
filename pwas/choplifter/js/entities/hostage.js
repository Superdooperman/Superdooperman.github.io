class Hostage {
  constructor(x, y, barrackIndex, index) {
    this.x = x;
    this.y = y;
    this.barrackIndex = barrackIndex;
    this.index = index;
    this.state = 'outside';
    this.alive = true;
    this.animFrame = index;
    this.runDir = Math.random() < 0.5 ? -1 : 1;
    this.wanderTimer = Math.random() * 2;
    this.waveTimer = 0;
    this.exitTarget = x;
    this.runToBase = false;
  }

  // Original updateHostagesProxCheckRight/Left — crush only directly under skids
  boardingCheck(heli) {
    const dx = this.x - heli.x;
    if (dx >= 0) {
      if (dx < 8) return 'crush';
      if (dx < 20) return 'board';
      return 'none';
    }
    if (dx >= -8) return 'crush';
    if (dx >= -20) return 'board';
    return 'none';
  }

  chopperNear(heli) {
    return Math.abs(heli.x - this.x) < 95 && Math.abs(heli.y - this.y) < 55;
  }

  chopperFull(heli) {
    return heli.aboard >= World.MAX_ABOARD;
  }

  // Original ChopperFullRight/Left: run away on the approach side
  redirectWhenFull(heli, runSpeed) {
    const dx = this.x - heli.x;
    this.runDir = dx >= 0 ? 1 : -1;
    this.runToBase = true;
    this.state = 'running';
    this.x += this.runDir * runSpeed;
  }

  runTowardBase(runSpeed) {
    this.runDir = 1;
    this.x += runSpeed;
    this.runToBase = true;
    this.state = 'running';
  }

  // Original: boarding proximity only checked when chopper is landed
  checkLandedProximity(heli, runSpeed) {
    if (!heli.landed || !heli.alive || this.state === 'unloading' || this.state === 'exiting') {
      return null;
    }

    const check = this.boardingCheck(heli);
    if (check === 'crush') return 'crushed';
    if (check === 'board') {
      if (heli.canBoard()) {
        heli.aboard++;
        this.alive = false;
        return 'boarded';
      }
      this.redirectWhenFull(heli, runSpeed);
    }
    return null;
  }

  update(dt, heli, groundY) {
    if (!this.alive) return;
    this.y = groundY - 2;
    this.animFrame += dt * 12;
    const runSpeed = 70 * dt;

    if (heli.canBoard()) this.runToBase = false;

    const prox = this.checkLandedProximity(heli, runSpeed);
    if (prox) return prox;

    if (this.state === 'exiting') {
      this.x += runSpeed;
      if (this.x >= this.exitTarget) {
        this.state = 'wandering';
        this.wanderTimer = 0.4 + Math.random();
      }
      return;
    }

    if (this.state === 'unloading') {
      this.x += runSpeed;
      if (this.x >= World.doorX) {
        this.alive = false;
        return 'unloaded';
      }
      return;
    }

    if (this.state === 'wandering') {
      if (!heli.alive) {
        this.x -= runSpeed;
        return;
      }

      if (!heli.landed && this.chopperNear(heli)) {
        this.state = 'waving';
        this.waveTimer = 0;
        return;
      }

      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.runDir = Math.random() < 0.5 ? -1 : 1;
        this.wanderTimer = 0.6 + Math.random() * 2.5;
      }

      if (this.barrackIndex >= 0) {
        const anchor = World.barracks[this.barrackIndex].x + 24;
        if (this.x < anchor - 35) this.runDir = 1;
        if (this.x > anchor + 45) this.runDir = -1;
      }

      this.x += this.runDir * runSpeed * 0.45;

      // Original: don't run to chopper when it's full (HOSTAGES_LOADED == $10)
      if (heli.landed && heli.canBoard() && Math.abs(heli.x - this.x) < 70) {
        this.state = 'running';
      }
      return;
    }

    if (this.state === 'waving') {
      this.waveTimer += dt;
      if (heli.landed && heli.canBoard() && Math.abs(heli.x - this.x) < 80) {
        this.state = 'running';
        return;
      }
      if (!this.chopperNear(heli) || (this.waveTimer > 2 && Math.random() < 0.03)) {
        this.state = 'wandering';
        this.wanderTimer = 0.5;
      }
      return;
    }

    if (this.state === 'running') {
      if (!heli.alive) {
        this.state = 'wandering';
        this.runToBase = false;
        return;
      }

      if (this.runToBase) {
        this.x += this.runDir * runSpeed;
        if (Math.abs(this.x - heli.x) > 40) {
          this.runToBase = false;
          this.state = 'wandering';
          this.wanderTimer = 0.5;
        }
        return;
      }

      if (!heli.landed) {
        if (this.chopperNear(heli)) this.state = 'waving';
        return;
      }

      const dx = heli.x - this.x;
      const absDx = Math.abs(dx);
      this.runDir = Math.sign(dx) || 1;
      const approachSpeed = absDx < 24 ? Math.min(runSpeed * 0.35, Math.max(runSpeed * 0.15, absDx * 0.25)) : runSpeed;
      this.x += this.runDir * approachSpeed;
      return;
    }

    return null;
  }

  isHiddenByBarrack() {
    if (this.barrackIndex < 0 || this.state === 'unloading') return false;
    if (this.state !== 'exiting') return false;
    const b = World.barracks[this.barrackIndex];
    return this.x < b.x + 22;
  }

  draw(ctx, cameraX) {
    if (!this.alive) return;
    if (this.isHiddenByBarrack()) return;
    const drawState = this.state === 'outside' || this.state === 'exiting' || this.state === 'wandering'
      ? 'running'
      : this.state;
    Sprites.drawHostage(ctx, this.x - cameraX, this.y, drawState, this.animFrame);
  }
}