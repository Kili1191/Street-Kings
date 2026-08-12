/* ============================================================
   RICKSHAW RAJA — a 3D, third-person open-world set in an
   Indian city of nine districts. Three.js (r150), single file.
   ============================================================ */
(() => {
'use strict';
const T = window.THREE;
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b));
const pick = a => a[randi(0, a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Appearance options ----------
const SKINS   = ['#f0c8a0','#e0ac69','#c68642','#a86b3c','#8d5524','#5c3a21'];
const TURBANS = ['#ff5722','#ffc107','#e91e63','#3f51b5','#00897b','#ffffff','#4caf50','#9c27b0','#ff9933'];
const KURTAS  = ['#ffffff','#ff9933','#138808','#c0392b','#2980b9','#f1c40f','#8e44ad','#16a085','#e67e22','#ecf0f1'];
const DHOTIS  = ['#ffffff','#efe6d0','#d9c9a3','#c9b892','#34495e','#7f8c8d'];
const BEARDS  = ['none','stubble','full','long'];
const opts = { name:'Raja Bahadur', skin:'#c68642', turban:true, turbanColor:'#ff9933',
  kurta:'#ff9933', dhoti:'#ffffff', beard:'full', moustache:true };

// ---------- Character builder (low-poly humanoid) ----------
function mat(color, flat) { return new T.MeshLambertMaterial({ color: new T.Color(color) }); }
function limb(w, h, d, color) { // pivot at TOP of the limb
  const g = new T.BoxGeometry(w, h, d); g.translate(0, -h / 2, 0);
  return new T.Mesh(g, mat(color));
}
function buildCharacter(o) {
  const grp = new T.Group();
  const skinM = mat(o.skin), kurtaM = mat(o.kurta), dhotiM = mat(o.dhoti);
  // hips
  const hip = 0.95;
  // legs (pivot at hip)
  const lL = limb(0.26, 0.9, 0.26, o.dhoti); lL.position.set(-0.16, hip, 0);
  const rL = limb(0.26, 0.9, 0.26, o.dhoti); rL.position.set(0.16, hip, 0);
  grp.add(lL, rL);
  // torso (kurta) — long, covers hips
  const torso = new T.Mesh(new T.BoxGeometry(0.66, 0.95, 0.4), kurtaM);
  torso.position.set(0, hip + 0.42, 0); grp.add(torso);
  // kurta collar band
  const band = new T.Mesh(new T.BoxGeometry(0.68, 0.12, 0.42), mat('#00000022'));
  band.position.set(0, hip + 0.84, 0); grp.add(band);
  // arms (pivot at shoulder)
  const lA = limb(0.2, 0.82, 0.2, o.kurta); lA.position.set(-0.42, hip + 0.86, 0);
  const rA = limb(0.2, 0.82, 0.2, o.kurta); rA.position.set(0.42, hip + 0.86, 0);
  // hands
  const lH = new T.Mesh(new T.BoxGeometry(0.2, 0.18, 0.2), skinM); lH.position.set(0, -0.72, 0); lA.add(lH);
  const rH = new T.Mesh(new T.BoxGeometry(0.2, 0.18, 0.2), skinM); rH.position.set(0, -0.72, 0); rA.add(rH);
  grp.add(lA, rA);
  // neck + head
  const neck = new T.Mesh(new T.BoxGeometry(0.2, 0.14, 0.2), skinM); neck.position.set(0, hip + 0.92, 0); grp.add(neck);
  const head = new T.Group(); head.position.set(0, hip + 1.12, 0); grp.add(head);
  const face = new T.Mesh(new T.BoxGeometry(0.42, 0.44, 0.42), skinM); head.add(face);
  // eyes
  const eyeM = mat('#1a1a1a');
  for (const sx of [-0.1, 0.1]) { const e = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 0.04), eyeM); e.position.set(sx, 0.05, 0.22); head.add(e); }
  // hair (if no turban) or turban
  if (o.turban) {
    const tM = mat(o.turbanColor);
    const dome = new T.Mesh(new T.SphereGeometry(0.3, 14, 10, 0, TAU, 0, Math.PI / 2), tM);
    dome.position.set(0, 0.2, 0); head.add(dome);
    const wrap = new T.Mesh(new T.TorusGeometry(0.26, 0.09, 8, 18), tM);
    wrap.rotation.x = Math.PI / 2; wrap.position.set(0, 0.16, 0); head.add(wrap);
    const wrap2 = new T.Mesh(new T.TorusGeometry(0.3, 0.07, 8, 18), tM);
    wrap2.rotation.x = Math.PI / 2; wrap2.position.set(0, 0.05, 0.02); head.add(wrap2);
    // raja plume / kalgi
    const jewel = new T.Mesh(new T.SphereGeometry(0.05, 8, 8), mat('#ffd700')); jewel.position.set(0, 0.2, 0.26); head.add(jewel);
    const plume = new T.Mesh(new T.ConeGeometry(0.05, 0.28, 8), mat('#ffffff')); plume.position.set(0, 0.42, 0.2); plume.rotation.x = -0.3; head.add(plume);
  } else {
    const hair = new T.Mesh(new T.BoxGeometry(0.44, 0.16, 0.44), mat('#101010')); hair.position.set(0, 0.24, 0); head.add(hair);
  }
  // beard
  if (o.beard !== 'none') {
    const bM = mat('#141210');
    if (o.beard === 'stubble') { const b = new T.Mesh(new T.BoxGeometry(0.4, 0.16, 0.14), bM); b.position.set(0, -0.16, 0.2); head.add(b); }
    else if (o.beard === 'full') { const b = new T.Mesh(new T.BoxGeometry(0.44, 0.3, 0.16), bM); b.position.set(0, -0.18, 0.19); head.add(b); }
    else { const b = new T.Mesh(new T.BoxGeometry(0.44, 0.5, 0.18), bM); b.position.set(0, -0.3, 0.18); head.add(b); }
  }
  // moustache
  if (o.moustache) { const m = new T.Mesh(new T.BoxGeometry(0.3, 0.06, 0.08), mat('#141210')); m.position.set(0, -0.06, 0.22); head.add(m); }

  grp.userData = { lL, rL, lA, rA, head, phase: 0, punch: 0 };
  grp.scale.set(0.62, 0.62, 0.62); // ~1.8m tall
  return grp;
}
function animateChar(g, moving, dt, speed) {
  const u = g.userData;
  if (moving) { u.phase += dt * speed * 2.2; const s = Math.sin(u.phase) * 0.7;
    u.lL.rotation.x = s; u.rL.rotation.x = -s; u.lA.rotation.x = -s * 0.7; u.rA.rotation.x = s * 0.7; }
  else { u.lL.rotation.x = lerp(u.lL.rotation.x, 0, .2); u.rL.rotation.x = lerp(u.rL.rotation.x, 0, .2);
    u.lA.rotation.x = lerp(u.lA.rotation.x, 0, .2); u.rA.rotation.x = lerp(u.rA.rotation.x, 0, .2); }
  if (u.punch > 0) { u.punch -= dt * 4; u.rA.rotation.x = -Math.PI / 2 * Math.min(1, u.punch * 1.5); }
}

