const PlayScene = {
  heli: null,
  hostages: [],
  tanks: [],
  jets: [],
  bombers: [],
  aliens: [],
  projectiles: [],
  explosions: [],
  unloading: [],
  cameraX: 0,
  rescued: 0,
  killed: 0,
  lives: 3,
  score: 0,
  level: 0,
  paused: false,
  frameCount: 0,
  rotorTimer: 0,
  lowFuelWarn: 0,
  heliInvuln: 0,
  levelBanner: 0,
  sortieBanner: 0,
  gameOver: false,
  victoryTimer: 0,
  victoryPending: false,

  TANK_LIMITS: [1, 2, 2, 2],
  JET_LIMITS: [0, 1, 2, 2],
  ALIEN_LIMITS: [0, 0, 1, 2],

  enter() {
    World.reset();
    this.heli = new Helicopter();
    this.hostages = [];
    this.tanks = [];
    this.jets = [];
    this.bombers = [];
    this.aliens = [];
    this.projectiles = [];
    this.explosions = [];
    this.unloading = [];
    this.cameraX = World.WORLD_WIDTH - World.WIDTH;
    this.rescued = 0;
    this.killed = 0;
    this.lives = 3;
    this.score = 0;
    this.level = 0;
    this.paused = false;
    this.frameCount = 0;
    this.heliInvuln = 0;
    this.levelBanner = 0;
    this.sortieBanner = 2.5;
    this.hostageSpawnTimer = 0;
    this.hostageSpawnCursor = 0;
    this.gameOver = false;
    this.victoryTimer = 0;
    this.victoryPending = false;
  },

  sortieNumber() {
    return 3 - this.lives;
  },

  isFinished() {
    return this.gameOver || this.victoryPending;
  },

  checkEndConditions() {
    if (this.rescued >= World.WIN_TARGET) {
      this.rescued = World.WIN_TARGET;
      if (!this.victoryPending) this.victoryPending = true;
      this.victoryTimer = 0;
      return null;
    }
    if (this.rescued + this.killed >= World.WIN_TARGET) {
      this.gameOver = true;
      return { end: true, won: false };
    }
    return null;
  },

  fieldHostageCount() {
    return this.hostages.filter((h) => h.alive).length;
  },

  baseRunnerCount() {
    return this.unloading.filter((h) => h.alive).length;
  },

  totalActiveCount() {
    return this.fieldHostageCount() + this.baseRunnerCount();
  },

  isAtHomeBase() {
    return this.heli.x >= World.homeBaseX + 22 && this.heli.x <= World.homeBaseX + 78;
  },

  fieldCountForBarrack(index) {
    return this.hostages.filter((h) => h.alive && h.barrackIndex === index).length;
  },

  // Trickle hostages from every opened barracks, not a dump from the one under the chopper.
  trySpawnHostage() {
    if (this.totalActiveCount() >= World.MAX_TOTAL_ACTIVE) return;

    if (this.heli.landed && this.isAtHomeBase()) {
      if (this.heli.aboard > 0) this.spawnUnloadingRunner();
      return;
    }

    if (World.hostagesLeft <= 0) return;
    if (this.fieldHostageCount() >= World.MAX_FIELD_HOSTAGES) return;

    const candidates = [];
    for (let i = 0; i < World.barracks.length; i++) {
      const b = World.barracks[i];
      if (!b.burning || b.inside <= 0) continue;
      if (this.fieldCountForBarrack(i) >= World.MAX_OUT_PER_BARRACK) continue;
      candidates.push(i);
    }
    if (!candidates.length) return;

    const start = this.hostageSpawnCursor % candidates.length;
    const idx = candidates[start];
    this.hostageSpawnCursor = start + 1;
    this.spawnOneHostage(idx);
  },

  spawnOneHostage(barrackIndex) {
    if (!World.takeFromBarrack(barrackIndex)) return;
    const b = World.barracks[barrackIndex];
    const door = World.barrackDoor(barrackIndex);
    const h = new Hostage(
      door.x + 2,
      World.GROUND_Y - 2,
      barrackIndex,
      this.hostages.length
    );
    h.state = 'exiting';
    // Out the door first (otherwise they stay hidden inside the sprite), then wander both ways.
    h.exitTarget = b.x + 32 + Math.random() * 90;
    h.runDir = 1;
    this.hostages.push(h);
  },

  spawnUnloadingRunner() {
    if (this.heli.aboard <= 0 || this.rescued >= World.WIN_TARGET) return false;
    const h = new Hostage(
      this.heli.x + 4,
      World.GROUND_Y - 2,
      -1,
      this.unloading.length
    );
    h.state = 'unloading';
    this.unloading.push(h);
    this.heli.aboard--;
    if (this.rescued < World.WIN_TARGET) this.rescued++;
    AudioFX.board();
    if (this.heli.aboard === 0) {
      if (this.level < 3) {
        this.level++;
        this.levelBanner = 2.5;
      }
    }
    return true;
  },

  // Original spawnEnemyVehicles — every 47 frames when outside safe zone
  trySpawnEnemy() {
    const lv = Math.min(this.level, 3);
    const r = Math.floor(Math.random() * 256);

    if (lv === 0) {
      this.trySpawnTank(this.TANK_LIMITS[lv]);
      return;
    }
    if (lv === 1) {
      this.trySpawnJet(this.JET_LIMITS[lv]);
      return;
    }

    if ((r & 0x28) === 0 && this.aliens.length < this.ALIEN_LIMITS[lv]) {
      this.aliens.push(new Alien(this.heli.x - 280 - Math.random() * 80, 28 + Math.random() * 20));
      return;
    }
    if ((r & 0x80) === 0 && this.jets.length < this.JET_LIMITS[lv]) {
      this.jets.push(new Jet(this.heli.x - 220 - Math.random() * 80, 35 + Math.random() * 25, 1));
      return;
    }
    this.trySpawnTank(this.TANK_LIMITS[lv]);
  },

  trySpawnTank(limit) {
    if (this.tanks.length >= limit) return;
    this.tanks.push(new Tank(this.heli.x - 180 - Math.random() * 120));
  },

  trySpawnJet(limit) {
    if (this.jets.length >= limit) {
      this.trySpawnTank(this.TANK_LIMITS[Math.min(this.level, 3)]);
      return;
    }
    this.jets.push(new Jet(this.heli.x - 220 - Math.random() * 80, 35 + Math.random() * 25, 1));
  },

  update(dt) {
    if (Input.consumePause()) this.paused = !this.paused;
    if (this.paused) return null;

    if (this.victoryPending) {
      this.victoryTimer += dt;
      if (this.victoryTimer >= 2) return { end: true, won: true };
      return null;
    }
    if (this.gameOver) return { end: true, won: false };

    Sprites.tick();
    this.frameCount++;
    if (this.heliInvuln > 0) this.heliInvuln -= dt;

    const input = Input.getMovement();
    if (Input.isShooting() && this.heli.shoot(this.projectiles)) AudioFX.shoot();

    const heliEvent = this.heli.update(dt, input);
    if (heliEvent === 'crash') {
      this.killHeli();
      return null;
    }
    if (heliEvent === 'lowfuel') {
      this.lowFuelWarn += dt;
      if (this.lowFuelWarn > 0.5) { AudioFX.warning(); this.lowFuelWarn = 0; }
    }

    if (!this.heli.landed) {
      this.rotorTimer += dt;
      if (this.rotorTimer > 0.12) { AudioFX.rotor(); this.rotorTimer = 0; }
    }

    this.cameraX = Math.max(0, Math.min(
      this.heli.x - (World.WIDTH - 100),
      World.WORLD_WIDTH - World.WIDTH
    ));

    this.hostageSpawnTimer += dt;
    if (this.hostageSpawnTimer >= World.HOSTAGE_SPAWN_INTERVAL) {
      this.hostageSpawnTimer = 0;
      this.trySpawnHostage();
    }
    if (!World.inSafeZone(this.heli.x) && (this.frameCount & 0x2f) === 0) {
      this.trySpawnEnemy();
    }

    if (this.levelBanner > 0) this.levelBanner -= dt;
    if (this.sortieBanner > 0) this.sortieBanner -= dt;

    this.tanks.forEach((t) => t.update(dt, this.heli, this.projectiles));
    this.jets.forEach((j) => j.update(dt, this.heli, this.projectiles));
    this.bombers.forEach((b) => b.update(dt, this.heli, this.projectiles));
    this.aliens.forEach((a) => a.update(dt, this.heli, this.projectiles));
    this.projectiles.forEach((p) => p.update(dt));

    World.barracks.forEach((b, i) => {
      if (b.burning) return;
      const zone = World.barrackHitZone(i);
      this.projectiles.forEach((p) => {
        if (!p.alive || p.fromEnemy || p.type !== 'bullet') return;
        if (p.y < World.GROUND_Y - 22 || p.y > World.GROUND_Y - 2) return;
        if (Collision.pointInRect(p.x, p.y, zone.x, zone.y, zone.w, zone.h)) {
          p.alive = false;
          if (World.igniteBarrack(i)) AudioFX.explosion();
        }
      });
    });

    this.tanks.forEach((t) => {
      if (!t.alive) return;
      this.projectiles.forEach((p) => {
        if (!p.alive || p.fromEnemy || p.type !== 'bullet') return;
        if (Collision.aabb(p.x - 2, p.y - 2, 4, 4, t.x - 12, t.y - 5, 24, 8)) {
          p.alive = false;
          t.alive = false;
          this.explosions.push({ x: t.x, y: t.y, t: 0 });
          AudioFX.explosion();
          this.score += 100;
        }
      });
    });

    this.jets.forEach((j) => {
      if (!j.alive) return;
      this.projectiles.forEach((p) => {
        if (!p.alive || p.fromEnemy) return;
        if (Math.hypot(p.x - j.x, p.y - j.y) < 10) {
          p.alive = false;
          j.alive = false;
          this.explosions.push({ x: j.x, y: j.y, t: 0 });
          AudioFX.explosion();
          this.score += 200;
        }
      });
    });

    this.aliens.forEach((a) => {
      if (!a.alive) return;
      this.projectiles.forEach((p) => {
        if (!p.alive || p.fromEnemy) return;
        if (Math.hypot(p.x - a.x, p.y - a.y) < 8) {
          p.alive = false;
          a.alive = false;
          this.explosions.push({ x: a.x, y: a.y, t: 0 });
          AudioFX.explosion();
          this.score += 250;
        }
      });
    });

    this.unloading.forEach((h) => h.update(dt, this.heli, World.GROUND_Y));
    this.unloading = this.unloading.filter((h) => h.alive);

    if (this.heliInvuln <= 0) {
      this.hostages.forEach((h) => {
        if (!h.alive) return;
        const result = h.update(dt, this.heli, World.GROUND_Y);
        if (result === 'crushed') {
          h.alive = false;
          this.killed++;
          this.explosions.push({ x: h.x, y: h.y, t: 0 });
          AudioFX.explosion();
        } else if (result === 'boarded') {
          AudioFX.board();
        }
      });
    }

    if (this.heliInvuln <= 0) {
      this.projectiles.forEach((p) => {
        if (!p.alive || !p.fromEnemy) return;
        if (Collision.circleRect(p.x, p.y, 4, this.heli.x - 14, this.heli.y - 8, 28, 12)) {
          p.alive = false;
          this.killHeli();
        }
      });
    }

    this.hostages.forEach((h) => {
      if (!h.alive) return;
      this.projectiles.forEach((p) => {
        if (!p.alive || !p.fromEnemy) return;
        if (Collision.pointInRect(p.x, p.y, h.x - 3, h.y - 10, 6, 10)) {
          h.alive = false;
          this.killed++;
        }
      });
    });

    const end = this.checkEndConditions();
    if (end) return end;

    this.explosions.forEach((e) => { e.t += dt; });
    this.explosions = this.explosions.filter((e) => e.t < 0.4);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.hostages = this.hostages.filter((h) => h.alive);
    this.tanks = this.tanks.filter((t) => t.alive);
    this.jets = this.jets.filter((j) => j.alive);
    this.aliens = this.aliens.filter((a) => a.alive);

    return null;
  },

  killHeli() {
    if (!this.heli.alive || this.heliInvuln > 0) return;

    if (this.heli.aboard > 0) {
      this.killed += this.heli.aboard;
      this.heli.aboard = 0;
    }

    this.hostages.forEach((h) => {
      if (h.state === 'boarding') {
        h.state = 'wandering';
        h.boardTimer = 0;
      }
    });

    this.explosions.push({ x: this.heli.x, y: this.heli.y, t: 0 });
    AudioFX.explosion();
    this.lives--;

    if (this.lives <= 0) {
      this.heli.alive = false;
      this.gameOver = true;
      return;
    }

    this.heli.reset();
    this.heli.fuel = 50;
    this.heliInvuln = 2;
    this.sortieBanner = 2.5;
  },

  draw(ctx) {
    Sprites.clear(ctx, World.WIDTH, World.HEIGHT);
    Sprites.drawGround(ctx, this.cameraX, World.WORLD_WIDTH, World.GROUND_Y);
    Sprites.drawHomeBase(ctx, World.homeBaseX - this.cameraX, World.GROUND_Y);

    this.tanks.forEach((t) => t.draw(ctx, this.cameraX));
    this.jets.forEach((j) => j.draw(ctx, this.cameraX));
    this.bombers.forEach((b) => b.draw(ctx, this.cameraX));
    this.aliens.forEach((a) => a.draw(ctx, this.cameraX));

    this.hostages.forEach((h) => h.draw(ctx, this.cameraX));
    this.unloading.forEach((h) => h.draw(ctx, this.cameraX));

    World.barracks.forEach((b) => {
      Sprites.drawBarracks(ctx, b.x - this.cameraX, World.GROUND_Y, b.burning);
    });

    this.projectiles.forEach((p) => p.draw(ctx, this.cameraX));
    this.explosions.forEach((e) => Sprites.drawExplosion(ctx, e.x - this.cameraX, e.y, Math.floor(e.t * 8)));
    this.heli.draw(ctx, this.cameraX, Input.getMovement());

    if (this.heli.landed && this.isAtHomeBase() && this.heli.aboard > 0) {
      Sprites.drawText(ctx, 'UNLOADING...', 140, 50, 8, COLORS.orange, true);
    }

    if (this.sortieBanner > 0) {
      const sortieNames = ['FIRST SORTIE', 'SECOND SORTIE', 'THIRD SORTIE'];
      Sprites.drawText(ctx, sortieNames[this.sortieNumber()] || 'FINAL SORTIE', 140, 44, 10, COLORS.orange, true);
    } else if (this.levelBanner > 0) {
      Sprites.drawText(ctx, `LEVEL ${this.level + 1}`, 140, 44, 10, COLORS.orange, true);
    }

    if (this.victoryPending) {
      Sprites.drawText(ctx, 'ALL HOSTAGES RESCUED!', 140, 48, 10, COLORS.white, true);
    }

    HUD.draw(ctx, {
      heli: this.heli,
      rescued: this.rescued,
      killed: this.killed,
      left: World.hostagesLeft,
      fieldCount: this.fieldHostageCount(),
      level: this.level,
      lives: this.lives,
      paused: this.paused,
    });
  },

  getScore() { return this.score; },
};