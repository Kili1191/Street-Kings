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
function mat(color, rough) { return new T.MeshStandardMaterial({ color: new T.Color(color), roughness: rough == null ? .88 : rough, metalness: .02 }); }
function limb(w, h, color) { // rounded capsule, pivot at TOP
  const r = w / 2; const g = new T.CapsuleGeometry(r, Math.max(0.02, h - 2 * r), 4, 10); g.translate(0, -h / 2, 0);
  return new T.Mesh(g, mat(color));
}
function shadeHex(hex, amt) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(r + amt, 0, 255); g = clamp(g + amt, 0, 255); b = clamp(b + amt, 0, 255); return `rgb(${r | 0},${g | 0},${b | 0})`; }
// paint a full head/face onto an equirectangular texture (face centred at u=0.5)
function makeFaceTexture(o) {
  const W = 640, H = 320, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const cx = W * .5, browY = H * .33, eyeY = H * .40, noseY = H * .50, mouthY = H * .585, chinY = H * .66;
  const eyeDX = W * .07, earDX = W * .25, skin = o.skin;
  // base skin + vertical shading
  g.fillStyle = skin; g.fillRect(0, 0, W, H);
  const vg = g.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, shadeHex(skin, 18)); vg.addColorStop(.4, skin); vg.addColorStop(1, shadeHex(skin, -30));
  g.globalAlpha = .5; g.fillStyle = vg; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  // forehead + cheek highlights, cheek warmth
  const soft = (x, y, r, col, a) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = 1; };
  soft(cx, browY - 22, 70, shadeHex(skin, 30), .5);
  soft(cx - 78, eyeY + 34, 46, '#c9605a', .18); soft(cx + 78, eyeY + 34, 46, '#c9605a', .18);
  soft(cx, noseY + 8, 14, shadeHex(skin, 24), .5);
  // skin speckle
  g.globalAlpha = .05; for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(rand(cx - 130, cx + 130), rand(browY - 30, chinY + 20), 1.5, 1.5); } g.globalAlpha = 1;
  // nose: bridge highlight + side shadow + nostrils + tip
  g.globalAlpha = .28; g.strokeStyle = shadeHex(skin, -34); g.lineWidth = 7; g.beginPath(); g.moveTo(cx - 9, browY + 6); g.quadraticCurveTo(cx - 13, noseY - 8, cx - 15, noseY); g.stroke();
  g.beginPath(); g.moveTo(cx + 9, browY + 6); g.quadraticCurveTo(cx + 13, noseY - 8, cx + 15, noseY); g.stroke(); g.globalAlpha = 1;
  g.globalAlpha = .5; g.strokeStyle = shadeHex(skin, 26); g.lineWidth = 4; g.beginPath(); g.moveTo(cx, browY + 4); g.lineTo(cx, noseY - 6); g.stroke(); g.globalAlpha = 1;
  soft(cx, noseY, 15, shadeHex(skin, 16), .6);
  g.fillStyle = shadeHex(skin, -55); g.beginPath(); g.ellipse(cx - 9, noseY + 4, 4, 3, 0, 0, TAU); g.ellipse(cx + 9, noseY + 4, 4, 3, 0, 0, TAU); g.fill();
  // eyes
  const drawEye = sx => {
    const ex = cx + sx * eyeDX;
    g.fillStyle = shadeHex(skin, -20); g.globalAlpha = .3; g.beginPath(); g.ellipse(ex, eyeY, 26, 16, 0, 0, TAU); g.fill(); g.globalAlpha = 1; // socket
    g.save(); g.beginPath(); g.ellipse(ex, eyeY, 19, 10, 0, 0, TAU); g.clip(); // eye opening (clips lids)
    g.fillStyle = '#e9e3d6'; g.fillRect(ex - 20, eyeY - 12, 40, 24); // sclera
    const ig = g.createRadialGradient(ex, eyeY - 1, 1, ex, eyeY, 10); ig.addColorStop(0, '#6b4a2a'); ig.addColorStop(.65, '#3d2a17'); ig.addColorStop(1, '#1c1109');
    g.fillStyle = ig; g.beginPath(); g.arc(ex, eyeY, 9, 0, TAU); g.fill(); // iris
    g.fillStyle = '#000'; g.beginPath(); g.arc(ex, eyeY, 4, 0, TAU); g.fill(); // pupil
    g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(ex - 3.5, eyeY - 3.5, 2.2, 0, TAU); g.fill(); // glint
    g.restore();
    g.strokeStyle = '#171210'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(ex - 19, eyeY - 3); g.quadraticCurveTo(ex, eyeY - 12, ex + 19, eyeY - 4); g.stroke(); // upper lid line
    g.strokeStyle = shadeHex(skin, -16); g.lineWidth = 1.6; g.globalAlpha = .55; g.beginPath(); g.moveTo(ex - 17, eyeY + 9); g.quadraticCurveTo(ex, eyeY + 12, ex + 17, eyeY + 9); g.stroke(); g.globalAlpha = 1; // lower lid
  };
  drawEye(-1); drawEye(1);
  // eyebrows
  g.fillStyle = '#1c1712';
  const brow = sx => { const bx = cx + sx * eyeDX; g.beginPath(); g.moveTo(bx - 26, browY + 6); g.quadraticCurveTo(bx - 2, browY - 8, bx + 26, browY + 2); g.quadraticCurveTo(bx, browY + 4, bx - 26, browY + 12); g.closePath(); g.fill(); };
  brow(-1); brow(1);
  // lips
  g.fillStyle = '#a85c52'; g.beginPath(); g.moveTo(cx - 30, mouthY); g.quadraticCurveTo(cx, mouthY - 8, cx + 30, mouthY); g.quadraticCurveTo(cx, mouthY - 2, cx - 30, mouthY); g.fill();
  g.fillStyle = '#b96a5e'; g.beginPath(); g.moveTo(cx - 28, mouthY + 1); g.quadraticCurveTo(cx, mouthY + 14, cx + 28, mouthY + 1); g.quadraticCurveTo(cx, mouthY + 6, cx - 28, mouthY + 1); g.fill();
  g.strokeStyle = '#5c2f27'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 28, mouthY); g.quadraticCurveTo(cx, mouthY + 4, cx + 28, mouthY); g.stroke();
  // ears
  for (const sx of [-1, 1]) { const exx = cx + sx * earDX; g.fillStyle = skin; g.beginPath(); g.ellipse(exx, eyeY + 10, 16, 26, 0, 0, TAU); g.fill(); g.fillStyle = shadeHex(skin, -34); g.globalAlpha = .5; g.beginPath(); g.ellipse(exx, eyeY + 10, 7, 14, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
  // beard / moustache painted for realism
  if (o.beard !== 'none' || o.moustache) {
    const bc = '#171310';
    const region = (alpha, extendChin) => {
      g.globalAlpha = alpha; g.fillStyle = bc; g.beginPath();
      g.moveTo(cx - 62, eyeY + 30); g.quadraticCurveTo(cx - 74, mouthY, cx - 46, chinY + extendChin);
      g.quadraticCurveTo(cx, chinY + 14 + extendChin, cx + 46, chinY + extendChin);
      g.quadraticCurveTo(cx + 74, mouthY, cx + 62, eyeY + 30);
      g.quadraticCurveTo(cx, eyeY + 46, cx - 62, eyeY + 30); g.closePath(); g.fill(); g.globalAlpha = 1;
    };
    if (o.beard === 'stubble') { g.globalAlpha = .04; for (let i = 0; i < 2600; i++) g.fillRect(rand(cx - 66, cx + 66), rand(eyeY + 34, chinY + 6), 1.6, 1.6); g.globalAlpha = 1; g.fillStyle = bc; }
    else if (o.beard === 'full') region(.9, 6);
    else if (o.beard === 'long') region(.92, 34);
    // cut the mouth back out so lips show through a full beard
    if (o.beard === 'full' || o.beard === 'long') { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(cx, mouthY + 2, 26, 12, 0, 0, TAU); g.fill(); g.restore();
      g.fillStyle = '#a85c52'; g.beginPath(); g.moveTo(cx - 26, mouthY); g.quadraticCurveTo(cx, mouthY + 12, cx + 26, mouthY); g.quadraticCurveTo(cx, mouthY + 4, cx - 26, mouthY); g.fill(); }
    if (o.moustache) { g.fillStyle = bc; g.beginPath(); g.moveTo(cx - 30, mouthY - 8); g.quadraticCurveTo(cx, mouthY - 2, cx + 30, mouthY - 8); g.quadraticCurveTo(cx + 16, mouthY + 4, cx, mouthY - 4); g.quadraticCurveTo(cx - 16, mouthY + 4, cx - 30, mouthY - 8); g.fill(); }
  }
  const tex = new T.CanvasTexture(c); if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; return tex;
}
let FACE_YAW = -Math.PI / 2; // aligns the painted face (texture u=0.5 → +X) to the character's forward (+Z)
function buildCharacter(o) {
  const grp = new T.Group();
  const skinM = mat(o.skin, .62), kurtaM = mat(o.kurta, .8), dhotiM = mat(o.dhoti, .82);
  const darkM = mat('#20232a', .6), shoeM = mat('#3a2a1a', .5), beardM = mat('#161310', .85);
  const hipY = 1.5, waistY = 1.55;

  // pelvis
  const pelvis = new T.Mesh(new T.CylinderGeometry(0.24, 0.26, 0.3, 12), dhotiM); pelvis.position.y = hipY; pelvis.scale.z = 0.72; grp.add(pelvis);

  // legs (churidar + jutti) — pivot groups at hips
  function makeLeg(side) {
    const g = new T.Group(); g.position.set(0.13 * side, hipY - 0.02, 0);
    const thigh = new T.Mesh(new T.CylinderGeometry(0.15, 0.11, 0.72, 10), dhotiM); thigh.position.y = -0.36; g.add(thigh);
    const knee = new T.Mesh(new T.SphereGeometry(0.115, 10, 8), dhotiM); knee.position.y = -0.72; g.add(knee);
    const calf = new T.Mesh(new T.CylinderGeometry(0.1, 0.075, 0.68, 10), dhotiM); calf.position.y = -1.08; g.add(calf);
    const shoe = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), shoeM); shoe.scale.set(1, 0.55, 1.7); shoe.position.set(0, -1.44, 0.08); g.add(shoe);
    const toe = new T.Mesh(new T.ConeGeometry(0.07, 0.16, 8), shoeM); toe.rotation.x = Math.PI * 0.62; toe.position.set(0, -1.4, 0.3); g.add(toe);
    grp.add(g); return g;
  }
  const rL = makeLeg(1), lL = makeLeg(-1);

  // torso (kurta) — tapers to waist
  const torso = new T.Mesh(new T.CylinderGeometry(0.34, 0.24, 0.85, 16), kurtaM); torso.position.y = waistY + 0.42; torso.scale.z = 0.62; grp.add(torso);
  const chest = new T.Mesh(new T.SphereGeometry(0.34, 16, 12), kurtaM); chest.position.y = waistY + 0.82; chest.scale.set(1.18, 0.82, 0.66); grp.add(chest);
  // kurta hem draping over the thighs
  const hem = new T.Mesh(new T.CylinderGeometry(0.3, 0.48, 0.72, 18, 1, true), kurtaM); hem.material.side = T.DoubleSide; hem.position.y = waistY - 0.12; hem.scale.z = 0.82; grp.add(hem);
  const placket = new T.Mesh(new T.BoxGeometry(0.035, 0.82, 0.03), darkM); placket.position.set(0, waistY + 0.45, 0.2); grp.add(placket);

  // arms — upper + forearm + hand, pivot groups at shoulders
  function makeArm(side) {
    const g = new T.Group(); g.position.set(0.34 * side, waistY + 0.82, 0); g.rotation.z = -0.14 * side;
    const up = new T.Mesh(new T.CylinderGeometry(0.1, 0.082, 0.55, 10), kurtaM); up.position.y = -0.28; g.add(up);
    const elbow = new T.Mesh(new T.SphereGeometry(0.085, 10, 8), kurtaM); elbow.position.y = -0.55; g.add(elbow);
    const fore = new T.Mesh(new T.CylinderGeometry(0.078, 0.066, 0.5, 10), skinM); fore.position.y = -0.82; g.add(fore);
    const hand = new T.Mesh(new T.BoxGeometry(0.12, 0.17, 0.09), skinM); hand.position.y = -1.13; g.add(hand);
    const thumb = new T.Mesh(new T.BoxGeometry(0.05, 0.09, 0.05), skinM); thumb.position.set(0.07 * side, -1.08, 0.02); g.add(thumb);
    grp.add(g); return g;
  }
  const rA = makeArm(1), lA = makeArm(-1);

  // neck + head (painted face texture for a recognisable face)
  const neck = new T.Mesh(new T.CylinderGeometry(0.09, 0.1, 0.18, 10), skinM); neck.position.y = waistY + 1.04; grp.add(neck);
  const head = new T.Group(); head.position.y = waistY + 1.3; grp.add(head);
  const faceTex = makeFaceTexture(o);
  const skull = new T.Mesh(new T.SphereGeometry(0.25, 32, 28), new T.MeshStandardMaterial({ map: faceTex, roughness: .62, metalness: 0 }));
  skull.scale.set(0.94, 1.08, 0.98); skull.rotation.y = FACE_YAW; head.add(skull);
  // a little chin/jaw volume under the textured skull
  const nose = new T.Mesh(new T.ConeGeometry(0.045, 0.11, 10), skinM); nose.rotation.x = Math.PI * 0.54; nose.position.set(0, -0.02, 0.25); head.add(nose);
  // turban / hair
  if (o.turban) {
    const tM = mat(o.turbanColor, .6);
    // crown cap (upper hemisphere only) so the face stays visible
    const dome = new T.Mesh(new T.SphereGeometry(0.29, 22, 12, 0, TAU, 0, Math.PI / 2), tM); dome.scale.set(1.0, .95, 1.0); dome.position.set(0, 0.13, 0); head.add(dome);
    // stacked wrap rings, lowest sits at the hairline just above the brows
    const wrap = new T.Mesh(new T.TorusGeometry(0.25, 0.088, 12, 24), tM); wrap.rotation.x = Math.PI / 2; wrap.position.set(0, 0.2, 0); head.add(wrap);
    const wrap2 = new T.Mesh(new T.TorusGeometry(0.265, 0.078, 12, 24), tM); wrap2.rotation.x = Math.PI / 2; wrap2.position.set(0, 0.145, 0.012); head.add(wrap2);
    const jewel = new T.Mesh(new T.SphereGeometry(0.05, 12, 12), mat('#ffd700', .25)); jewel.position.set(0, 0.23, 0.24); head.add(jewel);
    const plume = new T.Mesh(new T.ConeGeometry(0.05, 0.3, 10), mat('#f5f5f5', .7)); plume.position.set(0, 0.52, 0.1); plume.rotation.x = -0.3; head.add(plume);
  } else {
    const hair = new T.Mesh(new T.SphereGeometry(0.265, 18, 12, 0, TAU, 0, Math.PI / 2.1), mat('#0d0b0a', .85)); hair.scale.set(1, .8, 1); hair.position.set(0, 0.12, 0); head.add(hair);
  }

  grp.traverse(o2 => { if (o2.isMesh) o2.castShadow = true; });
  grp.userData = { lL, rL, lA, rA, head, phase: 0, punch: 0 };
  grp.scale.setScalar(0.53); // ~1.85 m tall
  return grp;
}
function animateChar(g, moving, dt, speed) {
  const u = g.userData;
  // combat combo: jab (0), cross (1), kick (2) — with weight shift & guard
  if (u.attack && u.attack.t > 0) {
    const p = 1 - u.attack.t, ext = Math.sin(clamp(p * 1.25, 0, 1) * Math.PI), k = u.attack.kind;
    u.lL.rotation.x = lerp(u.lL.rotation.x, 0, .3); u.rL.rotation.x = lerp(u.rL.rotation.x, 0, .3);
    if (k === 0) { u.lA.rotation.x = -1.7 * ext; u.lA.rotation.y = -.25 * ext; u.rA.rotation.x = .35 * ext; u.rA.rotation.y = 0; if (u.head) u.head.rotation.y = .22 * ext; }
    else if (k === 1) { u.rA.rotation.x = -1.85 * ext; u.rA.rotation.y = .55 * ext; u.lA.rotation.x = .4 * ext; u.lA.rotation.y = 0; if (u.head) u.head.rotation.y = -.28 * ext; }
    else { u.rL.rotation.x = -1.5 * ext; u.lA.rotation.x = .6 * ext; u.rA.rotation.x = .6 * ext; u.lA.rotation.y = u.rA.rotation.y = 0; }
    u.attack.t -= dt * 3.2; return;
  }
  u.lA.rotation.y = lerp(u.lA.rotation.y, 0, .3); u.rA.rotation.y = lerp(u.rA.rotation.y, 0, .3);
  if (u.head) u.head.rotation.y = lerp(u.head.rotation.y, 0, .3);
  if (moving) { u.phase += dt * speed * 2.2; const s = Math.sin(u.phase) * 0.7;
    u.lL.rotation.x = s; u.rL.rotation.x = -s; u.lA.rotation.x = -s * 0.7; u.rA.rotation.x = s * 0.7; }
  else { u.lL.rotation.x = lerp(u.lL.rotation.x, 0, .2); u.rL.rotation.x = lerp(u.rL.rotation.x, 0, .2);
    u.lA.rotation.x = lerp(u.lA.rotation.x, 0, .2); u.rA.rotation.x = lerp(u.rA.rotation.x, 0, .2); }
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
const WORLD = 260, HALF = WORLD / 2, CELL = WORLD / 3, STEP = 20, ROADW = 7, SIDEW = 2.4;
function districtAt(x, z) {
  const mx = clamp(Math.floor((x + HALF) / CELL), 0, 2), mz = clamp(Math.floor((z + HALF) / CELL), 0, 2);
  return mz * 3 + mx;
}
const onRoad = (x, z) => {
  const fx = ((x % STEP) + STEP) % STEP, fz = ((z % STEP) + STEP) % STEP;
  return fx < ROADW || fz < ROADW;
};
// sidewalk band = just outside the road, before the buildings
const onSidewalk = (x, z) => {
  const fx = ((x % STEP) + STEP) % STEP, fz = ((z % STEP) + STEP) % STEP;
  const near = v => v >= ROADW && v < ROADW + SIDEW;
  return !onRoad(x, z) && (near(fx) || near(fz) || fx >= STEP - SIDEW || fz >= STEP - SIDEW);
};

// ---------- Renderer / scene ----------
let renderer, scene, camera, clock, sun;
const buildings = []; // {x,z,hw,hd}
let ground, winTex;
function makeSky() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#3d6ea5'); grd.addColorStop(.5, '#8fb8dd'); grd.addColorStop(.82, '#dcd0bf'); grd.addColorStop(1, '#e8cf9e');
  g.fillStyle = grd; g.fillRect(0, 0, 16, 256);
  const tex = new T.CanvasTexture(c); if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; return tex;
}
function initThree() {
  renderer = new T.WebGLRenderer({ canvas: $('game'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer && T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
  else if ('sRGBEncoding' in T) renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  scene = new T.Scene();
  scene.background = makeSky();
  scene.fog = new T.Fog('#d7cdbb', 70, 165);
  camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
  const hemi = new T.HemisphereLight('#bcd6f2', '#6b5a3a', 0.5); scene.add(hemi);
  const amb = new T.AmbientLight('#ffffff', 0.1); scene.add(amb);
  sun = new T.DirectionalLight('#fff1cf', 1.55); sun.position.set(40, 80, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
  const sc = sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 260;
  scene.add(sun); scene.add(sun.target);
  clock = new T.Clock();
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
}

// ground texture: district colours + sidewalks + road grid + lane dashes
function makeGroundTexture() {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const u = w => w / WORLD * S, px = v => (v + HALF) / WORLD * S;
  for (let i = 0; i < 9; i++) { const mx = i % 3, mz = (i / 3) | 0;
    g.fillStyle = DISTRICTS[i].ground; g.fillRect(mx * S / 3, mz * S / 3, S / 3 + 1, S / 3 + 1); }
  g.fillStyle = 'rgba(60,50,35,.06)'; for (let i = 0; i < 6000; i++) g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  // sidewalks (light paving) — a band straddling each road
  g.fillStyle = '#9a978f';
  for (let v = -HALF; v <= HALF; v += STEP) { g.fillRect(px(v - SIDEW), 0, u(ROADW + 2 * SIDEW), S); g.fillRect(0, px(v - SIDEW), S, u(ROADW + 2 * SIDEW)); }
  // paving joints on sidewalks
  g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 1; g.setLineDash([]);
  for (let v = -HALF; v <= HALF; v += 3) { g.beginPath(); g.moveTo(px(v), 0); g.lineTo(px(v), S); g.stroke(); g.beginPath(); g.moveTo(0, px(v)); g.lineTo(S, px(v)); g.stroke(); }
  // roads (dark asphalt) on top, leaving sidewalk visible
  g.fillStyle = '#3b3b41';
  for (let v = -HALF; v <= HALF; v += STEP) { g.fillRect(px(v), 0, u(ROADW), S); g.fillRect(0, px(v), S, u(ROADW)); }
  // curb line
  g.strokeStyle = 'rgba(20,20,24,.5)'; g.lineWidth = 2;
  for (let v = -HALF; v <= HALF; v += STEP) { for (const e of [px(v), px(v) + u(ROADW)]) { g.beginPath(); g.moveTo(e, 0); g.lineTo(e, S); g.stroke(); g.beginPath(); g.moveTo(0, e); g.lineTo(S, e); g.stroke(); } }
  // lane dashes
  g.strokeStyle = 'rgba(240,210,120,.5)'; g.lineWidth = 2; g.setLineDash([12, 14]);
  for (let v = -HALF; v <= HALF; v += STEP) { const p = px(v) + u(ROADW) / 2;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke(); }
  g.setLineDash([]);
  const tex = new T.CanvasTexture(c); tex.anisotropy = 8; return tex;
}
function makeWindowTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#d2ccbe'; g.fillRect(0, 0, S, S);
  const cols = 4, rows = 7, padx = 12, pady = 10, ww = (S - padx * (cols + 1)) / cols, wh = (S - pady * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
    const x = padx + cc * (ww + padx), y = pady + r * (wh + pady);
    g.fillStyle = Math.random() < .22 ? '#ffd98a' : '#39454f'; g.fillRect(x, y, ww, wh);
    g.strokeStyle = '#20242a'; g.lineWidth = 2; g.strokeRect(x, y, ww, wh);
    g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + wh); g.moveTo(x, y + wh / 2); g.lineTo(x + ww, y + wh / 2); g.stroke();
    // AC box under some windows
    if (Math.random() < .25) { g.fillStyle = '#8a8680'; g.fillRect(x + ww * .3, y + wh, ww * .4, pady * .5); }
  }
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; return tex;
}
function buildCity() {
  const gt = makeGroundTexture(); if ('sRGBEncoding' in T) gt.encoding = T.sRGBEncoding;
  ground = new T.Mesh(new T.PlaneGeometry(WORLD, WORLD), new T.MeshStandardMaterial({ map: gt, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  winTex = makeWindowTexture();
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
      const h = rand(5, 17), w = cw * rand(.72, .92), d = cd * rand(.72, .92);
      const bm = new T.MeshStandardMaterial({ color: new T.Color(pick(D.pal)), map: winTex, roughness: .92, metalness: .02 });
      const m = new T.Mesh(boxGeo, bm); m.scale.set(w, h, d); m.position.set(px2, h / 2, pz2); m.castShadow = true; m.receiveShadow = true; scene.add(m);
      // parapet roof slab
      const roof = new T.Mesh(boxGeo, mat('#2b2b32')); roof.scale.set(w + .25, .5, d + .25); roof.position.set(px2, h + .1, pz2); roof.castShadow = true; scene.add(roof);
      // water tank + rooftop clutter
      if (Math.random() < .55) { const tk = new T.Mesh(new T.CylinderGeometry(.35, .35, .7, 10), mat('#3a3a3a')); tk.position.set(px2 + w * .2, h + .55, pz2 + d * .2); tk.castShadow = true; scene.add(tk); }
      if (Math.random() < .4) { const ac = new T.Mesh(boxGeo, mat('#c9c4b8')); ac.scale.set(.5, .35, .5); ac.position.set(px2 - w * .25, h + .35, pz2 - d * .2); ac.castShadow = true; scene.add(ac); }
      // ground-floor awning fixed to the wall base (no floating)
      if (Math.random() < .5) { const aw = new T.Mesh(boxGeo, mat(pick(['#c0392b', '#2980b9', '#e0b93c', '#16a085']))); aw.scale.set(w * .9, .16, .6); aw.position.set(px2, 1.7, pz2 + d / 2 + .25); aw.castShadow = true; scene.add(aw); }
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
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
}
// tree: trunk + rounded canopy (or palm for coastal districts)
function buildTree(palm) {
  const g = new T.Group();
  if (palm) {
    const tr = new T.Mesh(new T.CylinderGeometry(.18, .28, 6, 8), mat('#8a6b3a')); tr.position.y = 3; tr.castShadow = true; g.add(tr);
    for (let k = 0; k < 6; k++) { const fr = new T.Mesh(new T.ConeGeometry(.5, 3, 6), mat('#2e8b57', .85));
      fr.position.set(Math.cos(k) * 1, 6, Math.sin(k) * 1); fr.rotation.z = Math.cos(k) * .9; fr.rotation.x = Math.sin(k) * .9; fr.castShadow = true; g.add(fr); }
  } else {
    const tr = new T.Mesh(new T.CylinderGeometry(.22, .32, 2.4, 8), mat('#6b4a2a')); tr.position.y = 1.2; tr.castShadow = true; g.add(tr);
    for (const [dx, dy, dz, r] of [[0, 3, 0, 1.5], [-.9, 2.6, .4, 1.1], [.8, 2.7, -.4, 1.05], [.2, 3.6, .5, .95]]) {
      const f = new T.Mesh(new T.SphereGeometry(r, 12, 10), mat(pick(['#3f7d3f', '#4f9e5b', '#357a45']), .9)); f.position.set(dx, dy, dz); f.castShadow = true; g.add(f); }
  }
  return g;
}
// props live on the SIDEWALK (not the road) and are solid so vehicles can't pass through
function scatterProps() {
  const boxGeo = new T.BoxGeometry(1, 1, 1), area = (WORLD / 180) ** 2;
  // food stalls
  for (let i = 0; i < 55 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const cart = new T.Mesh(boxGeo, mat('#6b4a2a')); cart.scale.set(1.8, 1, 1.1); cart.position.set(p.x, .5, p.z); cart.castShadow = true; scene.add(cart);
    const canopy = new T.Mesh(boxGeo, mat(pick(['#e0b93c', '#c0563a', '#4f9e6b', '#2980b9']))); canopy.scale.set(2.2, .28, 1.4); canopy.position.set(p.x, 1.6, p.z); canopy.castShadow = true; scene.add(canopy);
    buildings.push({ x: p.x, z: p.z, hw: 1.1, hd: .8 }); }
  // garbage piles (decorative, no collision)
  for (let i = 0; i < 90 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const gb = new T.Mesh(new T.SphereGeometry(rand(.3, .6), 7, 6), mat(pick(['#7a6f4a', '#8a5a3a', '#556b4a']))); gb.position.set(p.x, .2, p.z); gb.scale.y = .5; gb.castShadow = true; scene.add(gb); }
  // trees (solid trunks) — palms near coastal/southern districts
  for (let i = 0; i < 120 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const di = districtAt(p.x, p.z); const palm = [5, 7, 8].includes(di) ? Math.random() < .7 : Math.random() < .2;
    const tr = buildTree(palm); tr.position.set(p.x, 0, p.z); tr.scale.setScalar(rand(.85, 1.15)); scene.add(tr);
    buildings.push({ x: p.x, z: p.z, hw: .7, hd: .7 }); }
  // street lamps (solid poles)
  for (let i = 0; i < 60 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const pole = new T.Mesh(new T.CylinderGeometry(.08, .1, 5, 6), mat('#444')); pole.position.set(p.x, 2.5, p.z); pole.castShadow = true; scene.add(pole);
    const arm = new T.Mesh(boxGeo, mat('#444')); arm.scale.set(.9, .1, .1); arm.position.set(p.x + .4, 4.8, p.z); scene.add(arm);
    const lamp = new T.Mesh(new T.SphereGeometry(.2, 10, 8), mat('#ffe9a8', .3)); lamp.position.set(p.x + .8, 4.7, p.z); scene.add(lamp);
    buildings.push({ x: p.x, z: p.z, hw: .35, hd: .35 }); }
}
function roadSpot() { for (let i = 0; i < 24; i++) { const x = rand(-HALF, HALF), z = rand(-HALF, HALF); if (onRoad(x, z)) return { x, z }; } return null; }
function sidewalkSpot() { for (let i = 0; i < 60; i++) { const x = rand(-HALF + 4, HALF - 4), z = rand(-HALF + 4, HALF - 4); if (onSidewalk(x, z) && !blocked(x, z)) return { x, z }; } return null; }
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
    const p = sidewalkSpot() || roadSpot(); if (!p) continue;
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
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
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
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
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
  const bind = (id, fn, up) => { const el = $(id); if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); });
    if (up) el.addEventListener('touchend', e => { e.preventDefault(); up(); }); };
  bind('tAct', tryEnterExit); bind('tPunch', punch); bind('tSpit', spit);
})();
// analog thumbstick (touch + mouse)
window.joy = { x: 0, z: 0, active: false };
(function joystick() {
  const base = $('joystick'), knob = $('joyknob'); if (!base) return;
  const R = 46;
  const apply = (px, py) => { const r = base.getBoundingClientRect(), cxp = r.left + r.width / 2, cyp = r.top + r.height / 2;
    let dx = px - cxp, dy = py - cyp; const len = Math.hypot(dx, dy) || 1; if (len > R) { dx = dx / len * R; dy = dy / len * R; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; window.joy.x = dx / R; window.joy.z = dy / R; window.joy.active = true; };
  const stop = () => { window.joy.active = false; window.joy.x = window.joy.z = 0; knob.style.transform = 'translate(0,0)'; };
  base.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; base._id = t.identifier; apply(t.clientX, t.clientY); }, { passive: false });
  base.addEventListener('touchmove', e => { e.preventDefault(); const t = [...e.touches].find(x => x.identifier === base._id) || e.touches[0]; if (t) apply(t.clientX, t.clientY); }, { passive: false });
  base.addEventListener('touchend', e => { e.preventDefault(); stop(); });
  base.addEventListener('touchcancel', e => { e.preventDefault(); stop(); });
  base.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; apply(e.clientX, e.clientY);
    const mv = ev => apply(ev.clientX, ev.clientY), up = () => { stop(); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); });
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
  if (!started || player.inVehicle) return;
  if (!player.combo) player.combo = { ix: -1, t: 0 };
  player.combo.ix = player.combo.t > 0 ? (player.combo.ix + 1) % 3 : 0; player.combo.t = 0.65;
  const kind = player.combo.ix;
  player.g.userData.attack = { kind, t: 1 };
  blip(kind === 2 ? 150 : 190, .09, 'square', .22);
  const reach = kind === 2 ? 2.2 : 1.8;
  const fx = player.pos.x + Math.sin(player.yaw) * reach, fz = player.pos.z + Math.cos(player.yaw) * reach;
  const label = kind === 0 ? 'JAB!' : kind === 1 ? 'CROSS! 👊' : 'KICK! 🦵';
  for (const n of npcs) { if (n.down > 0) continue;
    if (n.g.position.distanceToSquared(new T.Vector3(fx, 0, fz)) < reach * reach * .8) {
      n.down = kind === 2 ? 5 : 4; n.g.rotation.z = Math.PI / 2 - .1; n.g.position.y = 0.4;
      // knock-back
      n.g.position.x += Math.sin(player.yaw) * (kind === 2 ? 1.6 : .8); n.g.position.z += Math.cos(player.yaw) * (kind === 2 ? 1.6 : .8);
      crime(1); toast(label, '#ff9f43'); spark(n.g.position); break; }
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
  // input direction (camera-relative) — keyboard or analog thumbstick
  let f = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);
  let s = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
  if (window.joy && window.joy.active) { f = -window.joy.z; s = window.joy.x; }
  const turnKey = (keys['arrowright'] ? 1 : 0) - (keys['arrowleft'] ? 1 : 0);
  if (turnKey) cam.yaw -= turnKey * dt * 1.8;

  if (player.inVehicle) updateDrive(dt, f, s);
  else updateFoot(dt, f, s);

  updateNPCs(dt); updateCows(dt); updateVehicles(dt); updateCops(dt);
  updateParticles(dt);

  // district banner
  const di = districtAt(player.pos.x, player.pos.z);
  if (di !== curDistrict) { curDistrict = di; $('distName').textContent = DISTRICTS[di].name; showBanner(DISTRICTS[di].greet, DISTRICTS[di].fact); }

  // sun follows player so shadows stay crisp
  if (sun) { sun.position.set(player.pos.x + 40, 85, player.pos.z + 22); sun.target.position.copy(player.pos); sun.target.updateMatrixWorld(); }
  // camera follow
  const target = player.inVehicle ? player.inVehicle.g.position : player.pos;
  const cd = player.inVehicle ? 10 : cam.dist;
  const cx = target.x - Math.sin(cam.yaw) * Math.cos(cam.pitch) * cd;
  const cz = target.z - Math.cos(cam.yaw) * Math.cos(cam.pitch) * cd;
  const cy = target.y + Math.sin(cam.pitch) * cd + 1.0;
  camera.position.lerp(new T.Vector3(cx, cy, cz), .18);
  camera.lookAt(target.x, target.y + 1.7, target.z);

  // regen
  if (player.combo) player.combo.t = Math.max(0, player.combo.t - dt);
  if (wanted === 0 && player.health < 100) player.health = clamp(player.health + dt * 2, 0, 100);
  if (!player.inVehicle) player.fuel = clamp(player.fuel + dt * 3, 0, 100);
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; }
  if (!player.inVehicle) { for (const v of vehicles) if (v.g.position.distanceToSquared(player.pos) < 25) { hint('Press F to drive · J punch · T paan-spit'); break; } }

  updateHUD();
}
function updateFoot(dt, f, s) {
  player.g.visible = true;
  const mag = Math.min(1, Math.hypot(f, s));
  let dx = 0, dz = 0;
  if (mag > .12) { const ang = cam.yaw; dx = Math.sin(ang) * f + Math.cos(ang) * s; dz = Math.cos(ang) * f - Math.sin(ang) * s;
    const l = Math.hypot(dx, dz); dx /= l; dz /= l; }
  const sprint = keys['shift'] ? 1.6 : 1, spd = 4.2 * sprint * mag;
  player.moving = mag > .12; player.speed = player.moving ? spd : 0;
  if (player.moving) { player.yaw = Math.atan2(dx, dz);
    const nx = player.pos.x + dx * spd * dt, nz = player.pos.z + dz * spd * dt;
    if (!blocked(nx, player.pos.z)) player.pos.x = nx; if (!blocked(player.pos.x, nz)) player.pos.z = nz; }
  player.g.position.copy(player.pos); player.g.rotation.y = player.yaw;
  animateChar(player.g, player.moving, dt, 4.2 * sprint);
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
    // traffic stays ON the road (not on sidewalks) and off obstacles
    if (onRoad(nx, nz) && !blocked(nx, nz) && Math.abs(nx) < HALF - 1 && Math.abs(nz) < HALF - 1) { v.g.position.x = nx; v.g.position.z = nz; v.yaw = lerp(v.yaw, v.aiDir, .1); v.g.rotation.y = v.yaw; }
    else { v.aiDir += (Math.random() < .5 ? 1 : -1) * Math.PI / 2; v.aiTimer = rand(1, 2.5); }
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
  if ('outputColorSpace' in pRenderer && T.SRGBColorSpace) pRenderer.outputColorSpace = T.SRGBColorSpace;
  else if ('sRGBEncoding' in T) pRenderer.outputEncoding = T.sRGBEncoding;
  pRenderer.toneMapping = T.ACESFilmicToneMapping; pRenderer.toneMappingExposure = 1.0;
  pRenderer.shadowMap.enabled = true; pRenderer.shadowMap.type = T.PCFSoftShadowMap;
  pScene = new T.Scene();
  pCam = new T.PerspectiveCamera(40, w / h, .1, 100); pCam.position.set(0, 1.05, 3.9); pCam.lookAt(0, 1.0, 0);
  pScene.add(new T.HemisphereLight('#cfe0ff', '#33302a', .38));
  const dl = new T.DirectionalLight('#fff4e0', 1.15); dl.position.set(3, 6, 4); dl.castShadow = true; dl.shadow.mapSize.set(1024, 1024); pScene.add(dl);
  pScene.add(new T.DirectionalLight('#a0b0d0', .2).translateX(-4).translateZ(-2));
  const disc = new T.Mesh(new T.CircleGeometry(1.4, 40), new T.MeshStandardMaterial({ color: '#241f36', roughness: .9 })); disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true; pScene.add(disc);
  rebuildPreview();
  // drag to spin
  let dr = false, lx = 0; const cv = $('preview');
  cv.addEventListener('pointerdown', e => { dr = true; lx = e.clientX; }); addEventListener('pointerup', () => dr = false);
  addEventListener('pointermove', e => { if (dr && pChar) { pChar.rotation.y += (e.clientX - lx) * .01; lx = e.clientX; previewSpin = false; } });
}
let previewSpin = true, previewYaw = 0;
function rebuildPreview() { if (pChar) pScene.remove(pChar); pChar = buildCharacter(opts); pChar.scale.setScalar(0.6); pChar.rotation.y = previewYaw; pScene.add(pChar); }
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
  $('joystick').classList.add('on'); $('touch').classList.add('on');
  $('controls').innerHTML = '<b>Thumbstick</b> / WASD move · <b>drag</b> look<br><b>F</b> drive · <b>J</b> fight combo · <b>T</b> paan-spit · <b>B</b> bribe';
  // build player from chosen opts
  player.pos.copy(findSpawn());
  player.g = buildCharacter(opts); player.g.position.copy(player.pos); scene.add(player.g);
  spawnNPCs(24); spawnCows(8); spawnVehicles(16);
  started = true;
  toast('नमस्ते, ' + opts.name + '!', '#ff9933');
}

// ---------- Boot ----------
function boot() {
  if (T.ColorManagement) T.ColorManagement.enabled = true;
  initThree(); buildCity(); initPreview(); wireCreator();
  $('loading').classList.add('hide');
  window.__facefront = () => { previewSpin = false; if (pChar) pChar.rotation.y = 0; };
  window.__facezoom = (y) => { previewSpin = false; if (pChar) pChar.rotation.y = 0; pCam.position.set(0, y, 1.25); pCam.lookAt(0, y, 0); };
  window.__dbg = () => ({ cam: camera.position.toArray().map(v => +v.toFixed(2)),
    rotX: +camera.rotation.x.toFixed(3), player: player.pos.toArray().map(v => +v.toFixed(2)),
    pitch: cam.pitch, yaw: cam.yaw, inV: !!player.inVehicle });
  frame();
}
if (window.THREE) boot(); else { $('loading').textContent = 'Failed to load 3D engine.'; }

})();