// ---------- Districts ----------
const DISTRICTS = [
  { name:'Purani Dilli', greet:'Welcome to Purani Dilli', ground:'#b8956a', pal:['#a9553f','#c47a4a','#9c6b3f','#b5493f'],
    fact:'Purani Dilli — 400-year-old lanes of Chandni Chowk, the call to prayer over India’s busiest bazaar.' },
  { name:'Bambai', greet:'Welcome to Bambai', ground:'#8f9aa3', pal:['#d9d2c7','#8c99a6','#5f6b78','#37516b'],
    fact:'Bambai — Bollywood dreams above, dabbawalas below: 200,000 tiffins delivered daily by hand.' },
  { name:'Marwar', greet:'Padharo — Marwar', ground:'#caa25e', pal:['#d15b7a','#c76a8f','#3f6fb0','#e08a3c'],
    fact:'Marwar — Jaipur the Pink City, Jodhpur the Blue City, a fort on every hill.' },
  { name:'Kashi', greet:'Har Har Mahadev — Kashi', ground:'#c2a06a', pal:['#d98a2b','#c0563a','#b8813f','#9c6b8a'],
    fact:'Kashi (Varanasi) — one of the oldest living cities on Earth; the Ganga Aarti lights the ghats each dusk.' },
  { name:'Punjab', greet:'Sat Sri Akal — Punjab', ground:'#b7a94e', pal:['#e0b93c','#7fa25a','#3f7d5c','#d98a3c'],
    fact:'Punjab — the Golden Temple langar feeds 100,000 people free every day, all seated as equals.' },
  { name:'Kerala', greet:'Namaskaram — Kerala', ground:'#5f8f5c', pal:['#2e8b73','#4f9e6b','#c0563a','#e0c04a'],
    fact:'Kerala — “God’s Own Country”: backwaters, 90%+ literacy, and Onam’s flower carpets and feasts.' },
  { name:'Kolkata', greet:'Eso — Kolkata', ground:'#a6996e', pal:['#e0b93c','#c9bfa8','#b56f4a','#8a9c6b'],
    fact:'Kolkata — yellow Ambassador taxis, hand-pulled rickshaws, and Durga Puja’s open-air art.' },
  { name:'Chennai', greet:'Vanakkam — Chennai', ground:'#c2a15e', pal:['#c0392b','#e0b93c','#3f7d8a','#c76a8f'],
    fact:'Chennai — towering temple gopurams, filter “kaapi” in steel tumblers, and the long Marina beach.' },
  { name:'Goa', greet:'Welcome to Goa', ground:'#d8c48f', pal:['#e8dcc0','#3fa0a0','#c0563a','#e0b93c'],
    fact:'Goa — Portuguese-white churches, palm beaches and “susegad”: the art of doing nothing, slowly.' },
];
const WORLD = 180, HALF = WORLD / 2, CELL = WORLD / 3, STEP = 20, ROADW = 7;
function districtAt(x, z) {
  const mx = clamp(Math.floor((x + HALF) / CELL), 0, 2), mz = clamp(Math.floor((z + HALF) / CELL), 0, 2);
  return mz * 3 + mx;
}
const onRoad = (x, z) => {
  const fx = ((x % STEP) + STEP) % STEP, fz = ((z % STEP) + STEP) % STEP;
  return fx < ROADW || fz < ROADW;
};

