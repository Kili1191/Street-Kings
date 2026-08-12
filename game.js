/* ============================================================
   DESI STREETS  —  an open-world, GTA-style top-down driver
   set in an Indian city. Single-file vanilla JS + Canvas.
   ============================================================ */
(() => {
'use strict';

// ---------- Canvas ----------
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const mm = document.getElementById('minimap');
const mctx = mm.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize); resize();

// ---------- Small helpers ----------
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b));
const pick = a => a[randi(0, a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % TAU) - Math.PI; if (d < -Math.PI) d += TAU; return a + d * t; };
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

// ---------- World grid ----------
const TILE = 44;
const P = 9;            // block period in tiles
const R = 2;            // road width in tiles
const GW = 108, GH = 108;      // grid size (tiles)
const WORLD_W = GW * TILE, WORLD_H = GH * TILE;
const isRoadTile = (tx, ty) => ((tx % P) < R) || ((ty % P) < R);
const isRoadPx = (x, y) => {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return false;
  return isRoadTile(Math.floor(x / TILE), Math.floor(y / TILE));
};
// lane centres
const laneCoords = [];
for (let k = 0; k * P < GW + P; k++) { laneCoords.push((k * P + 0.5) * TILE, (k * P + 1.5) * TILE); }
const nearestLane = c => { let best = laneCoords[0], bd = 1e9; for (const l of laneCoords) { const d = Math.abs(l - c); if (d < bd) { bd = d; best = l; } } return best; };
const inRoadBand = c => { const t = Math.floor(c / TILE); return (((t % P) + P) % P) < R; };

// ---------- Buildings (precomputed) ----------
const PALETTE = ['#c86b6b','#d98e4a','#c7a34f','#6f9e6b','#5f8fa6','#8a6fa8','#b56f8f','#a86b5a','#7a8fa0','#cf9a5c'];
const ROOF = '#2b2b34';
const SHOP_NAMES = ['Sharma Kirana','Gupta Sweets','Apna Dhaba','Chai Point','Krishna Medical',
  'Bombay Tailors','Ganesh Motors','Lucky Cyber Café','Balaji Traders','Annapurna Tiffin',
  'Royal Barber','Shiv Auto Parts','New Delhi Xerox','Om Sai Store','Paan Corner',
  'Maa Ka Aashirwad','Star Mobile','Verma Hardware','Taj Cloth House','Jai Hind Garage'];
const buildings = [];
function genCity() {
  const blocksX = Math.ceil(GW / P), blocksY = Math.ceil(GH / P);
  for (let bx = 0; bx < blocksX; bx++) for (let by = 0; by < blocksY; by++) {
    const x0 = (bx * P + R) * TILE, y0 = (by * P + R) * TILE;
    const w = (P - R) * TILE, h = (P - R) * TILE;
    if (x0 + w > WORLD_W || y0 + h > WORLD_H) continue;
    const nx = Math.random() < .5 ? 1 : 2, ny = Math.random() < .5 ? 1 : 2;
    const gap = 6, cw = (w - gap * (nx - 1)) / nx, ch = (h - gap * (ny - 1)) / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const pad = rand(2, 6);
      buildings.push({
        x: x0 + i * (cw + gap) + pad, y: y0 + j * (ch + gap) + pad,
        w: cw - pad * 2, h: ch - pad * 2,
        c: pick(PALETTE), shade: rand(-.12, .12),
        name: Math.random() < .5 ? pick(SHOP_NAMES) : null,
        tank: Math.random() < .5
      });
    }
  }
}
genCity();

// ---------- Audio (WebAudio, no assets) ----------
const AudioSys = {
  ctx: null, master: null, engineOsc: null, engineGain: null, muted: false,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = .5; this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.frequency.value = 60; this.engineOsc.start();
    } catch (e) { this.ctx = null; }
  },
  engine(speed, moving) {
    if (!this.ctx || this.muted) { if (this.engineGain) this.engineGain.gain.value = 0; return; }
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(moving ? .06 : 0, t, .1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed * 90, t, .08);
  },
  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  },
  horn() { this.blip(340, .35, 'sawtooth', .25); setTimeout(() => this.blip(300, .3, 'sawtooth', .22), 60); },
  crash() { if (!this.ctx || this.muted) return; const t = this.ctx.currentTime, b = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, 4410, 44100), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    b.buffer = buf; const g = this.ctx.createGain(); g.gain.value = .3; b.connect(g); g.connect(this.master); b.start(t); },
  cash() { this.blip(880, .08, 'sine', .3); setTimeout(() => this.blip(1320, .12, 'sine', .3), 70); },
  siren(on) {
    if (!this.ctx) return;
    if (on && !this._siren && !this.muted) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 700; lfo.frequency.value = 2; lg.gain.value = 250;
      lfo.connect(lg); lg.connect(o.frequency); g.gain.value = .05; o.connect(g); g.connect(this.master);
      o.start(); lfo.start(); this._siren = { o, lfo, g };
    } else if (!on && this._siren) { try { this._siren.o.stop(); this._siren.lfo.stop(); } catch (e) {} this._siren = null; }
  }
};

