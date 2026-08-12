/* ============================================================
   DESI STREETS  —  an open-world, top-down driver across a city
   that is really nine Indian worlds stitched together.
   Vanilla JS + Canvas, single file, zero assets.
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

// ---------- helpers ----------
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b));
const pick = a => a[randi(0, a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % TAU) - Math.PI; if (d < -Math.PI) d += TAU; return a + d * t; };
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(r + amt * 255, 0, 255); g = clamp(g + amt * 255, 0, 255); b = clamp(b + amt * 255, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// ---------- World grid ----------
const TILE = 44;
const P = 9, R = 2;                 // block period, road width (tiles)
const GW = 108, GH = 108;
const WORLD_W = GW * TILE, WORLD_H = GH * TILE;
const isRoadTile = (tx, ty) => ((tx % P) < R) || ((ty % P) < R);
const isRoadPx = (x, y) => {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return false;
  return isRoadTile(Math.floor(x / TILE), Math.floor(y / TILE));
};
const laneCoords = [];
for (let k = 0; k * P < GW + P; k++) { laneCoords.push((k * P + 0.5) * TILE, (k * P + 1.5) * TILE); }
const nearestLane = c => { let best = laneCoords[0], bd = 1e9; for (const l of laneCoords) { const d = Math.abs(l - c); if (d < bd) { bd = d; best = l; } } return best; };
const inRoadBand = c => { const t = Math.floor(c / TILE); return (((t % P) + P) % P) < R; };

// ---------- DISTRICTS (3x3 macro grid = nine Indias) ----------
const CELL_W = WORLD_W / 3, CELL_H = WORLD_H / 3;
const DISTRICTS = [
  { key:'dilli', name:'Purani Dilli', greet:'Welcome to Purani Dilli',
    ground:'#b8956a', land:'mosque',
    pal:['#a9553f','#c47a4a','#9c6b3f','#b5493f','#d09a5c','#8f5a3a'],
    sign:['Karim Kebab','Chandni Saree','Ghalib Kitab','Famous Jalebi','Meena Bazaar','Haldiram','Ustad Barber','Paranthe Wali'],
    fact:'Purani Dilli — 400-year-old lanes of Chandni Chowk, where the call to prayer from Jama Masjid floats over India’s busiest bazaar.' },
  { key:'bambai', name:'Bambai', greet:'Welcome to Bambai',
    ground:'#8f9aa3', land:'film',
    pal:['#d9d2c7','#8c99a6','#5f6b78','#c0392b','#37516b','#a7b0b8'],
    sign:['Vada Pav','Film City','Local Train','Koli Fish','Marine Café','Dabbawala','Chawl Kirana','Cutting Chai'],
    fact:'Bambai (Mumbai) — Bollywood dreams above, dabbawalas below: 200,000 tiffins delivered by hand each day with almost zero errors.' },
  { key:'marwar', name:'Marwar', greet:'Padharo — Marwar',
    ground:'#caa25e', land:'fort',
    pal:['#d15b7a','#c76a8f','#3f6fb0','#e08a3c','#c99a3f','#b04a6a'],
    sign:['Jaipur Rajai','Marwari Bhojan','Blue Haveli','Camel Safari','Ghewar Sweet','Bandhej Cloth','Padharo Café','Dal Baati'],
    fact:'Marwar (Rajasthan) — Jaipur the Pink City, Jodhpur the Blue City, a fort on every hill, and “Padharo mhare desh”: welcome to my land.' },
  { key:'kashi', name:'Kashi', greet:'Har Har Mahadev — Kashi',
    ground:'#c2a06a', land:'ghat',
    pal:['#d98a2b','#c0563a','#b8813f','#9c6b8a','#caa15c','#a85a3a'],
    sign:['Vishwanath Prasad','Banarasi Paan','Ganga Aarti','Sadhu Ashram','Lassi Kulhad','Silk Saree','Ghat Chai','Kachori Sabzi'],
    fact:'Kashi (Varanasi) — one of the oldest living cities on Earth. Every dusk the Ganga Aarti lights the ghats with fire, bells and chants.' },
  { key:'punjab', name:'Punjab', greet:'Sat Sri Akal — Punjab',
    ground:'#b7a94e', land:'gurudwara',
    pal:['#e0b93c','#7fa25a','#3f7d5c','#d98a3c','#c9b24f','#6f9e5a'],
    sign:['Sardar Da Dhaba','Golden Langar','Tractor Works','Lassi Hatti','Bhangra Beats','Phulkari Cloth','Amritsari Kulcha','Sarson Saag'],
    fact:'Punjab — at the Golden Temple the langar kitchen feeds 100,000 people free every day, all seated together as equals.' },
  { key:'kerala', name:'Kerala', greet:'Namaskaram — Kerala',
    ground:'#5f8f5c', land:'church',
    pal:['#2e8b73','#4f9e6b','#c0563a','#e0c04a','#3f7d8a','#3f8f6b'],
    sign:['Kerala Sadhya','Backwater Boat','Toddy Shop','Kathakali Arts','Malabar Biryani','St. Mary Church','Ayurveda Spa','Puttu Kadai'],
    fact:'Kerala — “God’s Own Country”: palm-lined backwaters, 90%+ literacy, and Onam, when every home lays a flower carpet and a feast on a banana leaf.' },
  { key:'kolkata', name:'Kolkata', greet:'Eso — Kolkata',
    ground:'#a6996e', land:'bridge',
    pal:['#e0b93c','#c9bfa8','#b56f4a','#8a9c6b','#c76a5f','#d0c3a0'],
    sign:['Roll Corner','Howrah Tram','Durga Pandal','Coffee House','Mishti Doi','Yellow Taxi','Kobiguru Books','Kosha Mangsho'],
    fact:'Kolkata — yellow Ambassador taxis, the last hand-pulled rickshaws, and Durga Puja, when the whole city becomes five days of open-air art.' },
  { key:'chennai', name:'Chennai', greet:'Vanakkam — Chennai',
    ground:'#c2a15e', land:'gopuram',
    pal:['#c0392b','#e0b93c','#3f7d8a','#c76a8f','#4f9e6b','#b03528'],
    sign:['Filter Kaapi','Murugan Idli','Marina Beach','Kollywood','Kanjeevaram','Gopuram Temple','Chettinad Mess','Sundal Cart'],
    fact:'Chennai (Tamil Nadu) — towering temple gopurams, filter “kaapi” in steel tumblers, and Marina, one of the longest urban beaches on Earth.' },
  { key:'goa', name:'Goa', greet:'Welcome to Goa',
    ground:'#d8c48f', land:'beach',
    pal:['#e8dcc0','#3fa0a0','#c0563a','#e0b93c','#5f8fb0','#d8b98a'],
    sign:['Beach Shack','Susegad Café','Feni Bar','Se Cathedral','Fish Curry Rice','Trance Party','Vintage Scooter','Bebinca Bakery'],
    fact:'Goa — Portuguese-white churches, palm beaches and “susegad”: the art of doing nothing, slowly, with feni in hand.' },
];
const districtIndexAt = (x, y) => {
  const mx = clamp(Math.floor(x / CELL_W), 0, 2), my = clamp(Math.floor(y / CELL_H), 0, 2);
  return my * 3 + mx;
};

// ---------- Buildings ----------
const ROOF = '#2b2b34';
const buildings = [];
function genCity() {
  const bX = Math.ceil(GW / P), bY = Math.ceil(GH / P);
  for (let bx = 0; bx < bX; bx++) for (let by = 0; by < bY; by++) {
    const x0 = (bx * P + R) * TILE, y0 = (by * P + R) * TILE;
    const w = (P - R) * TILE, h = (P - R) * TILE;
    if (x0 + w > WORLD_W || y0 + h > WORLD_H) continue;
    const D = DISTRICTS[districtIndexAt(x0 + w / 2, y0 + h / 2)];
    const nx = Math.random() < .5 ? 1 : 2, ny = Math.random() < .5 ? 1 : 2;
    const gap = 6, cw = (w - gap * (nx - 1)) / nx, ch = (h - gap * (ny - 1)) / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const pad = rand(2, 6);
      buildings.push({
        x: x0 + i * (cw + gap) + pad, y: y0 + j * (ch + gap) + pad,
        w: cw - pad * 2, h: ch - pad * 2,
        c: pick(D.pal), shade: rand(-.12, .12),
        name: Math.random() < .55 ? pick(D.sign) : null,
        tank: Math.random() < .5, dirty: Math.random() < .35
      });
    }
  }
}
genCity();

// ---------- Landmarks ----------
const landmarks = [];
for (let i = 0; i < 9; i++) {
  const mx = i % 3, my = (i / 3) | 0;
  landmarks.push({ x: (mx + .5) * CELL_W, y: (my + .5) * CELL_H, type: DISTRICTS[i].land, d: i });
}

// ---------- Street stalls, garbage ----------
const STALLS = [
  { k:'dosa', n:'Dosa', c:'#e0b93c' }, { k:'vadapav', n:'Vada Pav', c:'#c0563a' },
  { k:'momo', n:'Momos', c:'#d9d2c7' }, { k:'panipuri', n:'Pani Puri', c:'#4f9e6b' },
  { k:'chai', n:'Chai', c:'#b56f4a' }, { k:'biryani', n:'Biryani', c:'#d98a2b' },
  { k:'jalebi', n:'Jalebi', c:'#e08a3c' }, { k:'chaat', n:'Chaat', c:'#c76a8f' },
];
const stalls = [], garbage = [], potholes = [];
function edgePointNear(b) { // a spot on the road just outside a building
  const side = randi(0, 4);
  if (side === 0) return { x: b.x + b.w / 2, y: b.y - 14 };
  if (side === 1) return { x: b.x + b.w + 14, y: b.y + b.h / 2 };
  if (side === 2) return { x: b.x + b.w / 2, y: b.y + b.h + 14 };
  return { x: b.x - 14, y: b.y + b.h / 2 };
}
function genProps() {
  for (let i = 0; i < 120; i++) { const b = pick(buildings), p = edgePointNear(b);
    if (isRoadPx(p.x, p.y)) stalls.push({ x: p.x, y: p.y, ...pick(STALLS), t: rand(0, 9) }); }
  for (let i = 0; i < 260; i++) { const b = pick(buildings), p = edgePointNear(b);
    garbage.push({ x: p.x + rand(-8, 8), y: p.y + rand(-8, 8), r: rand(6, 13) }); }
  for (let i = 0; i < 200; i++) { const x = rand(0, WORLD_W), y = rand(0, WORLD_H);
    if (isRoadPx(x, y)) potholes.push({ x, y, r: rand(5, 11) }); }
}
genProps();

// ---------- Audio ----------
const AudioSys = {
  ctx:null, master:null, engineOsc:null, engineGain:null, muted:false, _siren:null,
  init() { if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = .5; this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.frequency.value = 60; this.engineOsc.start();
    } catch (e) { this.ctx = null; } },
  engine(sp, mv) { if (!this.ctx || this.muted) { if (this.engineGain) this.engineGain.gain.value = 0; return; }
    const t = this.ctx.currentTime; this.engineGain.gain.setTargetAtTime(mv ? .06 : 0, t, .1);
    this.engineOsc.frequency.setTargetAtTime(55 + sp * 90, t, .08); },
  blip(fr, du, ty, v) { if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = ty || 'square'; o.frequency.value = fr; g.gain.setValueAtTime(v || .2, t);
    g.gain.exponentialRampToValueAtTime(.001, t + du); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + du); },
  horn() { this.blip(340, .35, 'sawtooth', .25); setTimeout(() => this.blip(300, .3, 'sawtooth', .22), 60); },
  crash() { if (!this.ctx || this.muted) return; const t = this.ctx.currentTime, b = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, 4410, 44100), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    b.buffer = buf; const g = this.ctx.createGain(); g.gain.value = .3; b.connect(g); g.connect(this.master); b.start(t); },
  cash() { this.blip(880, .08, 'sine', .3); setTimeout(() => this.blip(1320, .12, 'sine', .3), 70); },
  siren(on) { if (!this.ctx) return;
    if (on && !this._siren && !this.muted) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 700; lfo.frequency.value = 2; lg.gain.value = 250;
      lfo.connect(lg); lg.connect(o.frequency); g.gain.value = .04; o.connect(g); g.connect(this.master);
      o.start(); lfo.start(); this._siren = { o, lfo }; }
    else if (!on && this._siren) { try { this._siren.o.stop(); this._siren.lfo.stop(); } catch (e) {} this._siren = null; } }
};

// ---------- Input ----------
const keys = {};
const held = { L:0, R:0, U:0, D:0, brake:0, horn:0 };
addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  const k = e.key.toLowerCase();
  if (k === 'f') tryEnterExit();
  if (k === 'b') tryBribe();
  if (k === 'm') toggleMute();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
function readInput() {
  held.U = (keys['w'] || keys['arrowup']) ? 1 : 0;
  held.D = (keys['s'] || keys['arrowdown']) ? 1 : 0;
  held.L = (keys['a'] || keys['arrowleft']) ? 1 : 0;
  held.R = (keys['d'] || keys['arrowright']) ? 1 : 0;
  held.brake = keys[' '] ? 1 : 0; held.horn = keys['h'] ? 1 : 0;
}
(function touch() {
  const T = document.getElementById('touch');
  if (matchMedia('(hover:none)').matches) T.classList.add('on');
  window.tHeld = { L:0, R:0, U:0, D:0, brake:0 };
  const bind = (id, k) => { const el = document.getElementById(id); if (!el) return;
    const on = e => { e.preventDefault(); tHeld[k] = 1; if (k === 'act') tryEnterExit(); };
    const off = e => { e.preventDefault(); tHeld[k] = 0; };
    el.addEventListener('touchstart', on); el.addEventListener('touchend', off); el.addEventListener('touchcancel', off); };
  bind('tLeft','L'); bind('tRight','R'); bind('tGas','U'); bind('tBrake','D'); bind('tAct','act');
})();

// ---------- Vehicles ----------
const CAR_TYPES = {
  auto:    { w:24, h:34, top:3.2, acc:7,  name:'Auto Rickshaw', col:['#f4c20d'], canopy:true },
  auto2:   { w:24, h:34, top:3.2, acc:7,  name:'Auto Rickshaw', col:['#1abc9c'], canopy:true },
  scooter: { w:16, h:30, top:3.6, acc:8,  name:'Scooter', col:['#d9d9d9','#c0392b','#2d6cdf'], bike:true },
  hatch:   { w:30, h:52, top:4.0, acc:6,  name:'Hatchback', col:['#e74c3c','#ecf0f1','#3498db','#f1c40f','#2ecc71'] },
  sedan:   { w:32, h:60, top:4.4, acc:5.5,name:'Sedan', col:['#ffffff','#2c3e50','#7f8c8d','#c0392b'] },
  taxi:    { w:32, h:60, top:4.2, acc:5.5,name:'Yellow Taxi', col:['#f4c20d'], taxi:true },
  suv:     { w:36, h:66, top:4.0, acc:5,  name:'SUV', col:['#111417','#4a4e69','#6b705c'] },
  truck:   { w:40, h:82, top:3.2, acc:3.5,name:'Lorry', col:['#2980b9','#e67e22','#16a085'], truck:true },
  bus:     { w:44, h:98, top:3.0, acc:3,  name:'Bus', col:['#c0392b','#2980b9','#27ae60'], bus:true },
  rickshaw:{ w:20, h:40, top:2.0, acc:4,  name:'Cycle Rickshaw', col:['#2d6cdf','#16a085'], canopy:true, cycle:true },
  bullock: { w:34, h:58, top:1.6, acc:2.5,name:'Bullock Cart', col:['#8a5a2b'], cart:true },
  tractor: { w:40, h:64, top:3.0, acc:4,  name:'Tractor', col:['#3f7d5c','#c0392b'] },
  tempo:   { w:30, h:52, top:3.6, acc:5,  name:'Tempo', col:['#2d6cdf','#e0b93c'] },
};
const TYPE_KEYS = ['auto','auto2','auto','scooter','scooter','hatch','hatch','sedan','taxi','suv','truck','bus','rickshaw','bullock','tractor','tempo'];
const LOADS = ['family','cylinders','fridge','hay','chickens','ladder','mattress','sofa','tv','pots','cane'];

function makeTrafficCar() {
  const vertical = Math.random() < .5;
  let x, y, dir;
  if (vertical) { x = pick(laneCoords); y = rand(0, WORLD_H); dir = Math.random() < .5 ? 1 : 3; }
  else { y = pick(laneCoords); x = rand(0, WORLD_W); dir = Math.random() < .5 ? 0 : 2; }
  const tk = pick(TYPE_KEYS), t = CAR_TYPES[tk];
  const loadable = ['scooter','auto','auto2','tempo','truck','bullock','rickshaw','tractor'].includes(tk);
  return { x, y, dir, vertical, type: tk, w: t.w, h: t.h, col: pick(t.col),
    angle: dir * Math.PI / 2, speed: rand(1.0, 2.2), ai: true, cool: 0, hp: 1,
    load: (loadable && Math.random() < .5) ? pick(LOADS) : null,
    roof: t.bus ? Math.random() < .8 : false };
}

// ---------- Peds & animals ----------
const ANIMALS = ['dog','goat','monkey','pig'];
function makePed(x, y, kind) {
  const skin = ['#8d5524','#a86b3c','#c68642','#7a4a22'];
  const cloth = ['#e74c3c','#2980b9','#27ae60','#f39c12','#8e44ad','#e67e22','#16a085','#d35400','#c0392b','#2c3e50'];
  const k = kind || (Math.random() < .16 ? (Math.random() < .3 ? 'cow' : pick(ANIMALS)) : 'human');
  const spd = k === 'cow' ? rand(.1, .35) : k === 'human' ? rand(.4, .9) : rand(.5, 1.1);
  return { x, y, angle: rand(0, TAU), t: rand(0, 100), kind: k,
    skin: pick(skin), cloth: pick(cloth), dead: false, speed: spd, turn: 0 };
}

// ---------- State ----------
const cam = { x:0, y:0 };
let player, cars = [], peds = [], cops = [], pickups = [], splats = [], fx = [];
let cash = 0, wanted = 0, heat = 0, wantedTimer = 0, gameOn = false, mission = null, curDistrict = -1;
const START = { x: nearestLane(WORLD_W / 2), y: nearestLane(WORLD_H / 2) }; // dead centre → Punjab

function newPlayer(inCar) {
  player = { x: START.x, y: START.y, angle: -Math.PI / 2, speed: 0, hp: 100, fuel: 100,
    onFoot: !inCar, vehicle: null, dmgCool: 0,
    car: inCar ? { x: START.x, y: START.y, angle: -Math.PI / 2, speed: 0, type: 'hatch',
      w: CAR_TYPES.hatch.w, h: CAR_TYPES.hatch.h, col: '#e74c3c' } : null };
  if (inCar) player.vehicle = player.car;
}
function spawnWorld() {
  cars = []; peds = []; cops = []; pickups = []; splats = []; fx = [];
  cash = 0; wanted = 0; heat = 0; wantedTimer = 0; mission = null; curDistrict = -1;
  for (let i = 0; i < 85; i++) cars.push(makeTrafficCar());
  for (let i = 0; i < 130; i++) { const c = makeTrafficCar(); peds.push(makePed(c.x + rand(-30, 30), c.y + rand(-30, 30))); }
  newMission();
}

// ---------- Missions (culture-matched, each teaches something) ----------
const MJOBS = [
  { t:'Ganpati Visarjan', d:'bambai', a:'Load the Ganesh idol', b:'Carry it to the water for visarjan',
    f:'Ganesh Chaturthi ends with lakhs of clay idols carried to the sea: “Ganpati Bappa Morya!”' },
  { t:'Dabbawala Run', d:'bambai', a:'Collect the tiffins', b:'Deliver the hot lunches on time',
    f:'Mumbai’s dabbawalas move 200,000 lunchboxes a day — a supply chain studied by Harvard.' },
  { t:'Langar Seva', d:'punjab', a:'Load the langar supplies', b:'Drop them at the gurudwara kitchen',
    f:'In a gurudwara, anyone — any faith, any status — eats the same free meal, sitting on the same floor.' },
  { t:'Baraat', d:'punjab', a:'Pick up the groom’s baraat', b:'Get them dancing to the mandap',
    f:'An Indian wedding baraat can dance down the road for hours before the groom finally reaches the venue.' },
  { t:'Pilgrim to the Ghats', d:'kashi', a:'Pick up the pilgrim', b:'Drop them at the Ganga ghats',
    f:'Many Hindus believe a final dip in the Ganga at Kashi releases the soul from the cycle of rebirth.' },
  { t:'Temple Prasad', d:'chennai', a:'Collect the prasad', b:'Deliver the blessed sweets',
    f:'Prasad is food first offered to the deity, then shared — grace you can taste.' },
  { t:'Durga Idol', d:'kolkata', a:'Load the Durga idol', b:'Deliver it to the puja pandal',
    f:'For Durga Puja, Kolkata’s artisans of Kumartuli sculpt thousands of idols from Ganga clay.' },
  { t:'Filter Kaapi Rush', d:'chennai', a:'Grab the steel tumblers', b:'Serve the kaapi still frothy',
    f:'Tamil filter “kaapi” is poured between tumbler and dabara from a height — to froth and cool it.' },
  { t:'Onam Sadhya', d:'kerala', a:'Load the banana-leaf feast', b:'Deliver the sadhya before the meal',
    f:'An Onam sadhya can be 20+ vegetarian dishes, all served on one banana leaf, eaten by hand.' },
  { t:'Camel Fair Goods', d:'marwar', a:'Load the fair goods', b:'Haul them across the desert town',
    f:'At Pushkar’s fair, thousands of camels are traded, raced and paraded under the desert sun.' },
  { t:'Eid Sewaiyan', d:'dilli', a:'Pick up the sewaiyan', b:'Deliver the Eid sweets to the family',
    f:'On Eid, sheer khurma — vermicelli simmered in milk and dates — is shared with every visitor.' },
  { t:'Beach Shack Supply', d:'goa', a:'Load the shack supplies', b:'Restock the beach before sunset',
    f:'Goa’s beach shacks are seasonal — built for the tourist months, then taken down for the monsoon.' },
  { t:'Hot Jalebi Delivery', d:'dilli', a:'Grab the fresh jalebis', b:'Deliver them crisp and dripping',
    f:'Old Delhi’s jalebi shops have fried the same spirals of syrup since before Independence.' },
  { t:'Koli Fish Haul', d:'bambai', a:'Load the morning catch', b:'Rush it to the market fresh',
    f:'The Koli are Mumbai’s original fishing community — here long before the city grew around them.' },
];
function roadPointIn(dIdx) {
  for (let i = 0; i < 300; i++) {
    let x, y;
    if (dIdx != null) { const mx = dIdx % 3, my = (dIdx / 3) | 0;
      x = rand(mx * CELL_W + 60, (mx + 1) * CELL_W - 60); y = rand(my * CELL_H + 60, (my + 1) * CELL_H - 60); }
    else { x = rand(TILE, WORLD_W - TILE); y = rand(TILE, WORLD_H - TILE); }
    if (isRoadPx(x, y)) return { x, y };
  }
  return { x: START.x, y: START.y };
}
function newMission() {
  const di = curDistrict >= 0 ? curDistrict : districtIndexAt(player.x, player.y);
  const dk = DISTRICTS[di].key;
  const local = MJOBS.filter(m => m.d === dk);
  const job = Math.random() < .7 && local.length ? pick(local) : pick(MJOBS);
  const jdi = DISTRICTS.findIndex(d => d.key === job.d);
  const a = roadPointIn(jdi);
  mission = { job, stage: 0, from: a, to: null, reward: randi(160, 520) };
  pickups = [{ x: a.x, y: a.y, kind: 'pick' }];
  setMissionText();
}
function setMissionText() {
  const el = document.getElementById('mtxt');
  if (!mission) { el.textContent = '—'; return; }
  const j = mission.job;
  el.textContent = `${j.t}: ${mission.stage === 0 ? j.a : j.b}  (₹${mission.reward})`;
}
function advanceMission() {
  const j = mission.job;
  if (mission.stage === 0) {
    mission.stage = 1;
    const jdi = DISTRICTS.findIndex(d => d.key === j.d);
    const b = roadPointIn(Math.random() < .6 ? jdi : null);
    mission.to = b; pickups = [{ x: b.x, y: b.y, kind: 'drop' }];
    AudioSys.cash(); showBanner('📦 ' + j.t, j.f); setMissionText();
  } else {
    cash += mission.reward; AudioSys.cash(); toast('₹' + mission.reward + ' EARNED', '#8ef58e'); newMission();
  }
}

// ---------- Enter/exit ----------
function tryEnterExit() {
  if (!gameOn) return; AudioSys.init();
  if (player.onFoot) {
    let best = null, bd = 60 * 60;
    for (const c of cars) { const d = dist2(player.x, player.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
    if (best) { const jacked = best.ai && best.speed > .2;
      player.onFoot = false; player.vehicle = best; best.ai = false; best.speed = 0;
      if (jacked) { crime(1); toast('CARJACKED!', '#ff9f43'); } AudioSys.blip(220, .1, 'square', .2); }
  } else {
    const v = player.vehicle; player.onFoot = true;
    player.x = v.x + Math.cos(v.angle + Math.PI / 2) * 30; player.y = v.y + Math.sin(v.angle + Math.PI / 2) * 30;
    v.ai = true; v.speed = 0; v.vertical = Math.abs(Math.cos(v.angle)) < .5;
    v.dir = v.vertical ? (Math.sin(v.angle) > 0 ? 1 : 3) : (Math.cos(v.angle) > 0 ? 0 : 2);
    player.vehicle = null; AudioSys.blip(180, .1, 'square', .2);
  }
}

// ---------- Crime / wanted / bribery (lighter than GTA) ----------
function crime(a) {
  heat += a;
  if (heat >= 3) { heat = 0; wanted = clamp(wanted + 1, 0, 5); wantedTimer = 12; updateStars();
    if (cops.length < wanted) spawnCop(); }
}
function spawnCop() {
  const p = roadPointIn(districtIndexAt(player.x, player.y));
  cops.push({ x: p.x, y: p.y, angle: 0, speed: 0, type: 'suv', w: CAR_TYPES.suv.w, h: CAR_TYPES.suv.h,
    col: '#1a3a6b', cop: true, hp: 1, corrupt: Math.random() < .55, angry: false });
}
function updateStars() {
  let s = ''; for (let i = 0; i < wanted; i++) s += '★';
  document.getElementById('stars').textContent = s;
  AudioSys.siren(wanted > 0 && cops.length > 0);
}
function tryBribe() {
  if (!gameOn || wanted === 0) return;
  let best = null, bd = 90 * 90;
  for (const c of cops) { const d = dist2(player.x, player.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  if (!best) { toast('No cop close enough', '#ffd24d'); return; }
  const cost = 100 + wanted * 250;
  if (best.corrupt) {
    if (cash >= cost) { cash -= cost; wanted = 0; heat = 0; wantedTimer = 0; cops = []; updateStars();
      AudioSys.cash(); toast('BRIBE ACCEPTED 🤝  −₹' + cost, '#8ef58e'); }
    else toast('Need ₹' + cost + ' to bribe him', '#ffd24d');
  } else {
    toast('HONEST COP! Won’t take it 🚨', '#ff6b6b');
    wanted = clamp(wanted + 1, 0, 5); wantedTimer = 14; updateStars(); best.angry = true;
    if (cops.length < wanted) spawnCop();
  }
}

// ---------- FX / banners ----------
function toast(text, color) {
  const b = document.getElementById('toastBig'); b.textContent = text; b.style.color = color || '#fff';
  b.style.opacity = 1; b.style.transform = 'translateY(-10px) scale(1.05)';
  clearTimeout(toast._t); toast._t = setTimeout(() => { b.style.opacity = 0; b.style.transform = 'translateY(0) scale(1)'; }, 1100);
}
function showBanner(title, fact) {
  const el = document.getElementById('banner');
  document.getElementById('bTitle').textContent = title;
  document.getElementById('bFact').textContent = fact;
  el.classList.add('show'); clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => el.classList.remove('show'), 4200);
}
let hintTimer = 0;
function hint(text) { const el = document.getElementById('hint'); el.textContent = text; el.style.opacity = 1; hintTimer = .12; }
function burst(x, y, color, n) { for (let i = 0; i < (n || 8); i++) fx.push({ x, y, vx: rand(-3, 3), vy: rand(-3, 3), life: 1, c: color }); }

// ---------- Player driving ----------
function drivePlayer(dt) {
  const v = player.vehicle, t = CAR_TYPES[v.type];
  const th = window.tHeld || {};
  const gas = (held.U || th.U) ? 1 : 0, rev = (held.D || th.D) ? 1 : 0;
  const left = (held.L || th.L) ? 1 : 0, right = (held.R || th.R) ? 1 : 0, hb = held.brake;
  const maxF = t.top, maxR = t.top * .45;
  if (player.fuel <= 0) v.speed *= Math.pow(.9, dt * 60);
  else if (gas) v.speed += t.acc * dt * (v.speed < 0 ? 2 : 1);
  else if (rev) v.speed -= t.acc * dt * (v.speed > 0 ? 2 : 1);
  else v.speed *= Math.pow(.985, dt * 60);
  if (hb) v.speed *= Math.pow(.90, dt * 60);
  v.speed = clamp(v.speed, -maxR, maxF);
  const steer = (right - left), grip = clamp(Math.abs(v.speed) / 1.2, 0, 1);
  v.angle += steer * 2.6 * dt * grip * (v.speed < 0 ? -1 : 1);
  if (Math.abs(v.speed) > .1) player.fuel = clamp(player.fuel - Math.abs(v.speed) * dt * .5, 0, 100);
  const nx = v.x + Math.cos(v.angle) * v.speed * dt * 60, ny = v.y + Math.sin(v.angle) * v.speed * dt * 60;
  const hitB = corners(nx, ny, v.angle, v.w, v.h).some(c => solidAt(c.x, c.y));
  if (hitB) { if (Math.abs(v.speed) > 2.2) { damage(Math.abs(v.speed) * 3); AudioSys.crash(); burst(v.x, v.y, '#ffcf6b', 10); } v.speed *= -.25; }
  else { v.x = clamp(nx, 8, WORLD_W - 8); v.y = clamp(ny, 8, WORLD_H - 8); }
  vehicleCollisions(v);
  player.x = v.x; player.y = v.y; player.angle = v.angle; player.speed = v.speed;
  AudioSys.engine(Math.abs(v.speed) / maxF, Math.abs(v.speed) > .3);
  if (held.horn && !drivePlayer._h) { AudioSys.horn(); drivePlayer._h = 1; setTimeout(() => drivePlayer._h = 0, 400); }
}
function corners(x, y, ang, w, h) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [[h/2, w/2],[h/2,-w/2],[-h/2,w/2],[-h/2,-w/2]].map(([fx, fy]) => ({ x: x + c*fx - s*fy, y: y + s*fx + c*fy }));
}
const solidAt = (x, y) => !isRoadPx(x, y);
function vehicleCollisions(v) {
  for (const p of peds) { if (p.dead) continue;
    const rr = p.kind === 'cow' ? 26 : 16;
    if (dist2(v.x, v.y, p.x, p.y) < rr * rr && Math.abs(v.speed) > 1) {
      p.dead = true; splats.push({ x: p.x, y: p.y, big: p.kind === 'cow' });
      burst(p.x, p.y, '#8a1f1f', p.kind === 'cow' ? 14 : 8); AudioSys.crash();
      crime(p.kind === 'cow' ? 2 : 1);
      toast(p.kind === 'cow' ? 'HOLY COW! 🐄' : p.kind === 'human' ? 'HIT & RUN' : 'ROADKILL', '#ff6b6b');
    } }
  const others = v === player.vehicle ? cars.concat(cops) : [player.vehicle];
  for (const o of others) { if (!o || o === v) continue;
    const dmin = (v.w + o.w) * .55;
    if (dist2(v.x, v.y, o.x, o.y) < dmin * dmin) {
      const a = Math.atan2(o.y - v.y, o.x - v.x); o.x += Math.cos(a) * 3; o.y += Math.sin(a) * 3;
      if (Math.abs(v.speed) > 2.5) { v.speed *= .5; burst((v.x+o.x)/2,(v.y+o.y)/2,'#ffcf6b',6); if (o.cop) crime(2); }
    } }
}

// ---------- On foot ----------
function walkPlayer(dt) {
  const th = window.tHeld || {};
  const dx = ((held.R||th.R)?1:0) - ((held.L||th.L)?1:0);
  const dy = ((held.D||th.D)?1:0) - ((held.U||th.U)?1:0);
  if (dx || dy) { const l = Math.hypot(dx, dy), ux = dx/l, uy = dy/l; const spd = 2.4;
    player.angle = Math.atan2(uy, ux);
    const nx = player.x + ux*spd*dt*60, ny = player.y + uy*spd*dt*60;
    if (!solidAt(nx, player.y)) player.x = clamp(nx, 6, WORLD_W - 6);
    if (!solidAt(player.x, ny)) player.y = clamp(ny, 6, WORLD_H - 6);
    player.speed = spd; } else player.speed = 0;
  AudioSys.engine(0, false);
}

// ---------- Damage / death ----------
function damage(a) { if (player.dmgCool > 0) return; player.hp = clamp(player.hp - a, 0, 100); player.dmgCool = .25; if (player.hp <= 0) wasted(); }
function wasted() {
  toast('WASTED', '#ff4d4d'); cash -= Math.floor(cash * .1);
  wanted = 0; heat = 0; wantedTimer = 0; updateStars(); cops = [];
  setTimeout(() => { newPlayer(true); player.hp = 100; player.fuel = 60; }, 700);
}

// ---------- Traffic AI (chaotic, ignores lanes a little) ----------
function updateCars(dt) {
  for (const c of cars) { if (!c.ai) continue;
    const dirAng = c.dir * Math.PI / 2; c.angle = angLerp(c.angle, dirAng, .2);
    const fx = c.x + Math.cos(dirAng) * 30, fy = c.y + Math.sin(dirAng) * 30;
    let blocked = false;
    for (const o of cars) { if (o === c) continue; if (dist2(fx, fy, o.x, o.y) < 26 * 26) { blocked = true; break; } }
    if (player.vehicle && dist2(fx, fy, player.vehicle.x, player.vehicle.y) < 30 * 30) blocked = true;
    const cruise = CAR_TYPES[c.type].top * .45;
    c.speed = lerp(c.speed, blocked ? 0 : rand(cruise * .8, cruise * 1.2), .05);
    c.x += Math.cos(dirAng) * c.speed * dt * 60; c.y += Math.sin(dirAng) * c.speed * dt * 60;
    if (c.vertical) c.x = nearestLane(c.x); else c.y = nearestLane(c.y);
    if (c.x < 0) c.x = WORLD_W; if (c.x > WORLD_W) c.x = 0; if (c.y < 0) c.y = WORLD_H; if (c.y > WORLD_H) c.y = 0;
    c.cool -= dt;
    if (c.cool <= 0) { const cross = c.vertical ? inRoadBand(c.y) : inRoadBand(c.x);
      if (cross && Math.random() < .5) {
        if (c.vertical) { c.vertical = false; c.y = nearestLane(c.y); c.dir = Math.random() < .5 ? 0 : 2; }
        else { c.vertical = true; c.x = nearestLane(c.x); c.dir = Math.random() < .5 ? 1 : 3; } }
      c.cool = rand(.8, 2.2); }
  }
}

// ---------- Cops AI (fewer, less aggressive; bribable) ----------
function updateCops(dt) {
  AudioSys.siren(wanted > 0 && cops.length > 0);
  for (const c of cops) {
    const desired = Math.atan2(player.y - c.y, player.x - c.x);
    c.angle = angLerp(c.angle, desired, .05);
    const d = Math.sqrt(dist2(c.x, c.y, player.x, player.y));
    c.speed = lerp(c.speed, d > 90 ? 4.2 : 1.8, .05);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt * 60, ny = c.y + Math.sin(c.angle) * c.speed * dt * 60;
    if (!solidAt(nx, ny)) { c.x = nx; c.y = ny; } else c.angle += 1.2;
    if (d < 34) { if (player.onFoot) { toast('BUSTED', '#ffd24d'); wasted(); return; }
      else { damage(9 * dt); c.speed *= .6; } }
  }
  const near = cops.some(c => dist2(c.x, c.y, player.x, player.y) < 340 * 340);
  if (!near && wanted > 0) { wantedTimer -= dt; if (wantedTimer <= 0) { wanted--; wantedTimer = 9; updateStars();
    if (wanted === 0) { cops = []; toast('LOST THE COPS', '#8ef58e'); } } }
  else if (near) wantedTimer = Math.max(wantedTimer, 6);
  while (cops.length > Math.max(wanted, 0)) cops.pop();      // fewer cops than GTA: at most `wanted`
  if (wanted > 0 && cops.length < wanted && Math.random() < .008) spawnCop();
}

// ---------- Peds/animals AI ----------
function updatePeds(dt) {
  for (const p of peds) { if (p.dead) continue; p.t += dt;
    if (Math.random() < .01) p.turn = rand(-1, 1); p.angle += p.turn * dt;
    const base = p.kind === 'cow' ? p.speed : p.speed * (Math.sin(p.t * 3) > -.5 ? 1 : .3);
    const nx = p.x + Math.cos(p.angle) * base * dt * 60, ny = p.y + Math.sin(p.angle) * base * dt * 60;
    if (!solidAt(nx, ny)) { p.x = nx; p.y = ny; } else p.angle += 2.2;
    p.x = clamp(p.x, 4, WORLD_W - 4); p.y = clamp(p.y, 4, WORLD_H - 4); }
}

// ---------- Pickups ----------
function updatePickups() { for (const pk of pickups) { if (dist2(player.x, player.y, pk.x, pk.y) < 30 * 30) { advanceMission(); break; } } }

// ---------- Update ----------
function update(dt) {
  readInput();
  if (player.dmgCool > 0) player.dmgCool -= dt;
  if (player.onFoot) walkPlayer(dt); else drivePlayer(dt);
  updateCars(dt); updatePeds(dt); updateCops(dt); updatePickups();
  for (const f of fx) { f.x += f.vx; f.y += f.vy; f.vx *= .9; f.vy *= .9; f.life -= dt * 2; }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
  if (wanted === 0 && player.hp < 100) player.hp = clamp(player.hp + dt * 2, 0, 100);
  if (player.onFoot) player.fuel = clamp(player.fuel + dt * 3, 0, 100);

  // district change
  const di = districtIndexAt(player.x, player.y);
  if (di !== curDistrict) { curDistrict = di; const D = DISTRICTS[di];
    document.getElementById('distName').textContent = D.name; showBanner(D.greet, D.fact); }

  // camera
  cam.x = lerp(cam.x, clamp(player.x - VW / 2, 0, Math.max(0, WORLD_W - VW)), .12);
  cam.y = lerp(cam.y, clamp(player.y - VH / 2, 0, Math.max(0, WORLD_H - VH)), .12);

  // hints
  if (player.onFoot && cars.some(c => dist2(player.x, player.y, c.x, c.y) < 60 * 60)) hint('Press F to get in / jack this vehicle');
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) document.getElementById('hint').style.opacity = 0; }
  const bribeEl = document.getElementById('bribe');
  if (wanted > 0) { const nc = cops.find(c => dist2(c.x, c.y, player.x, player.y) < 90 * 90);
    if (nc) { bribeEl.textContent = 'Press B to bribe (₹' + (100 + wanted * 250) + ') — gold badge takes it'; bribeEl.style.opacity = 1; }
    else bribeEl.style.opacity = 0; } else bribeEl.style.opacity = 0;

  updateHUD();
}
function updateHUD() {
  document.getElementById('hpFill').style.width = player.hp + '%';
  document.getElementById('fuelFill').style.width = player.fuel + '%';
  document.getElementById('cash').textContent = '₹' + cash.toLocaleString('en-IN');
  document.getElementById('kmh').textContent = player.onFoot ? '—' : Math.round(Math.abs(player.speed) * 22);
  document.getElementById('gearv').textContent = player.onFoot ? 'ON FOOT' : (player.vehicle ? CAR_TYPES[player.vehicle.type].name.toUpperCase() : '');
}

// ---------- Rendering ----------
function draw() {
  ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, VW, VH);
  ctx.save(); ctx.translate(-cam.x, -cam.y);

  // district ground (macro cells)
  const mx0 = clamp(Math.floor(cam.x / CELL_W), 0, 2), mx1 = clamp(Math.floor((cam.x + VW) / CELL_W), 0, 2);
  const my0 = clamp(Math.floor(cam.y / CELL_H), 0, 2), my1 = clamp(Math.floor((cam.y + VH) / CELL_H), 0, 2);
  for (let my = my0; my <= my1; my++) for (let mx = mx0; mx <= mx1; mx++) {
    ctx.fillStyle = DISTRICTS[my * 3 + mx].ground; ctx.fillRect(mx * CELL_W, my * CELL_H, CELL_W + 1, CELL_H + 1); }

  const tx0 = Math.max(0, Math.floor(cam.x / TILE) - 1), ty0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const tx1 = Math.min(GW, Math.ceil((cam.x + VW) / TILE) + 1), ty1 = Math.min(GH, Math.ceil((cam.y + VH) / TILE) + 1);
  // roads
  ctx.fillStyle = '#3b3b41';
  for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) if (isRoadTile(tx, ty)) ctx.fillRect(tx * TILE, ty * TILE, TILE + 1, TILE + 1);
  // lane dashes
  ctx.strokeStyle = 'rgba(240,210,120,.5)'; ctx.lineWidth = 2; ctx.setLineDash([12, 14]);
  for (let k = 0; k * P < GW; k++) { const x = (k * P + R / 2) * TILE; if (x > cam.x - 20 && x < cam.x + VW + 20) { ctx.beginPath(); ctx.moveTo(x, cam.y); ctx.lineTo(x, cam.y + VH); ctx.stroke(); } }
  for (let k = 0; k * P < GH; k++) { const y = (k * P + R / 2) * TILE; if (y > cam.y - 20 && y < cam.y + VH + 20) { ctx.beginPath(); ctx.moveTo(cam.x, y); ctx.lineTo(cam.x + VW, y); ctx.stroke(); } }
  ctx.setLineDash([]);

  // potholes + garbage + splats
  for (const p of potholes) if (vis(p.x, p.y, 20)) { ctx.fillStyle = 'rgba(15,15,18,.55)'; ellipse(p.x, p.y, p.r, p.r * .7); }
  for (const g of garbage) if (vis(g.x, g.y, 20)) { ctx.fillStyle = 'rgba(70,60,40,.8)'; ellipse(g.x, g.y, g.r, g.r * .7);
    ctx.fillStyle = pick(['#7a6f4a','#8a5a3a','#556b4a']); ctx.fillRect(g.x - g.r*.3, g.y - g.r*.3, 4, 4); }
  for (const s of splats) { ctx.fillStyle = 'rgba(90,20,20,.55)'; ellipse(s.x, s.y, s.big ? 20 : 12, s.big ? 14 : 9); }

  // landmarks (behind buildings so towers rise over blocks)
  for (const l of landmarks) if (l.x > cam.x - 200 && l.x < cam.x + VW + 200 && l.y > cam.y - 200 && l.y < cam.y + VH + 200) drawLandmark(l);

  // buildings
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const b of buildings) {
    if (b.x + b.w < cam.x || b.x > cam.x + VW || b.y + b.h < cam.y || b.y > cam.y + VH) continue;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = shade(b.c, b.shade); ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = ROOF; ctx.fillRect(b.x, b.y, b.w, Math.min(8, b.h * .2));
    if (b.dirty) { ctx.fillStyle = 'rgba(40,35,25,.18)'; ctx.fillRect(b.x, b.y + b.h * .6, b.w, b.h * .4); }
    if (b.tank) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(b.x + b.w * .6, b.y + b.h * .55, 12, 12); }
    if (b.name && b.w > 68) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 10px sans-serif';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h - 10, b.w - 6); }
  }

  // stalls
  for (const s of stalls) if (vis(s.x, s.y, 30)) drawStall(s);

  // pickups
  for (const pk of pickups) {
    const pulse = 18 + Math.sin(performance.now() / 200) * 6;
    ctx.fillStyle = pk.kind === 'pick' ? 'rgba(244,196,13,.25)' : 'rgba(46,204,113,.25)'; ctx.beginPath(); ctx.arc(pk.x, pk.y, pulse, 0, TAU); ctx.fill();
    ctx.fillStyle = pk.kind === 'pick' ? '#f4c20d' : '#2ecc71'; ctx.beginPath(); ctx.arc(pk.x, pk.y, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle; ctx.globalAlpha = .3; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pk.x, pk.y); ctx.lineTo(pk.x, pk.y - 60); ctx.stroke(); ctx.globalAlpha = 1;
  }

  for (const p of peds) if (!p.dead && vis(p.x, p.y, 30)) drawPed(p);
  for (const c of cars) if (vis(c.x, c.y, 60)) drawCar(c);
  for (const c of cops) drawCar(c);
  if (player.onFoot) drawPed({ x: player.x, y: player.y, angle: player.angle, kind: 'human', skin: '#c68642', cloth: '#ff9933', player: true });
  else drawCar(player.vehicle, true);

  for (const f of fx) { ctx.globalAlpha = clamp(f.life, 0, 1); ctx.fillStyle = f.c; ctx.fillRect(f.x - 2, f.y - 2, 4, 4); } ctx.globalAlpha = 1;

  ctx.restore();
  drawMinimap();
}
const vis = (x, y, m) => x > cam.x - m && x < cam.x + VW + m && y > cam.y - m && y < cam.y + VH + m;
function ellipse(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
function roundRect(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function drawCar(c, isPlayer) {
  const t = CAR_TYPES[c.type] || CAR_TYPES.hatch, w = c.w, h = c.h;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle + Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-w/2+2, -h/2+3, w, h, 5); ctx.fill();
  if (t.cart) { ctx.fillStyle = '#c9a06a'; roundRect(-w/2, -h/2+10, w, h-10, 3); ctx.fill();
    ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.arc(-w/2+3,-h/2+3,3,0,TAU); ctx.arc(w/2-3,-h/2+3,3,0,TAU); ctx.fill(); /* ox */
    ctx.fillStyle = '#e6ddc8'; ctx.fillRect(-6, -h/2-8, 12, 12); }
  else { ctx.fillStyle = c.cop ? '#1a3a6b' : c.col; roundRect(-w/2, -h/2, w, h, 5); ctx.fill(); }
  if (t.bike || t.cycle) { ctx.fillStyle = '#222'; ctx.fillRect(-w/2, -h/2, w, h*.28); }
  ctx.fillStyle = 'rgba(20,30,45,.85)'; roundRect(-w/2+3, -h/2+5, w-6, h*.26, 3); ctx.fill();
  ctx.fillStyle = 'rgba(20,30,45,.55)'; roundRect(-w/2+4, h/2-h*.26, w-8, h*.18, 3); ctx.fill();
  if (t.canopy) { ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(-w/2+1, -h/2+2, w-2, h-4, 6); ctx.fill();
    ctx.fillStyle = c.col; ctx.fillRect(-w/2, h*.1, w, h*.35); }
  if (t.taxi) { ctx.fillStyle = '#111'; ctx.fillRect(-w/2, -2, w, 4); }
  if (t.bus && c.roof) { ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(-w/2+2,-h/2+6,w-4,h-12,3); ctx.fill();
    for (let i=0;i<5;i++){ ctx.fillStyle = pick(['#c68642','#a86b3c']); ctx.beginPath(); ctx.arc(rand(-w/2+5,w/2-5), rand(-h/2+10,h/2-10), 3, 0, TAU); ctx.fill(); } }
  if (c.load) drawLoad(c.load, w, h);
  if (c.cop) { ctx.fillStyle = (Math.floor(performance.now()/200)%2) ? '#ff3b3b' : '#3b6bff'; ctx.fillRect(-w/2+4,-3,w-8,6);
    ctx.fillStyle = c.corrupt ? '#f4c20d' : '#eef'; ctx.fillRect(-4, -h/2+2, 8, 4); /* cap tell: gold=corrupt */ }
  if (isPlayer) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; roundRect(-w/2,-h/2,w,h,5); ctx.stroke(); }
  ctx.restore();
}
function drawLoad(type, w, h) {
  ctx.save();
  switch (type) {
    case 'family': for (let i=0;i<3;i++){ ctx.fillStyle = pick(['#e74c3c','#2980b9','#f1c40f']); ctx.beginPath(); ctx.arc(0, -h*.1 + i*7, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c68642'; ctx.beginPath(); ctx.arc(0, -h*.1 + i*7 - 4, 2.5, 0, TAU); ctx.fill(); } break;
    case 'cylinders': ctx.fillStyle = '#b22'; for (let i=0;i<3;i++) roundRect(-w/2 + i*(w/3)+2, -6, w/3-3, 16, 3), ctx.fill(); break;
    case 'fridge': ctx.fillStyle = '#eee'; ctx.fillRect(-w*.4, -h*.55, w*.8, h*.6); ctx.strokeStyle='#999'; ctx.strokeRect(-w*.4,-h*.55,w*.8,h*.6); break;
    case 'hay': ctx.fillStyle = '#d9b34a'; ctx.beginPath(); ctx.arc(0, 0, w*.9, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,20,.5)'; for (let i=-3;i<=3;i++){ ctx.beginPath(); ctx.moveTo(i*4,-w); ctx.lineTo(i*4,w); ctx.stroke(); } break;
    case 'chickens': for (let i=0;i<6;i++){ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(rand(-w/2,w/2), rand(-h/3,h/3), 3, 0, TAU); ctx.fill(); } break;
    case 'ladder': ctx.fillStyle = '#c9a06a'; ctx.fillRect(-3, -h, 6, h*2); for (let i=-4;i<=4;i++){ ctx.fillRect(-3, i*8, 6, 2); } break;
    case 'mattress': ctx.fillStyle = '#d36a8f'; roundRect(-w*.55, -h*.45, w*1.1, h*.5, 4); ctx.fill(); break;
    case 'sofa': ctx.fillStyle = '#8a5a3a'; roundRect(-w*.5, -h*.4, w, h*.4, 4); ctx.fill(); break;
    case 'tv': ctx.fillStyle = '#222'; ctx.fillRect(-w*.4, -h*.4, w*.8, h*.35); ctx.fillStyle='#4af'; ctx.fillRect(-w*.35,-h*.37,w*.7,h*.28); break;
    case 'pots': ctx.fillStyle = '#b5763a'; for (let i=0;i<4;i++){ ctx.beginPath(); ctx.arc((i-1.5)*7, 0, 5, 0, TAU); ctx.fill(); } break;
    case 'cane': ctx.fillStyle = '#6f9e5a'; for (let i=-5;i<=5;i++){ ctx.fillRect(i*3, -h, 2, h*2); } break;
  }
  ctx.restore();
}
function drawPed(p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.angle || 0) + Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ellipse(1, 2, p.kind === 'cow' ? 12 : 5, p.kind === 'cow' ? 8 : 4);
  if (p.kind === 'cow') { ctx.fillStyle = '#e8e2d0'; ellipse(0, 0, 8, 13); ctx.fillStyle = '#b98a5e'; ctx.fillRect(-3, -13, 6, 5); }
  else if (p.kind === 'dog') { ctx.fillStyle = '#a9713f'; ellipse(0, 0, 4, 8); ctx.fillRect(-2, -9, 4, 4); }
  else if (p.kind === 'goat') { ctx.fillStyle = '#d8d2c4'; ellipse(0, 0, 5, 9); ctx.fillStyle='#555'; ctx.fillRect(-2,-10,4,4); }
  else if (p.kind === 'monkey') { ctx.fillStyle = '#6b5a44'; ellipse(0, 0, 4, 7); ctx.fillStyle='#c9a074'; ctx.beginPath(); ctx.arc(0,-6,3,0,TAU); ctx.fill(); }
  else if (p.kind === 'pig') { ctx.fillStyle = '#3a3a3a'; ellipse(0, 0, 5, 9); }
  else { ctx.fillStyle = p.cloth; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(0, -3, 3.2, 0, TAU); ctx.fill();
    if (p.player) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0,0,6,0,TAU); ctx.stroke(); } }
  ctx.restore();
}
function drawStall(s) {
  ctx.save(); ctx.translate(s.x, s.y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-14, 8, 28, 5);
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-13, -4, 26, 14);              // cart
  ctx.fillStyle = s.c; ctx.fillRect(-15, -12, 30, 8);                    // canopy
  ctx.fillStyle = 'rgba(255,255,255,.2)'; for (let i=0;i<3;i++){ ctx.beginPath(); // steam
    ctx.arc(rand(-6,6), -16 - i*4, 3, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '600 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.n, 0, -20);
  ctx.restore();
}
function drawLandmark(l) {
  const x = l.x, y = l.y; ctx.save(); ctx.translate(x, y);
  const S = 70;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-S + 6, -S + 10, S * 2, S * 2);
  switch (l.type) {
    case 'mosque': ctx.fillStyle='#e6d5b8'; ctx.fillRect(-S,-S*.2,S*2,S*1.2);
      ctx.fillStyle='#2e8b73'; ctx.beginPath(); ctx.arc(0,-S*.2,S*.55,Math.PI,TAU); ctx.fill();
      ctx.fillStyle='#e6d5b8'; ctx.fillRect(-S,-S,10,S*.8); ctx.fillRect(S-10,-S,10,S*.8);
      ctx.fillStyle='#2e8b73'; ctx.beginPath(); ctx.arc(-S+5,-S,7,0,TAU); ctx.arc(S-5,-S,7,0,TAU); ctx.fill(); break;
    case 'film': ctx.fillStyle='#111'; ctx.fillRect(-S,-S*.3,S*2,S); ctx.fillStyle='#f4c20d'; ctx.font='900 26px sans-serif'; ctx.textAlign='center'; ctx.fillText('FILM CITY',0,-S*.5);
      ctx.fillStyle='#eee'; ctx.fillRect(-S*.5,-S*.1,S,S*.5); ctx.fillStyle='#111'; for(let i=0;i<4;i++) ctx.fillRect(-S*.4+i*S*.22,-S*.05,S*.12,S*.4); break;
    case 'fort': ctx.fillStyle='#c9963f'; ctx.fillRect(-S,-S*.4,S*2,S*1.3);
      for (let i=-S;i<S;i+=20){ ctx.fillRect(i,-S*.55,12,14); } ctx.fillStyle='#7a5a2a'; ctx.fillRect(-12,S*.3,24,S*.6); break;
    case 'ghat': ctx.fillStyle='#3f7d9e'; ctx.fillRect(-S,S*.2,S*2,S); // river
      ctx.fillStyle='#c9a06a'; for(let i=0;i<5;i++) ctx.fillRect(-S+i*6,-S*.1+i*10,S*2-i*12,10); // steps
      ctx.fillStyle='#c0563a'; ctx.fillRect(-14,-S*.5,28,S*.5); ctx.fillStyle='#e0b93c'; ctx.beginPath(); ctx.moveTo(-14,-S*.5); ctx.lineTo(0,-S*.75); ctx.lineTo(14,-S*.5); ctx.fill(); break;
    case 'gurudwara': ctx.fillStyle='#e0b93c'; ctx.fillRect(-S*.7,-S*.2,S*1.4,S);
      ctx.beginPath(); ctx.arc(0,-S*.2,S*.5,Math.PI,TAU); ctx.fill(); ctx.fillStyle='#f6e27a'; ctx.beginPath(); ctx.arc(0,-S*.6,10,0,TAU); ctx.fill();
      ctx.fillStyle='#3f7db0'; ctx.fillRect(-S,S*.6,S*2,S*.4); break; // sarovar pool
    case 'church': ctx.fillStyle='#f2efe8'; ctx.fillRect(-S*.7,-S*.3,S*1.4,S*1.2);
      ctx.fillRect(-S*.2,-S*.9,S*.4,S*.6); ctx.fillStyle='#c9c2b0'; ctx.fillRect(-4,-S*1.2,8,S*.35); ctx.fillRect(-10,-S*1.05,20,6); break;
    case 'gopuram': for (let i=0;i<5;i++){ const wsc=S*(1-i*.16); ctx.fillStyle=['#c0392b','#e0b93c','#3f7d8a','#c76a8f','#4f9e6b'][i];
      ctx.fillRect(-wsc,-S*.3-i*22, wsc*2, 22); } ctx.fillStyle='#e0b93c'; ctx.beginPath(); ctx.arc(0,-S*.3-5*22,10,0,TAU); ctx.fill(); break;
    case 'bridge': ctx.fillStyle='#7f8c99'; ctx.fillRect(-S,-8,S*2,16); ctx.strokeStyle='#5f6b78'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-S,-8); ctx.quadraticCurveTo(0,-S*.9,S,-8); ctx.stroke();
      for (let i=-S;i<S;i+=16){ ctx.beginPath(); ctx.moveTo(i,-8); ctx.lineTo(i,-S*.7+Math.abs(i)*.4); ctx.stroke(); } break;
    case 'beach': ctx.fillStyle='#3fa0c0'; ctx.fillRect(-S,-S,S*2,S); ctx.fillStyle='#e8dcc0'; ctx.fillRect(-S,0,S*2,S);
      ctx.fillStyle='#6b4a2a'; ctx.fillRect(S*.4,-S*.2,6,S*.5); ctx.fillStyle='#2e8b57'; ctx.beginPath(); ctx.arc(S*.43,-S*.2,16,0,Math.PI); ctx.fill(); break;
  }
  // label
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '800 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(DISTRICTS[l.d].name, 0, S + 24);
  ctx.restore();
}