// ---------- Renderer / scene ----------
let renderer, scene, camera, clock;
const buildings = []; // {x,z,hw,hd}
let ground;
function initThree() {
  renderer = new T.WebGLRenderer({ canvas: $('game'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  scene = new T.Scene();
  scene.background = new T.Color('#cfe0ef');
  scene.fog = new T.Fog('#cfe0ef', 60, 150);
  camera = new T.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 400);
  const hemi = new T.HemisphereLight('#ffffff', '#6b5a3a', 0.95); scene.add(hemi);
  const sun = new T.DirectionalLight('#fff3d6', 0.9); sun.position.set(40, 80, 20); scene.add(sun);
  clock = new T.Clock();
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
}

// ground texture: district colours + road grid + lane dashes
function makeGroundTexture() {
  const S = 1536, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const px = v => (v + HALF) / WORLD * S;
  for (let i = 0; i < 9; i++) { const mx = i % 3, mz = (i / 3) | 0;
    g.fillStyle = DISTRICTS[i].ground; g.fillRect(mx * S / 3, mz * S / 3, S / 3 + 1, S / 3 + 1); }
  // dirt speckle
  g.fillStyle = 'rgba(60,50,35,.06)'; for (let i = 0; i < 4000; i++) g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  // roads
  g.fillStyle = '#3b3b41';
  for (let v = -HALF; v <= HALF; v += STEP) { g.fillRect(px(v), 0, ROADW / WORLD * S, S); g.fillRect(0, px(v), S, ROADW / WORLD * S); }
  // lane dashes
  g.strokeStyle = 'rgba(240,210,120,.5)'; g.lineWidth = 2; g.setLineDash([10, 12]);
  for (let v = -HALF; v <= HALF; v += STEP) { const p = px(v) + ROADW / WORLD * S / 2;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke(); }
  const tex = new T.CanvasTexture(c); tex.anisotropy = 4; return tex;
}
function buildCity() {
  ground = new T.Mesh(new T.PlaneGeometry(WORLD, WORLD), new T.MeshLambertMaterial({ map: makeGroundTexture() }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // buildings on block cells (between roads)
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  for (let bx = -HALF + STEP; bx < HALF; bx += STEP) for (let bz = -HALF + STEP; bz < HALF; bz += STEP) {
    // block interior centre
    const cx = bx + (STEP - ROADW) / 2 + ROADW / 2 - STEP / 2 + STEP / 2; // = bx + ROADW/2 ... simplify below
    const x0 = bx + ROADW, z0 = bz + ROADW, bw = STEP - ROADW - 1;
    // split block into up to 2x2 buildings
    const nx = Math.random() < .5 ? 1 : 2, nz = Math.random() < .5 ? 1 : 2;
    const cw = bw / nx, cd = bw / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const px2 = x0 + i * cw + cw / 2, pz2 = z0 + j * cd + cd / 2;
      if (Math.abs(px2) > HALF - 2 || Math.abs(pz2) > HALF - 2) continue;
      const D = DISTRICTS[districtAt(px2, pz2)];
      const h = rand(4, 15), w = cw * rand(.7, .92), d = cd * rand(.7, .92);
      const m = new T.Mesh(boxGeo, mat(pick(D.pal)));
      m.scale.set(w, h, d); m.position.set(px2, h / 2, pz2); scene.add(m);
      // roof slab
      const roof = new T.Mesh(boxGeo, mat('#2b2b32')); roof.scale.set(w + .2, .4, d + .2); roof.position.set(px2, h + .1, pz2); scene.add(roof);
      // water tank
      if (Math.random() < .5) { const tk = new T.Mesh(boxGeo, mat('#222')); tk.scale.set(.8, .9, .8); tk.position.set(px2 + w * .2, h + .6, pz2 + d * .2); scene.add(tk); }
      buildings.push({ x: px2, z: pz2, hw: w / 2 + .3, hd: d / 2 + .3 });
    }
  }
  buildLandmarks();
  scatterProps();
}
function buildLandmarks() {
  for (let i = 0; i < 9; i++) { const mx = i % 3, mz = (i / 3) | 0;
    const cx = (mx - 1) * CELL, cz = (mz - 1) * CELL; // district centre in world
    const g = new T.Group(); g.position.set(cx, 0, cz); scene.add(g);
    const D = DISTRICTS[i], col = D.pal[0];
    if (i === 4) { // Punjab: golden gurudwara dome
      const base = new T.Mesh(new T.BoxGeometry(6, 5, 6), mat('#e0b93c')); base.position.y = 2.5; g.add(base);
      const dome = new T.Mesh(new T.SphereGeometry(3.4, 20, 14, 0, TAU, 0, Math.PI / 2), mat('#f4c20d')); dome.position.y = 5; g.add(dome);
      const finial = new T.Mesh(new T.ConeGeometry(.5, 2, 10), mat('#f6e27a')); finial.position.y = 9; g.add(finial);
    } else if (i === 7) { // Chennai gopuram: stacked tiers
      for (let k = 0; k < 6; k++) { const s = 7 - k, m = new T.Mesh(new T.BoxGeometry(s, 2, s), mat(pick(D.pal))); m.position.y = 1 + k * 2; g.add(m); }
    } else if (i === 0) { // Delhi mosque dome + minarets
      const b = new T.Mesh(new T.BoxGeometry(7, 4, 5), mat('#e6d5b8')); b.position.y = 2; g.add(b);
      const dome = new T.Mesh(new T.SphereGeometry(2.4, 18, 12, 0, TAU, 0, Math.PI / 2), mat('#2e8b73')); dome.position.y = 4; g.add(dome);
      for (const sx of [-3.5, 3.5]) { const min = new T.Mesh(new T.CylinderGeometry(.5, .5, 9, 10), mat('#e6d5b8')); min.position.set(sx, 4.5, 0); g.add(min);
        const cap = new T.Mesh(new T.SphereGeometry(.6, 10, 8), mat('#2e8b73')); cap.position.set(sx, 9, 0); g.add(cap); }
    } else { // generic tall monument tower per district
      const tower = new T.Mesh(new T.BoxGeometry(5, 14, 5), mat(col)); tower.position.y = 7; g.add(tower);
      const top = new T.Mesh(new T.ConeGeometry(3.4, 4, 4), mat('#f4c20d')); top.position.y = 16; top.rotation.y = Math.PI / 4; g.add(top);
    }
  }
}
// street stalls, cows, garbage as simple meshes
function scatterProps() {
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 60; i++) { const p = roadSpot(); if (!p) continue;
    const cart = new T.Mesh(boxGeo, mat('#6b4a2a')); cart.scale.set(2, 1, 1.2); cart.position.set(p.x, .5, p.z); scene.add(cart);
    const canopy = new T.Mesh(boxGeo, mat(pick(['#e0b93c','#c0563a','#4f9e6b','#2980b9']))); canopy.scale.set(2.4, .3, 1.5); canopy.position.set(p.x, 1.7, p.z); scene.add(canopy); }
  // garbage piles
  for (let i = 0; i < 120; i++) { const p = roadSpot(); if (!p) continue;
    const gb = new T.Mesh(new T.SphereGeometry(rand(.3, .7), 6, 5), mat(pick(['#7a6f4a','#8a5a3a','#556b4a']))); gb.position.set(p.x, .3, p.z); gb.scale.y = .6; scene.add(gb); }
}
function roadSpot() { for (let i = 0; i < 20; i++) { const x = rand(-HALF, HALF), z = rand(-HALF, HALF); if (onRoad(x, z)) return { x, z }; } return null; }
const LANDMARK_CENTRES = [];
for (let i = 0; i < 9; i++) LANDMARK_CENTRES.push([((i % 3) - 1) * CELL, (((i / 3) | 0) - 1) * CELL]);
function farFromLandmarks(x, z, r) { for (const [lx, lz] of LANDMARK_CENTRES) if ((x - lx) ** 2 + (z - lz) ** 2 < r * r) return false; return true; }
function findSpawn() {
  for (let i = 0; i < 400; i++) { const p = roadSpot(); if (!p) continue;
    if (!blocked(p.x, p.z) && !blocked(p.x, p.z - 9) && farFromLandmarks(p.x, p.z, 12)) return new T.Vector3(p.x, 0, p.z); }
  return new T.Vector3(10, 0, 30);
}

// ---------- NPCs ----------
const npcs = [];
function spawnNPCs(n) {
  for (let i = 0; i < n; i++) {
    const p = roadSpot(); if (!p) continue;
    const o = { skin: pick(SKINS), turban: Math.random() < .4, turbanColor: pick(TURBANS),
      kurta: pick(KURTAS), dhoti: pick(DHOTIS), beard: pick(BEARDS), moustache: Math.random() < .6 };
    const g = buildCharacter(o); g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU); scene.add(g);
    npcs.push({ g, dir: rand(0, TAU), speed: rand(1.2, 2.4), turn: 0, down: 0, t: rand(0, 10) });
  }
}
// cows
const cows = [];
function spawnCows(n) {
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  for (let i = 0; i < n; i++) { const p = roadSpot(); if (!p) continue;
    const g = new T.Group();
    const body = new T.Mesh(boxGeo, mat('#e8e2d0')); body.scale.set(1, .9, 1.9); body.position.y = 1; g.add(body);
    const head = new T.Mesh(boxGeo, mat('#d8cfb8')); head.scale.set(.7, .7, .7); head.position.set(0, 1.1, 1.2); g.add(head);
    for (const [sx, sz] of [[-.4, .7], [.4, .7], [-.4, -.7], [.4, -.7]]) { const leg = new T.Mesh(boxGeo, mat('#cfc6ad')); leg.scale.set(.2, 1, .2); leg.position.set(sx, .5, sz); g.add(leg); }
    g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU); scene.add(g);
    cows.push({ g, dir: rand(0, TAU), speed: rand(.4, .9), t: rand(0, 10) }); }
}