// ---------- Input ----------
const keys = {};
const held = { L: 0, R: 0, U: 0, D: 0, act: 0, brake: 0, horn: 0 };
addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'f' || e.key === 'F') tryEnterExit();
  if (e.key === 'm' || e.key === 'M') toggleMute();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
function readInput() {
  held.U = (keys['w'] || keys['arrowup']) ? 1 : 0;
  held.D = (keys['s'] || keys['arrowdown']) ? 1 : 0;
  held.L = (keys['a'] || keys['arrowleft']) ? 1 : 0;
  held.R = (keys['d'] || keys['arrowright']) ? 1 : 0;
  held.brake = keys[' '] ? 1 : 0;
  held.horn = (keys['h']) ? 1 : 0;
}
// touch
(function touch() {
  const T = document.getElementById('touch');
  if (matchMedia('(hover:none)').matches) T.classList.add('on');
  const bind = (id, k) => {
    const el = document.getElementById(id);
    const on = e => { e.preventDefault(); tHeld[k] = 1; if (k === 'act') tryEnterExit(); };
    const off = e => { e.preventDefault(); tHeld[k] = 0; };
    el.addEventListener('touchstart', on); el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
  };
  window.tHeld = { L: 0, R: 0, U: 0, D: 0, brake: 0 };
  bind('tLeft', 'L'); bind('tRight', 'R'); bind('tGas', 'U'); bind('tBrake', 'D'); bind('tAct', 'act');
})();

// ---------- Entities ----------
const CAR_TYPES = {
  auto:   { w: 24, h: 34, top: 3.2, acc: 7,  col: ['#f4c20d'], name: 'Auto Rickshaw', canopy: true },
  scooter:{ w: 16, h: 30, top: 3.6, acc: 8,  col: ['#d9d9d9','#c0392b','#2d6cdf'], name: 'Scooter', bike: true },
  hatch:  { w: 30, h: 52, top: 4.0, acc: 6,  col: ['#e74c3c','#ecf0f1','#3498db','#f1c40f','#2ecc71'], name: 'Hatchback' },
  sedan:  { w: 32, h: 60, top: 4.4, acc: 5.5,col: ['#ffffff','#2c3e50','#7f8c8d','#c0392b'], name: 'Sedan' },
  suv:    { w: 36, h: 66, top: 4.0, acc: 5,  col: ['#111417','#4a4e69','#6b705c'], name: 'SUV' },
  truck:  { w: 40, h: 82, top: 3.2, acc: 3.5,col: ['#2980b9','#e67e22','#16a085'], name: 'Lorry', truck: true },
  auto2:  { w: 24, h: 34, top: 3.2, acc: 7,  col: ['#1abc9c'], name: 'Auto Rickshaw', canopy: true }
};
const TYPE_KEYS = ['auto','auto2','scooter','hatch','hatch','sedan','sedan','suv','truck'];

function makeTrafficCar() {
  const vertical = Math.random() < .5;
  let x, y, dir;
  if (vertical) { x = pick(laneCoords); y = rand(0, WORLD_H); dir = Math.random() < .5 ? 1 : 3; }
  else { y = pick(laneCoords); x = rand(0, WORLD_W); dir = Math.random() < .5 ? 0 : 2; }
  const tk = pick(TYPE_KEYS), t = CAR_TYPES[tk];
  return { x, y, dir, vertical, type: tk, w: t.w, h: t.h, col: pick(t.col),
    angle: dir * Math.PI / 2, speed: rand(1.1, 2.2), ai: true, cool: 0, hp: 1 };
}
function makePed(x, y, cow) {
  const skin = ['#8d5524','#a86b3c','#c68642','#7a4a22'];
  const cloth = ['#e74c3c','#2980b9','#27ae60','#f39c12','#8e44ad','#e67e22','#16a085','#d35400'];
  return { x, y, angle: rand(0, TAU), t: rand(0, 100), cow: !!cow,
    skin: pick(skin), cloth: pick(cloth), dead: false,
    speed: cow ? rand(.15, .4) : rand(.4, .9), turn: 0 };
}

