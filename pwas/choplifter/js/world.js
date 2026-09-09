const World = {
  WIDTH: 280,
  HEIGHT: 192,
  GROUND_Y: 160,
  CHOPPER_GROUND_Y: 160,
  WORLD_WIDTH: 1600,
  WIN_TARGET: 64,
  // Max 5 per trip; max 5 wandering in field; 16 total field+runners on screen
  MAX_ABOARD: 5,
  MAX_FIELD_HOSTAGES: 5,
  MAX_TOTAL_ACTIVE: 16,
  HOSTAGES_PER_BARRACK: 16,
  HOUSE_SPACING: 220,

  // Original layout: base on the right, fly left to rescue
  homeBaseX: 1430,
  basePadW: 98,
  doorX: 1512,
  fenceX: 1174,

  barracks: [
    { x: 220, burning: false, inside: 16 },
    { x: 440, burning: false, inside: 16 },
    { x: 660, burning: false, inside: 16 },
    { x: 880, burning: false, inside: 16 },
  ],

  hostagesLeft: 64,

  reset() {
    this.hostagesLeft = 64;
    this.barracks.forEach((b) => {
      b.burning = false;
      b.inside = 16;
    });
  },

  // Original: house index = CHOP_POS_X_H - FARHOUSE_X_H (0..3 when over a house column)
  houseIndexAt(x) {
    const first = this.barracks[0].x;
    const last = this.barracks[3].x + this.HOUSE_SPACING;
    if (x < first || x >= last) return -1;
    return Math.min(3, Math.floor((x - first) / this.HOUSE_SPACING));
  },

  barrackDoor(index) {
    const b = this.barracks[index];
    return { x: b.x + 10, y: this.GROUND_Y - 10, w: 8, h: 10 };
  },

  barrackHitZone(index) {
    const door = this.barrackDoor(index);
    return { x: door.x, y: door.y - 4, w: door.w, h: door.h + 6 };
  },

  igniteBarrack(index) {
    const b = this.barracks[index];
    if (b.burning) return false;
    b.burning = true;
    return true;
  },

  takeFromBarrack(index) {
    const b = this.barracks[index];
    if (!b.burning || b.inside <= 0 || this.hostagesLeft <= 0) return false;
    b.inside--;
    this.hostagesLeft--;
    return true;
  },

  inSafeZone(x) {
    return x > this.fenceX;
  },
};