// ---------- Vehicle: auto-rickshaw ----------
function buildAuto(color) {
  const g = new T.Group(); const boxGeo = new T.BoxGeometry(1, 1, 1);
  const body = new T.Mesh(boxGeo, mat(color)); body.scale.set(1.8, 1.1, 2.6); body.position.y = 1; g.add(body);
  const canopy = new T.Mesh(boxGeo, mat('#111')); canopy.scale.set(1.9, 1.0, 1.6); canopy.position.set(0, 2, -.2); g.add(canopy);
  const front = new T.Mesh(boxGeo, mat(color)); front.scale.set(1.2, 1.2, .8); front.position.set(0, 1.1, 1.5); g.add(front);
  const wsh = new T.Mesh(boxGeo, mat('#223')); wsh.scale.set(1.3, .8, .1); wsh.position.set(0, 1.6, 1.9); g.add(wsh);
  // wheels
  const wg = new T.CylinderGeometry(.5, .5, .3, 12);
  const fw = new T.Mesh(wg, mat('#111')); fw.rotation.z = Math.PI / 2; fw.position.set(0, .5, 1.7); g.add(fw);
  for (const sx of [-.9, .9]) { const w = new T.Mesh(wg, mat('#111')); w.rotation.z = Math.PI / 2; w.position.set(sx, .5, -1); g.add(w); }
  return g;
}
const vehicles = [];
function spawnVehicles(n) {
  for (let i = 0; i < n; i++) { const p = roadSpot(); if (!p) continue;
    const g = buildAuto(pick(['#f4c20d', '#1abc9c', '#e67e22'])); g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU);
    scene.add(g); vehicles.push({ g, yaw: g.rotation.y, speed: 0, ai: true, aiDir: rand(0, TAU), aiTimer: 0 }); }
}

// ---------- Player ----------
const player = { g: null, pos: new T.Vector3(0, 0, 4), yaw: 0, vel: new T.Vector3(),
  health: 100, fuel: 100, cash: 0, inVehicle: null, moving: false, speed: 0 };
const cam = { yaw: 0, pitch: 0.26, dist: 7.5 };

// ---------- Input ----------
const keys = {};
addEventListener('keydown', e => { const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  keys[k] = true;
  if (k === 'f') tryEnterExit();
  if (k === 'j') punch();
  if (k === 't') spit();
  if (k === 'h' && player.inVehicle) horn();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
// mouse drag to orbit
let dragging = false, lastX = 0, lastY = 0;
$('game').addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => { if (!dragging || !started) return;
  cam.yaw -= (e.clientX - lastX) * .006; cam.pitch = clamp(cam.pitch - (e.clientY - lastY) * .004, .12, 1.2);
  lastX = e.clientX; lastY = e.clientY; });
addEventListener('click', e => { if (started && !dragging) { /* click punch on foot */ } });
// touch
const tHeld = {};
(function touch() {
  if (matchMedia('(hover:none)').matches) $('touch').classList.add('on');
  const bind = (id, fn, up) => { const el = $(id); if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); });
    if (up) el.addEventListener('touchend', e => { e.preventDefault(); up(); }); };
  const set = (id, k) => bind(id, () => tHeld[k] = 1, () => tHeld[k] = 0);
  set('tUp', 'up'); set('tDown', 'down'); set('tLeft', 'left'); set('tRight', 'right');
  bind('tAct', tryEnterExit); bind('tPunch', punch); bind('tSpit', spit);
})();