// player + world state
const cam = { x: 0, y: 0 };
let player, cars = [], peds = [], cops = [], pickups = [], splats = [], fx = [];
let cash = 0, wanted = 0, wantedTimer = 0, gameOn = false;
let mission = null;
const START = { x: (2 * P + 0.5) * TILE, y: (2 * P + 1.5) * TILE };

function newPlayer(inCar) {
  player = { x: START.x, y: START.y, angle: -Math.PI / 2,
    speed: 0, hp: 100, fuel: 100, onFoot: !inCar, vehicle: null,
    car: inCar ? { x: START.x, y: START.y, angle: -Math.PI / 2, speed: 0, type: 'hatch',
      w: CAR_TYPES.hatch.w, h: CAR_TYPES.hatch.h, col: '#e74c3c' } : null,
    inv: 0, dmgCool: 0 };
  if (inCar) player.vehicle = player.car;
}

function spawnWorld() {
  cars = []; peds = []; cops = []; pickups = []; splats = []; fx = [];
  cash = 0; wanted = 0; wantedTimer = 0; mission = null;
  for (let i = 0; i < 70; i++) cars.push(makeTrafficCar());
  for (let i = 0; i < 90; i++) {
    // peds along road edges / jaywalking
    const c = makeTrafficCar(); peds.push(makePed(c.x + rand(-30, 30), c.y + rand(-30, 30), Math.random() < .08));
  }
  newMission();
}

// ---------- Missions ----------
const MJOBS = [
  ['Auto fare', 'Pick up the passenger', 'Drop them at the drop-off'],
  ['Tiffin run', 'Grab the tiffin box', 'Deliver the hot lunch'],
  ['Chai delivery', 'Load the chai crates', 'Get the chai there before it goes cold'],
  ['Courier gig', 'Collect the parcel', 'Deliver the parcel across town'],
  ['Sweet box', 'Pick up the mithai', 'Drop the sweets for the wedding']
];
function roadPoint() { // a random point sitting on a road
  for (let i = 0; i < 200; i++) {
    const x = rand(TILE, WORLD_W - TILE), y = rand(TILE, WORLD_H - TILE);
    if (isRoadPx(x, y)) return { x, y };
  } return { x: START.x, y: START.y };
}
function newMission() {
  const j = pick(MJOBS), a = roadPoint();
  mission = { job: j, stage: 0, from: a, to: null, reward: randi(120, 460) };
  pickups = [{ x: a.x, y: a.y, kind: 'pick' }];
  setMissionText();
}
function setMissionText() {
  const el = document.getElementById('mtxt');
  if (!mission) { el.textContent = '—'; return; }
  el.textContent = `${mission.job[0]}: ${mission.stage === 0 ? mission.job[1] : mission.job[2]}  (₹${mission.reward})`;
}
function advanceMission() {
  if (mission.stage === 0) {
    mission.stage = 1; const b = roadPoint(); mission.to = b;
    pickups = [{ x: b.x, y: b.y, kind: 'drop' }];
    AudioSys.cash(); toast('PICKED UP'); setMissionText();
  } else {
    cash += mission.reward; AudioSys.cash(); toast('₹' + mission.reward + ' EARNED', '#8ef58e');
    newMission();
  }
}