// ---------- Minimap ----------
const MM = 180, MSCALE = MM / WORLD_W;
function drawMinimap() {
  // district tints
  for (let i = 0; i < 9; i++) { const mx = i % 3, my = (i / 3) | 0;
    mctx.fillStyle = DISTRICTS[i].ground; mctx.fillRect(mx * MM / 3, my * MM / 3, MM / 3 + 1, MM / 3 + 1); }
  mctx.globalAlpha = .5; mctx.fillStyle = '#000'; mctx.fillRect(0, 0, MM, MM); mctx.globalAlpha = 1;
  mctx.strokeStyle = '#5a5a62'; mctx.lineWidth = Math.max(1, R * TILE * MSCALE);
  for (let k = 0; k * P < GW; k++) { const x = (k * P + R / 2) * TILE * MSCALE; mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, MM); mctx.stroke(); }
  for (let k = 0; k * P < GH; k++) { const y = (k * P + R / 2) * TILE * MSCALE; mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(MM, y); mctx.stroke(); }
  for (const l of landmarks) { mctx.fillStyle = '#fff'; mctx.fillRect(l.x * MSCALE - 2, l.y * MSCALE - 2, 4, 4); }
  for (const pk of pickups) { mctx.fillStyle = pk.kind === 'pick' ? '#f4c20d' : '#2ecc71'; mctx.beginPath(); mctx.arc(pk.x * MSCALE, pk.y * MSCALE, 4, 0, TAU); mctx.fill(); }
  mctx.fillStyle = '#3b6bff'; for (const c of cops) { mctx.beginPath(); mctx.arc(c.x * MSCALE, c.y * MSCALE, 2.5, 0, TAU); mctx.fill(); }
  mctx.fillStyle = '#ff3b3b'; mctx.beginPath(); mctx.arc(player.x * MSCALE, player.y * MSCALE, 3.5, 0, TAU); mctx.fill();
  mctx.strokeStyle = 'rgba(255,255,255,.25)'; mctx.lineWidth = 1; mctx.strokeRect(cam.x * MSCALE, cam.y * MSCALE, VW * MSCALE, VH * MSCALE);
}

// ---------- Loop ----------
let last = 0;
function frame(ts) { const dt = Math.min(.05, (ts - last) / 1000) || .016; last = ts;
  if (gameOn) { update(dt); draw(); } requestAnimationFrame(frame); }
requestAnimationFrame(frame);

// ---------- Menu ----------
function toggleMute() { AudioSys.muted = !AudioSys.muted; if (AudioSys.muted) AudioSys.siren(false); toast(AudioSys.muted ? 'MUTED' : 'SOUND ON'); }
function startGame() {
  AudioSys.init();
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').hidden = false;
  newPlayer(true); spawnWorld(); updateStars();
  cam.x = clamp(player.x - VW / 2, 0, Math.max(0, WORLD_W - VW)); cam.y = clamp(player.y - VH / 2, 0, Math.max(0, WORLD_H - VH));
  gameOn = true;
}
document.getElementById('playBtn').addEventListener('click', startGame);

})();