// ---------- Actions ----------
function tryEnterExit() {
  if (!started) return; ensureAudio();
  if (player.inVehicle) { const v = player.inVehicle; v.ai = false; v.speed = 0;
    player.inVehicle = null; player.g.visible = true;
    player.pos.set(v.g.position.x + Math.cos(v.yaw) * 2.4, 0, v.g.position.z - Math.sin(v.yaw) * 2.4);
    player.g.position.copy(player.pos); toast('OUT'); return; }
  let best = null, bd = 5 * 5;
  for (const v of vehicles) { const d = v.g.position.distanceToSquared(player.pos); if (d < bd) { bd = d; best = v; } }
  if (best) { player.inVehicle = best; best.ai = false; player.g.visible = false; player.yaw = best.yaw; toast('DRIVE!'); ensureAudio(); }
}
function punch() {
  if (!started || player.inVehicle) return; player.g.userData.punch = 1; blip(180, .08, 'square', .2);
  const fx = player.pos.x + Math.sin(player.yaw) * 1.6, fz = player.pos.z + Math.cos(player.yaw) * 1.6;
  for (const n of npcs) { if (n.down > 0) continue;
    if (n.g.position.distanceToSquared(new T.Vector3(fx, 0, fz)) < 2.0) {
      n.down = 4; n.g.rotation.z = Math.PI / 2 - .1; n.g.position.y = 0.4; crime(1); toast('DHISHOOM! 👊', '#ff9f43'); spark(n.g.position); break; }
  }
}
let spitCount = 0;
function spit() {
  if (!started) return; blip(300, .12, 'sawtooth', .15);
  const fx = player.pos.x + Math.sin(player.yaw) * 1.4, fz = player.pos.z + Math.cos(player.yaw) * 1.4;
  const decal = new T.Mesh(new T.CircleGeometry(rand(.3, .55), 10), new T.MeshBasicMaterial({ color: '#8a0f14', transparent: true, opacity: .82 }));
  decal.rotation.x = -Math.PI / 2; decal.position.set(fx, .05, fz); scene.add(decal);
  // little arc particle
  const p = new T.Mesh(new T.SphereGeometry(.09, 6, 6), new T.MeshBasicMaterial({ color: '#b31217' }));
  p.position.set(player.pos.x + Math.sin(player.yaw) * .6, 1.5, player.pos.z + Math.cos(player.yaw) * .6); scene.add(p);
  spitParts.push({ m: p, vx: Math.sin(player.yaw) * 3, vz: Math.cos(player.yaw) * 3, vy: 2, life: .6, decal: [fx, fz] });
  spitCount++; if (spitCount === 3) toast('PAAN MASALA 🔴', '#e74c3c');
}
const spitParts = [], sparks = [];
function spark(pos) { for (let i = 0; i < 8; i++) { const m = new T.Mesh(new T.SphereGeometry(.08, 5, 5), new T.MeshBasicMaterial({ color: '#ffd24d' }));
  m.position.copy(pos); m.position.y = 1; scene.add(m); sparks.push({ m, vx: rand(-3, 3), vy: rand(2, 5), vz: rand(-3, 3), life: .5 }); } }
function horn() { blip(340, .3, 'sawtooth', .25); }

// ---------- wanted / crime / bribe (light) ----------
let wanted = 0, heat = 0, wantedTimer = 0;
const cops = [];
function crime(a) { heat += a; if (heat >= 3) { heat = 0; wanted = clamp(wanted + 1, 0, 5); wantedTimer = 12; updateStars(); if (cops.length < wanted) spawnCop(); } }
function spawnCop() { const p = roadSpot(); if (!p) return;
  const g = buildAuto('#1a3a6b'); const bar = new T.Mesh(new T.BoxGeometry(1.6, .3, .6), mat('#ff3b3b')); bar.position.y = 2.6; g.add(bar); g.userData.bar = bar;
  g.position.set(p.x, 0, p.z); scene.add(g);
  cops.push({ g, yaw: 0, speed: 0, corrupt: Math.random() < .55 }); }
function updateStars() { let s = ''; for (let i = 0; i < wanted; i++) s += '★'; $('stars').textContent = s; siren(wanted > 0); }
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'b') tryBribe(); });
function tryBribe() {
  if (!started || wanted === 0) return;
  let best = null, bd = 8 * 8;
  for (const c of cops) { const d = c.g.position.distanceToSquared(player.pos); if (d < bd) { bd = d; best = c; } }
  if (!best) { toast('No cop close enough', '#ffd24d'); return; }
  const cost = 100 + wanted * 250;
  if (best.corrupt) { if (player.cash >= cost) { player.cash -= cost; wanted = 0; heat = 0; cops.forEach(c => scene.remove(c.g)); cops.length = 0; updateStars(); cashSnd(); toast('BRIBE ACCEPTED 🤝  −₹' + cost, '#8ef58e'); }
    else toast('Need ₹' + cost, '#ffd24d'); }
  else { toast('HONEST COP! 🚨', '#ff6b6b'); wanted = clamp(wanted + 1, 0, 5); wantedTimer = 14; updateStars(); }
}