// ---------- Enter / exit vehicles ----------
function tryEnterExit() {
  if (!gameOn) return;
  AudioSys.init();
  if (player.onFoot) {
    // find nearest car within reach
    let best = null, bd = 60 * 60;
    for (const c of cars) { const d = dist2(player.x, player.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
    if (best) {
      const jacked = best.ai && best.speed > 0.2;
      player.onFoot = false; player.vehicle = best; best.ai = false; best.speed = 0;
      if (jacked) { crime(1); toast('CARJACKED!', '#ff9f43'); }
      AudioSys.blip(220, .1, 'square', .2);
    }
  } else {
    // exit
    const v = player.vehicle;
    player.onFoot = true; player.x = v.x + Math.cos(v.angle + Math.PI / 2) * 30; player.y = v.y + Math.sin(v.angle + Math.PI / 2) * 30;
    v.ai = true; v.speed = 0; v.vertical = Math.abs(Math.cos(v.angle)) < .5;
    v.dir = v.vertical ? (Math.sin(v.angle) > 0 ? 1 : 3) : (Math.cos(v.angle) > 0 ? 0 : 2);
    player.vehicle = null; AudioSys.blip(180, .1, 'square', .2);
  }
}

// ---------- Crime / wanted ----------
function crime(amount) {
  wanted = clamp(wanted + amount, 0, 5); wantedTimer = 14;
  updateStars();
  if (wanted >= 1 && cops.length < wanted + 1) spawnCop();
}
function spawnCop() {
  const p = roadPoint();
  // spawn off-screen-ish
  const c = { x: p.x, y: p.y, angle: 0, speed: 0, type: 'suv', w: CAR_TYPES.suv.w, h: CAR_TYPES.suv.h,
    col: '#1a3a6b', cop: true, hp: 1 };
  cops.push(c);
}
function updateStars() {
  let s = ''; for (let i = 0; i < 5; i++) s += i < wanted ? '★' : '';
  document.getElementById('stars').textContent = s;
  AudioSys.siren(wanted > 0);
}

// ---------- FX ----------
function toast(text, color) {
  const b = document.getElementById('toastBig');
  b.textContent = text; b.style.color = color || '#fff';
  b.style.opacity = 1; b.style.transform = 'translateY(-10px) scale(1.05)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { b.style.opacity = 0; b.style.transform = 'translateY(0) scale(1)'; }, 1100);
}
let hintTimer = 0;
function hint(text) { const el = document.getElementById('hint'); el.textContent = text; el.style.opacity = 1; hintTimer = .1; }
function burst(x, y, color, n) { for (let i = 0; i < (n || 8); i++) fx.push({ x, y, vx: rand(-3, 3), vy: rand(-3, 3), life: 1, c: color }); }

// ---------- Vehicle physics (player) ----------
function drivePlayer(dt) {
  const v = player.vehicle, t = CAR_TYPES[v.type];
  const gas = (held.U || (window.tHeld && tHeld.U)) ? 1 : 0;
  const rev = (held.D || (window.tHeld && tHeld.D)) ? 1 : 0;
  const left = (held.L || (window.tHeld && tHeld.L)) ? 1 : 0;
  const right = (held.R || (window.tHeld && tHeld.R)) ? 1 : 0;
  const hb = held.brake;

  const accel = t.acc, maxF = t.top, maxR = t.top * .45;
  if (player.fuel <= 0) { v.speed *= Math.pow(.9, dt * 60); }
  else if (gas) v.speed += accel * dt * (v.speed < 0 ? 2 : 1);
  else if (rev) v.speed -= accel * dt * (v.speed > 0 ? 2 : 1);
  else v.speed *= Math.pow(.985, dt * 60);
  if (hb) v.speed *= Math.pow(.90, dt * 60);
  v.speed = clamp(v.speed, -maxR, maxF);

  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const grip = clamp(Math.abs(v.speed) / 1.2, 0, 1);
  v.angle += steer * 2.6 * dt * grip * (v.speed < 0 ? -1 : 1);

  // fuel burn
  if (Math.abs(v.speed) > .1) player.fuel = clamp(player.fuel - Math.abs(v.speed) * dt * .55, 0, 100);

  // proposed move
  const nx = v.x + Math.cos(v.angle) * v.speed * dt * 60;
  const ny = v.y + Math.sin(v.angle) * v.speed * dt * 60;
  const half = Math.max(v.w, v.h) * .42;
  const hitB = corners(nx, ny, v.angle, v.w, v.h).some(c => !isRoadPx(c.x, c.y) && solidAt(c.x, c.y));
  if (hitB) {
    if (Math.abs(v.speed) > 2.2) { damage(Math.abs(v.speed) * 3); AudioSys.crash(); burst(v.x, v.y, '#ffcf6b', 10); }
    v.speed *= -.25;
  } else { v.x = clamp(nx, 8, WORLD_W - 8); v.y = clamp(ny, 8, WORLD_H - 8); }

  // vehicle-vs-vehicle & peds
  vehicleCollisions(v);

  // sync player pos to vehicle
  player.x = v.x; player.y = v.y; player.angle = v.angle;
  player.speed = v.speed;

  AudioSys.engine(Math.abs(v.speed) / maxF, Math.abs(v.speed) > .3);
  if (held.horn) { if (!drivePlayer._h) { AudioSys.horn(); drivePlayer._h = 1; setTimeout(() => drivePlayer._h = 0, 400); } }
}

function corners(x, y, ang, w, h) {
  const c = Math.cos(ang), s = Math.sin(ang), hw = w / 2, hh = h / 2;
  return [[hh, hw], [hh, -hw], [-hh, hw], [-hh, -hw]].map(([fx, fy]) => ({
    x: x + c * fx - s * fy, y: y + s * fx + c * fy }));
}
function solidAt(x, y) {
  // building tile => solid
  return !isRoadPx(x, y);
}
function vehicleCollisions(v) {
  // run over peds
  for (const p of peds) {
    if (p.dead) continue;
    if (dist2(v.x, v.y, p.x, p.y) < (p.cow ? 26 : 18) ** 2) {
      if (Math.abs(v.speed) > 1) {
        p.dead = true; splats.push({ x: p.x, y: p.y, cow: p.cow });
        burst(p.x, p.y, '#8a1f1f', p.cow ? 14 : 8); AudioSys.crash();
        crime(p.cow ? 2 : 1);
        toast(p.cow ? 'HOLY COW! 🐄' : 'HIT & RUN', '#ff6b6b');
      }
    }
  }
  // bump other cars
  const others = v === player.vehicle ? cars.concat(cops) : [player.vehicle];
  for (const o of others) {
    if (!o || o === v) continue;
    const dmin = (v.w + o.w) * .55;
    if (dist2(v.x, v.y, o.x, o.y) < dmin * dmin) {
      const a = Math.atan2(o.y - v.y, o.x - v.x);
      o.x += Math.cos(a) * 3; o.y += Math.sin(a) * 3;
      if (Math.abs(v.speed) > 2.5) { v.speed *= .5; burst((v.x+o.x)/2,(v.y+o.y)/2,'#ffcf6b',6);
        if (v === player.vehicle && o.cop) { /* ramming cops */ } }
    }
  }
}

// ---------- On-foot ----------
function walkPlayer(dt) {
  const up = (held.U || (window.tHeld && tHeld.U)) ? 1 : 0;
  const dn = (held.D || (window.tHeld && tHeld.D)) ? 1 : 0;
  const lf = (held.L || (window.tHeld && tHeld.L)) ? 1 : 0;
  const rt = (held.R || (window.tHeld && tHeld.R)) ? 1 : 0;
  let dx = rt - lf, dy = dn - up;
  const spd = 2.4;
  if (dx || dy) {
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    player.angle = Math.atan2(dy, dx);
    const nx = player.x + dx * spd * dt * 60, ny = player.y + dy * spd * dt * 60;
    // on foot can walk anywhere except into building cores (allow, but slow near buildings)
    if (!solidAt(nx, player.y)) player.x = clamp(nx, 6, WORLD_W - 6);
    if (!solidAt(player.x, ny)) player.y = clamp(ny, 6, WORLD_H - 6);
    player.speed = spd;
  } else player.speed = 0;
  AudioSys.engine(0, false);
}

// ---------- Damage / death ----------
function damage(amt) {
  if (player.dmgCool > 0) return;
  player.hp = clamp(player.hp - amt, 0, 100); player.dmgCool = .25;
  if (player.hp <= 0) wasted();
}
function wasted() {
  toast('WASTED', '#ff4d4d');
  const lost = Math.floor(cash * .1); cash -= lost;
  wanted = 0; wantedTimer = 0; updateStars(); cops = [];
  setTimeout(() => {
    newPlayer(true); player.hp = 100; player.fuel = 60;
  }, 700);
}

// ---------- Traffic AI ----------
function updateCars(dt) {
  for (const c of cars) {
    if (!c.ai) continue;
    // move along lane
    const dirAng = c.dir * Math.PI / 2;
    c.angle = angLerp(c.angle, dirAng, .2);
    const ahead = 30;
    const fx = c.x + Math.cos(dirAng) * ahead, fy = c.y + Math.sin(dirAng) * ahead;
    // slow if blocked by another car ahead
    let blocked = false;
    for (const o of cars) { if (o === c) continue; if (dist2(fx, fy, o.x, o.y) < 26 * 26) { blocked = true; break; } }
    if (player.vehicle && dist2(fx, fy, player.vehicle.x, player.vehicle.y) < 30 * 30) blocked = true;
    c.speed = lerp(c.speed, blocked ? 0 : rand(1.4, 2.0), .05);
    c.x += Math.cos(dirAng) * c.speed * dt * 60;
    c.y += Math.sin(dirAng) * c.speed * dt * 60;

    // keep locked to lane
    if (c.vertical) c.x = nearestLane(c.x); else c.y = nearestLane(c.y);

    // wrap / turn at map edge
    if (c.x < 0) c.x = WORLD_W; if (c.x > WORLD_W) c.x = 0;
    if (c.y < 0) c.y = WORLD_H; if (c.y > WORLD_H) c.y = 0;

    // maybe turn at intersection
    c.cool -= dt;
    if (c.cool <= 0) {
      const crossband = c.vertical ? inRoadBand(c.y) : inRoadBand(c.x);
      if (crossband && Math.random() < .5) {
        if (c.vertical) { c.vertical = false; c.y = nearestLane(c.y); c.dir = Math.random() < .5 ? 0 : 2; }
        else { c.vertical = true; c.x = nearestLane(c.x); c.dir = Math.random() < .5 ? 1 : 3; }
      }
      c.cool = rand(.8, 2.2);
    }
  }
}

// ---------- Cops AI ----------
function updateCops(dt) {
  AudioSys.siren(wanted > 0 && cops.length > 0);
  for (const c of cops) {
    const tx = player.x, ty = player.y;
    const desired = Math.atan2(ty - c.y, tx - c.x);
    c.angle = angLerp(c.angle, desired, .06);
    const d = Math.sqrt(dist2(c.x, c.y, tx, ty));
    c.speed = lerp(c.speed, d > 80 ? 4.6 : 2, .05);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt * 60;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt * 60;
    if (isRoadPx(nx, ny) || !solidAt(nx, ny)) { c.x = nx; c.y = ny; }
    else { c.angle += 1.2; } // nudge around buildings
    // bust / ram
    if (d < 34) {
      if (player.onFoot) { toast('BUSTED', '#ffd24d'); wasted(); return; }
      else { damage(14 * dt); c.speed *= .6; }
    }
  }
  // wanted decay when no cop nearby
  let near = cops.some(c => dist2(c.x, c.y, player.x, player.y) < 360 * 360);
  if (!near && wanted > 0) { wantedTimer -= dt; if (wantedTimer <= 0) { wanted--; wantedTimer = 10; updateStars();
    if (wanted === 0) { cops = []; toast('LOST THE COPS', '#8ef58e'); } } }
  else if (near) wantedTimer = Math.max(wantedTimer, 6);
  // cull far cops beyond count
  while (cops.length > wanted + 2) cops.pop();
  if (wanted > 0 && cops.length < Math.min(wanted + 1, 5) && Math.random() < .01) spawnCop();
}

// ---------- Peds AI ----------
function updatePeds(dt) {
  for (const p of peds) {
    if (p.dead) continue;
    p.t += dt;
    if (Math.random() < .01) p.turn = rand(-1, 1);
    p.angle += p.turn * dt;
    const spd = p.cow ? p.speed : p.speed * (Math.sin(p.t * 3) > -.5 ? 1 : .3);
    const nx = p.x + Math.cos(p.angle) * spd * dt * 60;
    const ny = p.y + Math.sin(p.angle) * spd * dt * 60;
    if (!solidAt(nx, ny)) { p.x = nx; p.y = ny; } else p.angle += 2.2;
    p.x = clamp(p.x, 4, WORLD_W - 4); p.y = clamp(p.y, 4, WORLD_H - 4);
  }
}

// ---------- Pickups / fuel ----------
function updatePickups() {
  for (const pk of pickups) {
    if (dist2(player.x, player.y, pk.x, pk.y) < 30 * 30) { advanceMission(); break; }
  }
  // passive fuel top-up when stopped on foot near a "pump" — simplified: refuel slowly when on foot
  if (player.onFoot) player.fuel = clamp(player.fuel + 0, 0, 100);
}

// ---------- Main update ----------
function update(dt) {
  readInput();
  if (player.dmgCool > 0) player.dmgCool -= dt;
  if (player.onFoot) walkPlayer(dt); else drivePlayer(dt);
  updateCars(dt); updatePeds(dt); updateCops(dt); updatePickups();
  // fx
  for (const f of fx) { f.x += f.vx; f.y += f.vy; f.vx *= .9; f.vy *= .9; f.life -= dt * 2; }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
  // slow health regen on foot when no wanted
  if (wanted === 0 && player.hp < 100) player.hp = clamp(player.hp + dt * 2, 0, 100);
  // fuel low warning + free trickle so you never hard-stuck
  if (player.fuel <= 0 && player.onFoot === false) player.fuel = 0;
  if (player.onFoot) player.fuel = clamp(player.fuel + dt * 3, 0, 100);

  // camera
  const tx = player.x - VW / 2, ty = player.y - VH / 2;
  cam.x = lerp(cam.x, clamp(tx, 0, WORLD_W - VW), .12);
  cam.y = lerp(cam.y, clamp(ty, 0, WORLD_H - VH), .12);
  if (WORLD_W < VW) cam.x = (WORLD_W - VW) / 2;
  if (WORLD_H < VH) cam.y = (WORLD_H - VH) / 2;

  // hints
  if (player.onFoot) {
    let near = cars.some(c => dist2(player.x, player.y, c.x, c.y) < 60 * 60);
    if (near) hint('Press F to get in / jack this vehicle');
  }
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) document.getElementById('hint').style.opacity = 0; }

  updateHUD();
}

