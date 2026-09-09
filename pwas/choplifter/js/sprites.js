const COLORS = {
  black: '#000000',
  green: '#33ff33',
  darkGreen: '#1a8c1a',
  orange: '#ffaa00',
  white: '#eeffee',
  red: '#ff3333',
  blue: '#4488ff',
  gray: '#669966',
};

let animTick = 0;
const spriteImages = {};
let spritesReady = false;

const Sprites = {
  tick() { animTick++; },

  async load() {
    if (typeof SpriteAtlas === 'undefined') {
      spritesReady = true;
      return;
    }
    const entries = Object.entries(SpriteAtlas);
    await Promise.all(entries.map(([name, meta]) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { spriteImages[name] = img; resolve(); };
      img.onerror = reject;
      img.src = meta.url;
    })));
    spritesReady = true;
  },

  ready() { return spritesReady; },

  drawAtlas(ctx, name, x, y, flipH = false, anchor = 'bottom-center') {
    const img = spriteImages[name];
    const meta = SpriteAtlas && SpriteAtlas[name];
    if (!img || !meta) return false;

    const w = meta.w;
    const h = meta.h;
    let dx = x;
    let dy = y;
    if (anchor === 'bottom-center') {
      dx = x - w / 2;
      dy = y - h;
    } else if (anchor === 'center') {
      dx = x - w / 2;
      dy = y - h / 2;
    } else if (anchor === 'bottom-left') {
      dx = x;
      dy = y - h;
    }

    ctx.save();
    if (flipH) {
      ctx.translate(dx + w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
    } else {
      ctx.drawImage(img, dx, dy);
    }
    ctx.restore();
    return true;
  },

  clear(ctx, w, h) {
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(0, 0, w, h);
  },

  drawGround(ctx, cameraX, worldWidth, groundY) {
    ctx.fillStyle = COLORS.darkGreen;
    ctx.fillRect(0, groundY, 280, 192 - groundY);
    ctx.strokeStyle = COLORS.green;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(280, groundY);
    ctx.stroke();
    for (let x = -((cameraX | 0) % 16); x < 280; x += 16) {
      ctx.fillStyle = COLORS.green;
      ctx.fillRect(x, groundY + 3, 6, 2);
    }
  },

  drawHomeBase(ctx, baseX, groundY) {
    const padW = World.basePadW || 98;
    const padX = baseX + 4;

    ctx.fillStyle = COLORS.green;
    ctx.fillRect(padX, groundY - 5, padW, 5);
    ctx.fillStyle = COLORS.darkGreen;
    ctx.fillRect(padX, groundY - 5, 3, 5);
    ctx.fillRect(padX + padW - 3, groundY - 5, 3, 5);

    const bx = baseX + 16;
    const bw = 52;
    const bh = 12;
    const by = groundY - 2 - bh;

    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(bx, groundY - 2, bw, 2);
    ctx.fillRect(bx + 2, by + 2, bw - 4, 1);
    ctx.fillRect(bx + 2, by + 5, 8, 5);
    ctx.fillRect(bx + bw - 10, by + 5, 8, 5);
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(bx + 22, by + 5, 8, 7);

    ctx.fillStyle = COLORS.white;
    ctx.font = '6px monospace';
    ctx.fillText('USPS', bx + 4, by + 9);

    const poleX = baseX + 4 + padW - 10;
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(poleX, groundY - 18, 2, 18);
    const flagY = groundY - 18 + (animTick % 2);
    ctx.fillStyle = animTick % 2 ? COLORS.white : COLORS.orange;
    ctx.fillRect(poleX + 2, flagY, 10, 5);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(poleX + 2, flagY + 2, 10, 1);
  },

  drawBarracks(ctx, x, groundY, burning) {
    const w = 26;
    const left = x + 1;
    const roofH = 5;
    const bodyTop = groundY - 2 - roofH - 6;

    ctx.fillStyle = COLORS.white;
    ctx.fillRect(left, groundY - 2, w, 2);

    ctx.fillStyle = burning ? '#cc7700' : COLORS.orange;
    for (let i = 0; i < roofH; i++) {
      ctx.fillRect(left + 2 + i, bodyTop + i, w - 4 - i * 2, 1);
    }

    ctx.fillStyle = burning ? '#aa6600' : '#dd9900';
    ctx.fillRect(left + 2, bodyTop + roofH, w - 4, 6);

    ctx.fillStyle = COLORS.black;
    ctx.fillRect(left + 10, groundY - 8, 6, 6);

    if (!burning) {
      ctx.fillRect(left + 4, bodyTop + roofH + 1, 3, 3);
      ctx.fillRect(left + 19, bodyTop + roofH + 1, 3, 3);
    } else {
      const fireFrame = animTick % 2;
      const fireFlip = ((animTick >> 1) & 1) === 1;
      const fx = left + 12;
      const fy = groundY - 13;
      ctx.fillStyle = fireFrame ? COLORS.white : '#ffdd88';
      ctx.fillRect(fx - 2, fy, 6, 5);
      ctx.fillRect(fx + (fireFlip ? 1 : -1), fy - 2, 4, 3);
      if (spriteImages.house_fire_0) {
        this.drawAtlas(ctx, `house_fire_${fireFrame}`, fx + 3, groundY - 8, fireFlip, 'bottom-center');
      }
    }
  },

  chopperBodyName(absTurn, facing, sideTilt, squish) {
    if (squish) {
      return absTurn >= 5 || facing !== 'down' ? 'chopper_side_squish' : 'chopper_headon_squish';
    }
    if (absTurn >= 5) {
      const idx = Math.min(10, Math.max(0, sideTilt));
      return `chopper_side_${idx}`;
    }
    if (absTurn === 0 && facing === 'down') return 'chopper_headon';
    const rotIdx = Math.min(4, Math.max(1, absTurn));
    return `chopper_headon_rot_${rotIdx}`;
  },

  drawHelicopter(ctx, x, y, facing, landed, aboard, turnState = 0, sideTilt = 5, squish = false) {
    const rotorFrame = animTick % 3;
    const rotorName = `rotor_${rotorFrame}`;
    const absTurn = Math.abs(turnState);
    const flipH = turnState < 0 || facing === 'left';
    const bodyName = this.chopperBodyName(absTurn, facing, sideTilt, squish);
    const bodyMeta = SpriteAtlas && SpriteAtlas[bodyName];
    const bodyH = bodyMeta ? bodyMeta.h : 13;
    const rotorY = y - bodyH;

    this.drawAtlas(ctx, bodyName, x, y, flipH, 'bottom-center');

    if (!landed) {
      this.drawAtlas(ctx, rotorName, x, rotorY, flipH, 'center');
    }

    if (absTurn <= 1 || facing === 'down') {
      const tailFrame = animTick % 4;
      const tailName = `tail_rotor_${tailFrame}`;
      const tailX = flipH ? x + 4 : x - 4;
      const tailY = y - Math.round(bodyH * 0.55);
      this.drawAtlas(ctx, tailName, tailX, tailY, flipH, 'center');
    }

    if (aboard > 0) {
      ctx.fillStyle = COLORS.white;
      ctx.font = '6px monospace';
      ctx.fillText(String(aboard), x - 3, y - 6);
    }
  },

  drawAlien(ctx, x, y, frame) {
    const phase = Math.floor(frame) % 2;
    if (this.drawAtlas(ctx, 'alien', x, y + (phase ? 1 : 0), false, 'center')) return;
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(x - 6, y - 5, 12, 10);
  },

  drawHostage(ctx, x, y, state, frame) {
    let name = 'hostage_run_0';
    const phase = Math.floor(frame) % 4;

    if (state === 'waving') name = `hostage_wave_${phase % 3}`;
    else if (state === 'boarding') name = `hostage_load_${phase % 2}`;
    else if (state === 'unloading' || state === 'running' || state === 'outside') {
      name = `hostage_run_${phase % 4}`;
    }

    if (!this.drawAtlas(ctx, name, x, y, false, 'bottom-center')) {
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(x - 2, y - 9, 4, 9);
    }
  },

  drawTank(ctx, x, y) {
    const tread = animTick % 2 ? 'tank_tread_1' : 'tank_tread_0';
    if (this.drawAtlas(ctx, tread, x, y, false, 'bottom-center')) return;
    if (this.drawAtlas(ctx, 'tank_body', x, y - 2, false, 'bottom-center')) return;
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(x - 8, y - 4, 16, 5);
  },

  drawJet(ctx, x, y, dir) {
    if (this.drawAtlas(ctx, 'jet', x, y, dir < 0, 'center')) return;
    ctx.fillStyle = COLORS.gray;
    ctx.fillRect(x - 11, y - 4, 22, 7);
  },

  drawBomber(ctx, x, y) {
    this.drawJet(ctx, x, y, 1);
  },

  drawBullet(ctx, x, y, vx, vy) {
    if (this.drawAtlas(ctx, 'bullet', x, y, vx < 0, 'center')) return;
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(x - 2, y - 1, 4, 3);
  },

  drawMissile(ctx, x, y) {
    this.drawBullet(ctx, x, y, 1, 0);
  },

  drawBomb(ctx, x, y) {
    if (this.drawAtlas(ctx, 'bomb', x, y, false, 'center')) return;
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  drawExplosion(ctx, x, y, frame) {
    const idx = Math.min(2, Math.floor(frame / 2));
    const name = `explosion_${idx}`;
    if (this.drawAtlas(ctx, name, x, y, false, 'center')) return;
    const r = 3 + frame * 4;
    ctx.fillStyle = frame % 2 ? COLORS.orange : COLORS.white;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  drawText(ctx, text, x, y, size = 8, color = COLORS.green, center = false) {
    ctx.fillStyle = color;
    ctx.font = `${size}px monospace`;
    if (center) {
      const w = ctx.measureText(text).width;
      ctx.fillText(text, x - w / 2, y);
    } else {
      ctx.fillText(text, x, y);
    }
  },
};