// ---------- Audio ----------
let actx, amaster, sirenNode = null;
function ensureAudio() { if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); amaster = actx.createGain(); amaster.gain.value = .5; amaster.connect(actx.destination); } catch (e) {} }
function blip(f, d, ty, v) { if (!actx) return; const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.type = ty || 'square'; o.frequency.value = f; g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(amaster); o.start(t); o.stop(t + d); }
function cashSnd() { blip(880, .08, 'sine', .3); setTimeout(() => blip(1320, .12, 'sine', .3), 70); }
function siren(on) { if (!actx) return; if (on && !sirenNode) { const o = actx.createOscillator(), g = actx.createGain(), lfo = actx.createOscillator(), lg = actx.createGain(); o.type = 'sine'; o.frequency.value = 700; lfo.frequency.value = 2; lg.gain.value = 250; lfo.connect(lg); lg.connect(o.frequency); g.gain.value = .04; o.connect(g); g.connect(amaster); o.start(); lfo.start(); sirenNode = { o, lfo }; } else if (!on && sirenNode) { try { sirenNode.o.stop(); sirenNode.lfo.stop(); } catch (e) {} sirenNode = null; } }

// ---------- UI helpers ----------
function toast(text, color) { const b = $('toastBig'); b.textContent = text; b.style.color = color || '#fff'; b.style.opacity = 1; b.style.transform = 'translateY(-10px) scale(1.05)'; clearTimeout(toast._t); toast._t = setTimeout(() => { b.style.opacity = 0; b.style.transform = 'translateY(0) scale(1)'; }, 1100); }
function showBanner(title, fact) { const el = $('banner'); $('bTitle').textContent = title; $('bFact').textContent = fact; el.classList.add('show'); clearTimeout(showBanner._t); showBanner._t = setTimeout(() => el.classList.remove('show'), 4200); }
let hintT = 0; function hint(t) { const el = $('hint'); el.textContent = t; el.style.opacity = 1; hintT = .12; }

// ---------- collision ----------
function blocked(x, z) { if (Math.abs(x) > HALF - 1 || Math.abs(z) > HALF - 1) return true;
  for (const b of buildings) { if (Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd) return true; } return false; }

// ---------- update ----------
let curDistrict = -1, started = false;
function update(dt) {
  // input direction (camera-relative)
  const f = (keys['w'] || keys['arrowup'] || tHeld.up ? 1 : 0) - (keys['s'] || keys['arrowdown'] || tHeld.down ? 1 : 0);
  const s = (keys['d'] || tHeld.right ? 1 : 0) - (keys['a'] || tHeld.left ? 1 : 0);
  const turnKey = (keys['arrowright'] ? 1 : 0) - (keys['arrowleft'] ? 1 : 0);
  if (turnKey) cam.yaw -= turnKey * dt * 1.8;

  if (player.inVehicle) updateDrive(dt, f, s);
  else updateFoot(dt, f, s);

  updateNPCs(dt); updateCows(dt); updateVehicles(dt); updateCops(dt);
  updateParticles(dt);

  // district banner
  const di = districtAt(player.pos.x, player.pos.z);
  if (di !== curDistrict) { curDistrict = di; $('distName').textContent = DISTRICTS[di].name; showBanner(DISTRICTS[di].greet, DISTRICTS[di].fact); }

  // camera follow
  const target = player.inVehicle ? player.inVehicle.g.position : player.pos;
  const cd = player.inVehicle ? 10 : cam.dist;
  const cx = target.x - Math.sin(cam.yaw) * Math.cos(cam.pitch) * cd;
  const cz = target.z - Math.cos(cam.yaw) * Math.cos(cam.pitch) * cd;
  const cy = target.y + Math.sin(cam.pitch) * cd + 1.0;
  camera.position.lerp(new T.Vector3(cx, cy, cz), .18);
  camera.lookAt(target.x, target.y + 1.7, target.z);

  // regen
  if (wanted === 0 && player.health < 100) player.health = clamp(player.health + dt * 2, 0, 100);
  if (!player.inVehicle) player.fuel = clamp(player.fuel + dt * 3, 0, 100);
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; }
  if (!player.inVehicle) { for (const v of vehicles) if (v.g.position.distanceToSquared(player.pos) < 25) { hint('Press F to drive · J punch · T paan-spit'); break; } }

  updateHUD();
}
function updateFoot(dt, f, s) {
  player.g.visible = true;
  let dx = 0, dz = 0;
  if (f || s) { const ang = cam.yaw; dx = Math.sin(ang) * f + Math.cos(ang) * s; dz = Math.cos(ang) * f - Math.sin(ang) * s;
    const l = Math.hypot(dx, dz); dx /= l; dz /= l; }
  const sprint = keys['shift'] ? 1.7 : 1, spd = 4.2 * sprint;
  player.moving = !!(f || s); player.speed = player.moving ? spd : 0;
  if (player.moving) { player.yaw = Math.atan2(dx, dz);
    const nx = player.pos.x + dx * spd * dt, nz = player.pos.z + dz * spd * dt;
    if (!blocked(nx, player.pos.z)) player.pos.x = nx; if (!blocked(player.pos.x, nz)) player.pos.z = nz; }
  player.g.position.copy(player.pos); player.g.rotation.y = player.yaw;
  animateChar(player.g, player.moving, dt, spd);
}
function updateDrive(dt, f, s) {
  const v = player.inVehicle;
  if (player.fuel <= 0) v.speed *= .96;
  else v.speed += f * dt * 14;
  v.speed *= .985; v.speed = clamp(v.speed, -8, 20);
  if (Math.abs(v.speed) > .2) { v.yaw -= s * dt * 1.6 * Math.sign(v.speed) * clamp(Math.abs(v.speed) / 5, .3, 1); }
  const nx = v.g.position.x + Math.sin(v.yaw) * v.speed * dt, nz = v.g.position.z + Math.cos(v.yaw) * v.speed * dt;
  if (!blocked(nx, v.g.position.z)) v.g.position.x = nx; else v.speed *= -.3;
  if (!blocked(v.g.position.x, nz)) v.g.position.z = nz; else v.speed *= -.3;
  v.g.rotation.y = v.yaw; player.pos.copy(v.g.position);
  if (Math.abs(v.speed) > .1) player.fuel = clamp(player.fuel - Math.abs(v.speed) * dt * .05, 0, 100);
  player.speed = v.speed; cam.yaw = lerp(cam.yaw, v.yaw, .04);
  // run over npcs/cows
  for (const n of npcs) { if (n.down > 0) continue; if (n.g.position.distanceToSquared(v.g.position) < 2.2 && Math.abs(v.speed) > 3) { n.down = 5; n.g.rotation.z = Math.PI / 2; n.g.position.y = .3; crime(1); spark(n.g.position); toast('HIT & RUN', '#ff6b6b'); } }
  for (const c of cows) { if (c.g.position.distanceToSquared(v.g.position) < 4 && Math.abs(v.speed) > 3) { crime(2); toast('HOLY COW! 🐄', '#ff6b6b'); const rp = roadSpot(); if (rp) c.g.position.set(rp.x, 0, rp.z); } }
}
function wanderMesh(o, dt, speedScale) {
  o.t += dt; if (Math.random() < .01) o.dir += rand(-1, 1);
  const nx = o.g.position.x + Math.sin(o.dir) * o.speed * dt, nz = o.g.position.z + Math.cos(o.dir) * o.speed * dt;
  if (!blocked(nx, nz) && Math.abs(nx) < HALF - 1 && Math.abs(nz) < HALF - 1) { o.g.position.x = nx; o.g.position.z = nz; o.g.rotation.y = o.dir; }
  else o.dir += 2;
}
function updateNPCs(dt) { for (const n of npcs) { if (n.down > 0) { n.down -= dt; if (n.down <= 0) { n.g.rotation.z = 0; n.g.position.y = 0; } continue; }
  wanderMesh(n, dt); animateChar(n.g, true, dt, n.speed * 2); } }