// ---------- HUD ----------
function updateHUD() {
  document.getElementById('hpFill').style.width = player.hp + '%';
  document.getElementById('fuelFill').style.width = player.fuel + '%';
  document.getElementById('cash').textContent = '₹' + cash.toLocaleString('en-IN');
  const kmh = Math.round(Math.abs(player.speed) * 22);
  document.getElementById('kmh').textContent = player.onFoot ? '—' : kmh;
  document.getElementById('gearv').textContent = player.onFoot ? 'ON FOOT'
    : (player.vehicle ? CAR_TYPES[player.vehicle.type].name.toUpperCase() : '');
}

// ---------- Rendering ----------
function draw() {
  // ground
  ctx.fillStyle = '#c9b48f'; ctx.fillRect(0, 0, VW, VH);
  ctx.save(); ctx.translate(-cam.x, -cam.y);

  // visible tile range
  const tx0 = Math.max(0, Math.floor(cam.x / TILE) - 1), ty0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const tx1 = Math.min(GW, Math.ceil((cam.x + VW) / TILE) + 1), ty1 = Math.min(GH, Math.ceil((cam.y + VH) / TILE) + 1);

  // roads (draw as asphalt over ground)
  ctx.fillStyle = '#3b3b41';
  for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
    if (isRoadTile(tx, ty)) ctx.fillRect(tx * TILE, ty * TILE, TILE + 1, TILE + 1);
  }
  // lane dashes on road centre lines
  ctx.strokeStyle = 'rgba(240,210,120,.55)'; ctx.lineWidth = 2; ctx.setLineDash([12, 14]);
  for (let k = 0; k * P < GW; k++) {
    const cxp = (k * P + R / 2) * TILE;
    if (cxp > cam.x - 20 && cxp < cam.x + VW + 20) { ctx.beginPath(); ctx.moveTo(cxp, cam.y); ctx.lineTo(cxp, cam.y + VH); ctx.stroke(); }
  }
  for (let k = 0; k * P < GH; k++) {
    const cyp = (k * P + R / 2) * TILE;
    if (cyp > cam.y - 20 && cyp < cam.y + VH + 20) { ctx.beginPath(); ctx.moveTo(cam.x, cyp); ctx.lineTo(cam.x + VW, cyp); ctx.stroke(); }
  }
  ctx.setLineDash([]);

  // splats
  for (const s of splats) { ctx.fillStyle = 'rgba(90,20,20,.6)'; ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.cow ? 20 : 12, s.cow ? 14 : 9, 0, 0, TAU); ctx.fill(); }

  // buildings (only visible)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const b of buildings) {
    if (b.x + b.w < cam.x || b.x > cam.x + VW || b.y + b.h < cam.y || b.y > cam.y + VH) continue;
    // footprint shadow
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = shade(b.c, b.shade); ctx.fillRect(b.x, b.y, b.w, b.h);
    // roof edge
    ctx.fillStyle = ROOF; ctx.fillRect(b.x, b.y, b.w, Math.min(8, b.h * .2));
    // water tank
    if (b.tank) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(b.x + b.w * .6, b.y + b.h * .55, 12, 12);
      ctx.fillStyle = '#111'; }
    // label
    if (b.name && b.w > 70) { ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '600 10px sans-serif'; ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h - 10, b.w - 6); }
  }

  // pickups (mission markers)
  for (const pk of pickups) {
    const pulse = 18 + Math.sin(performance.now() / 200) * 6;
    ctx.fillStyle = pk.kind === 'pick' ? 'rgba(244,196,13,.25)' : 'rgba(46,204,113,.25)';
    ctx.beginPath(); ctx.arc(pk.x, pk.y, pulse, 0, TAU); ctx.fill();
    ctx.fillStyle = pk.kind === 'pick' ? '#f4c20d' : '#2ecc71';
    ctx.beginPath(); ctx.arc(pk.x, pk.y, 8, 0, TAU); ctx.fill();
    // beam
    ctx.strokeStyle = ctx.fillStyle; ctx.globalAlpha = .3; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pk.x, pk.y); ctx.lineTo(pk.x, pk.y - 60); ctx.stroke(); ctx.globalAlpha = 1;
  }

  // peds
  for (const p of peds) { if (p.dead) continue; drawPed(p); }
  // traffic
  for (const c of cars) drawCar(c);
  // cops
  for (const c of cops) drawCar(c, true);

  // player
  if (player.onFoot) drawPed({ x: player.x, y: player.y, angle: player.angle, skin: '#c68642', cloth: '#ff9933', player: true });
  else drawCar(player.vehicle, false, true);

  // fx
  for (const f of fx) { ctx.globalAlpha = clamp(f.life, 0, 1); ctx.fillStyle = f.c;
    ctx.fillRect(f.x - 2, f.y - 2, 4, 4); } ctx.globalAlpha = 1;

  ctx.restore();
  drawMinimap();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(r + amt * 255, 0, 255); g = clamp(g + amt * 255, 0, 255); b = clamp(b + amt * 255, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawCar(c, cop, isPlayer) {
  const t = CAR_TYPES[c.type] || CAR_TYPES.hatch;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle + Math.PI / 2);
  const w = c.w, h = c.h;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-w / 2 + 2, -h / 2 + 3, w, h, 5); ctx.fill();
  // body
  ctx.fillStyle = cop ? '#1a3a6b' : c.col; roundRect(-w / 2, -h / 2, w, h, 5); ctx.fill();
  if (t.bike) { ctx.fillStyle = '#222'; ctx.fillRect(-w / 2, -h / 2, w, h * .3); }
  // windshield
  ctx.fillStyle = 'rgba(20,30,45,.85)'; roundRect(-w / 2 + 3, -h / 2 + 5, w - 6, h * .28, 3); ctx.fill();
  // rear window
  ctx.fillStyle = 'rgba(20,30,45,.6)'; roundRect(-w / 2 + 4, h / 2 - h * .28, w - 8, h * .2, 3); ctx.fill();
  if (t.canopy) { ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(-w / 2 + 1, -h / 2 + 2, w - 2, h - 4, 6); ctx.fill();
    ctx.fillStyle = c.col; ctx.fillRect(-w / 2, h * .1, w, h * .35); }
  if (cop) { // roof light bar
    ctx.fillStyle = (Math.floor(performance.now() / 200) % 2) ? '#ff3b3b' : '#3b6bff';
    ctx.fillRect(-w / 2 + 4, -3, w - 8, 6); }
  if (isPlayer) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; roundRect(-w/2,-h/2,w,h,5); ctx.stroke(); }
  ctx.restore();
}
function drawPed(p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.angle || 0) + Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(1, 2, p.cow ? 12 : 5, p.cow ? 8 : 4, 0, 0, TAU); ctx.fill();
  if (p.cow) { ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b98a5e'; ctx.fillRect(-3, -13, 6, 5); }
  else {
    ctx.fillStyle = p.cloth; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); // body/torso
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(0, -3, 3.2, 0, TAU); ctx.fill(); // head
    if (p.player) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0,0,6,0,TAU); ctx.stroke(); }
  }
  ctx.restore();
}
function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- Minimap ----------
const MM = 180, MSCALE = MM / WORLD_W;
function drawMinimap() {
  mctx.fillStyle = '#1a1a20'; mctx.fillRect(0, 0, MM, MM);
  // roads
  mctx.strokeStyle = '#4a4a52'; mctx.lineWidth = Math.max(1, R * TILE * MSCALE);
  for (let k = 0; k * P < GW; k++) { const x = (k * P + R / 2) * TILE * MSCALE;
    mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, MM); mctx.stroke(); }
  for (let k = 0; k * P < GH; k++) { const y = (k * P + R / 2) * TILE * MSCALE;
    mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(MM, y); mctx.stroke(); }
  // pickups
  for (const pk of pickups) { mctx.fillStyle = pk.kind === 'pick' ? '#f4c20d' : '#2ecc71';
    mctx.beginPath(); mctx.arc(pk.x * MSCALE, pk.y * MSCALE, 4, 0, TAU); mctx.fill(); }
  // cops
  mctx.fillStyle = '#3b6bff'; for (const c of cops) { mctx.beginPath(); mctx.arc(c.x * MSCALE, c.y * MSCALE, 2.5, 0, TAU); mctx.fill(); }
  // player
  mctx.fillStyle = '#ff3b3b'; mctx.beginPath();
  mctx.arc(player.x * MSCALE, player.y * MSCALE, 3.5, 0, TAU); mctx.fill();
  // viewport box
  mctx.strokeStyle = 'rgba(255,255,255,.25)'; mctx.lineWidth = 1;
  mctx.strokeRect(cam.x * MSCALE, cam.y * MSCALE, VW * MSCALE, VH * MSCALE);
}

// ---------- Loop ----------
let last = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000) || .016; last = ts;
  if (gameOn) { update(dt); draw(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Menu / start ----------
function toggleMute() { AudioSys.muted = !AudioSys.muted; if (AudioSys.muted) AudioSys.siren(false); toast(AudioSys.muted ? 'MUTED' : 'SOUND ON'); }
function startGame() {
  AudioSys.init();
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').hidden = false;
  newPlayer(true); spawnWorld(); updateStars();
  cam.x = clamp(player.x - VW / 2, 0, WORLD_W - VW); cam.y = clamp(player.y - VH / 2, 0, WORLD_H - VH);
  gameOn = true;
  toast('WELCOME TO THE CITY', '#ff9933');
}
document.getElementById('playBtn').addEventListener('click', startGame);

})();