function updateCows(dt) { for (const c of cows) wanderMesh(c, dt); }
function updateVehicles(dt) {
  for (const v of vehicles) { if (v === player.inVehicle || !v.ai) continue;
    v.aiTimer -= dt; if (v.aiTimer <= 0) { v.aiDir = Math.round(v.aiDir / (Math.PI / 2)) * (Math.PI / 2) + (Math.random() < .3 ? (Math.random() < .5 ? Math.PI / 2 : -Math.PI / 2) : 0); v.aiTimer = rand(2, 5); }
    v.speed = lerp(v.speed, 5, .04); const nx = v.g.position.x + Math.sin(v.aiDir) * v.speed * dt, nz = v.g.position.z + Math.cos(v.aiDir) * v.speed * dt;
    if (!blocked(nx, nz) && Math.abs(nx) < HALF - 1 && Math.abs(nz) < HALF - 1) { v.g.position.x = nx; v.g.position.z = nz; v.yaw = lerp(v.yaw, v.aiDir, .1); v.g.rotation.y = v.yaw; }
    else { v.aiDir += Math.PI / 2; v.aiTimer = rand(1, 3); }
  }
}
function updateCops(dt) {
  for (const c of cops) { if (c.g.userData.bar) c.g.userData.bar.material.color.set((Math.floor(performance.now() / 200) % 2) ? '#ff3b3b' : '#3b6bff');
    const dx = player.pos.x - c.g.position.x, dz = player.pos.z - c.g.position.z, d = Math.hypot(dx, dz);
    const dir = Math.atan2(dx, dz); c.yaw = dir; c.g.rotation.y = dir; c.speed = lerp(c.speed, d > 8 ? 10 : 3, .05);
    const nx = c.g.position.x + Math.sin(dir) * c.speed * dt, nz = c.g.position.z + Math.cos(dir) * c.speed * dt;
    if (!blocked(nx, nz)) { c.g.position.x = nx; c.g.position.z = nz; }
    if (d < 3) { player.health = clamp(player.health - 12 * dt, 0, 100); if (player.health <= 0) wasted(); } }
  const near = cops.some(c => c.g.position.distanceToSquared(player.pos) < 900);
  if (!near && wanted > 0) { wantedTimer -= dt; if (wantedTimer <= 0) { wanted--; wantedTimer = 9; updateStars(); if (wanted === 0) { cops.forEach(c => scene.remove(c.g)); cops.length = 0; toast('LOST THE COPS', '#8ef58e'); } } }
  else if (near) wantedTimer = Math.max(wantedTimer, 6);
  while (cops.length > Math.max(wanted, 0)) { scene.remove(cops.pop().g); }
}
function wasted() { toast('WASTED', '#ff4d4d'); player.cash -= Math.floor(player.cash * .1); wanted = 0; heat = 0; cops.forEach(c => scene.remove(c.g)); cops.length = 0; updateStars();
  player.health = 100; player.fuel = 60; player.pos.copy(findSpawn()); if (player.inVehicle) { player.inVehicle = null; player.g.visible = true; } }
function updateParticles(dt) {
  for (let i = spitParts.length - 1; i >= 0; i--) { const s = spitParts[i]; s.m.position.x += s.vx * dt; s.m.position.z += s.vz * dt; s.m.position.y += s.vy * dt; s.vy -= 9 * dt; s.life -= dt; if (s.life <= 0 || s.m.position.y <= .05) { scene.remove(s.m); spitParts.splice(i, 1); } }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt; s.vy -= 12 * dt; s.life -= dt; if (s.life <= 0) { scene.remove(s.m); sparks.splice(i, 1); } }
}
function updateHUD() {
  $('hpFill').style.width = player.health + '%'; $('fuelFill').style.width = player.fuel + '%';
  $('cash').textContent = '₹' + Math.max(0, player.cash | 0).toLocaleString('en-IN');
  $('kmh').textContent = player.inVehicle ? Math.round(Math.abs(player.speed) * 6) : '—';
  $('gearv').textContent = player.inVehicle ? 'AUTO' : 'ON FOOT';
}

// ---------- loop ----------
function frame() { requestAnimationFrame(frame); if (!renderer) return; const dt = Math.min(.05, clock.getDelta());
  if (previewOn) { updatePreview(dt); if (pRenderer) pRenderer.render(pScene, pCam); }
  else { if (started) update(dt); renderer.render(scene, camera); } }

// ---------- Character creator preview ----------
let pRenderer, pScene, pCam, pChar, previewOn = true, pClock;
function initPreview() {
  pRenderer = new T.WebGLRenderer({ canvas: $('preview'), antialias: true, alpha: true });
  const w = $('preview').clientWidth || 400, h = $('preview').clientHeight || 480;
  pRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); pRenderer.setSize(w, h);
  pScene = new T.Scene();
  pCam = new T.PerspectiveCamera(40, w / h, .1, 100); pCam.position.set(0, 1.6, 4.4); pCam.lookAt(0, 1.4, 0);
  pScene.add(new T.HemisphereLight('#ffffff', '#404040', 1.1));
  const dl = new T.DirectionalLight('#fff', .8); dl.position.set(3, 6, 4); pScene.add(dl);
  const disc = new T.Mesh(new T.CircleGeometry(1.4, 32), new T.MeshLambertMaterial({ color: '#2a2340' })); disc.rotation.x = -Math.PI / 2; pScene.add(disc);
  rebuildPreview();
  // drag to spin
  let dr = false, lx = 0; const cv = $('preview');
  cv.addEventListener('pointerdown', e => { dr = true; lx = e.clientX; }); addEventListener('pointerup', () => dr = false);
  addEventListener('pointermove', e => { if (dr && pChar) { pChar.rotation.y += (e.clientX - lx) * .01; lx = e.clientX; previewSpin = false; } });
}
let previewSpin = true, previewYaw = 0;
function rebuildPreview() { if (pChar) pScene.remove(pChar); pChar = buildCharacter(opts); pChar.scale.set(1.15, 1.15, 1.15); pChar.rotation.y = previewYaw; pScene.add(pChar); }
function updatePreview(dt) { if (previewSpin && pChar) { previewYaw += dt * .6; pChar.rotation.y = previewYaw; } }

// ---------- Creator UI wiring ----------
function swatchRow(container, colors, current, onPick) {
  const el = $(container); el.innerHTML = '';
  colors.forEach(c => { const d = document.createElement('div'); d.className = 'sw' + (c === current() ? ' on' : ''); d.style.background = c;
    d.onclick = () => { onPick(c); [...el.children].forEach(x => x.classList.remove('on')); d.classList.add('on'); rebuildPreview(); }; el.appendChild(d); });
}
function chipRow(container, items, current, onPick) {
  const el = $(container); el.innerHTML = '';
  items.forEach(it => { const d = document.createElement('div'); d.className = 'chip' + (it.v === current() ? ' on' : ''); d.textContent = it.t;
    d.onclick = () => { onPick(it.v); [...el.children].forEach(x => x.classList.remove('on')); d.classList.add('on'); rebuildPreview(); }; el.appendChild(d); });
}
function wireCreator() {
  swatchRow('swSkin', SKINS, () => opts.skin, v => opts.skin = v);
  swatchRow('swTurban', TURBANS, () => opts.turbanColor, v => { opts.turbanColor = v; opts.turban = true; });
  swatchRow('swKurta', KURTAS, () => opts.kurta, v => opts.kurta = v);
  swatchRow('swDhoti', DHOTIS, () => opts.dhoti, v => opts.dhoti = v);
  chipRow('chTurban', [{ t: 'Pagdi On', v: true }, { t: 'No Turban', v: false }], () => opts.turban, v => opts.turban = v);
  chipRow('chBeard', [{ t: 'Clean', v: 'none' }, { t: 'Stubble', v: 'stubble' }, { t: 'Full', v: 'full' }, { t: 'Long', v: 'long' }], () => opts.beard, v => opts.beard = v);
  chipRow('chMoustache', [{ t: 'Yes', v: true }, { t: 'No', v: false }], () => opts.moustache, v => opts.moustache = v);
  $('nameIn').addEventListener('input', e => opts.name = e.target.value || 'Raja');
  $('enterBtn').addEventListener('click', startGame);
}

// ---------- Start ----------
function startGame() {
  ensureAudio();
  previewOn = false;
  $('creator').style.display = 'none'; $('hud').style.display = 'block';
  $('controls').innerHTML = '<b>WASD</b> move · <b>drag</b> look · <b>Shift</b> run<br><b>F</b> drive/exit · <b>J</b> punch · <b>T</b> paan-spit · <b>B</b> bribe · <b>H</b> horn';
  // build player from chosen opts
  player.pos.copy(findSpawn());
  player.g = buildCharacter(opts); player.g.position.copy(player.pos); scene.add(player.g);
  spawnNPCs(26); spawnCows(6); spawnVehicles(10);
  started = true;
  toast('नमस्ते, ' + opts.name + '!', '#ff9933');
}

// ---------- Boot ----------
function boot() {
  initThree(); buildCity(); initPreview(); wireCreator();
  $('loading').classList.add('hide');
  window.__dbg = () => ({ cam: camera.position.toArray().map(v => +v.toFixed(2)),
    rotX: +camera.rotation.x.toFixed(3), player: player.pos.toArray().map(v => +v.toFixed(2)),
    pitch: cam.pitch, yaw: cam.yaw, inV: !!player.inVehicle });
  frame();
}
if (window.THREE) boot(); else { $('loading').textContent = 'Failed to load 3D engine.'; }

})();
