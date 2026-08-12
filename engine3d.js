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
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % TAU) - Math.PI; if (d < -Math.PI) d += TAU; return a + d * t; };

// ---------- Appearance options ----------
const SKINS   = ['#f0c8a0','#e8b98a','#e0ac69','#d09a58','#c68642','#b3773a','#a86b3c','#8d5524','#754322','#5c3a21'];
const TURBANS = ['#ff5722','#ffc107','#e91e63','#3f51b5','#00897b','#ffffff','#4caf50','#9c27b0','#ff9933','#d81b60','#1a237e','#004d40','#b71c1c','#f57f17','#212121'];
const KURTAS  = ['#ffffff','#ff9933','#138808','#c0392b','#2980b9','#f1c40f','#8e44ad','#16a085','#e67e22','#ecf0f1','#1a1a2e','#7b1fa2','#00695c','#bf360c','#4a148c','#33691e','#880e4f','#01579b','#f9a825','#3e2723'];
const DHOTIS  = ['#ffffff','#efe6d0','#d9c9a3','#c9b892','#34495e','#7f8c8d','#1a1a1e','#5d4037','#37474f','#827717','#4e342e','#263238'];
const BEARDS  = ['none','stubble','full','long'];
const settings = { hand: (typeof localStorage !== 'undefined' && localStorage.getItem('sk_hand')) || 'right' };
function applyHand() { document.body.classList.toggle('righty', settings.hand === 'right');
  document.body.classList.toggle('lefty', settings.hand === 'left');
  try { localStorage.setItem('sk_hand', settings.hand); } catch (e) {} }
const opts = { name:'Raja Bahadur', skin:'#c68642', turban:true, turbanColor:'#ff9933', shades:false, scarf:'#c0392b',
  kurta:'#ff9933', dhoti:'#ffffff', beard:'full', moustache:true };

// ---------- Character builder (low-poly humanoid) ----------
function mat(color, rough) { return new T.MeshStandardMaterial({ color: new T.Color(color), roughness: rough == null ? .88 : rough, metalness: .02 }); }
function limb(w, h, color) { // rounded capsule, pivot at TOP
  const r = w / 2; const g = new T.CapsuleGeometry(r, Math.max(0.02, h - 2 * r), 4, 10); g.translate(0, -h / 2, 0);
  return new T.Mesh(g, mat(color));
}
function mute(hex, f) { // desaturate toward warm concrete so the city matches the realistic avatar
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mr = 148, mg = 140, mb = 128; f = f == null ? .42 : f;
  return `rgb(${(r + (mr - r) * f) | 0},${(g + (mg - g) * f) | 0},${(b + (mb - b) * f) | 0}`+`)`;
}
function shadeHex(hex, amt) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(r + amt, 0, 255); g = clamp(g + amt, 0, 255); b = clamp(b + amt, 0, 255); return `rgb(${r | 0},${g | 0},${b | 0})`; }
// paint a full head/face onto an equirectangular texture (face centred at u=0.5)
function makeFaceTexture(o) {
  const W = 640, H = 320, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const cx = W * .5, browY = H * .40, eyeY = H * .455, noseY = H * .55, mouthY = H * .635, chinY = H * .70;
  const eyeDX = W * .072, earDX = W * .25, skin = o.skin;
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
    const dome = new T.Mesh(new T.SphereGeometry(0.29, 22, 12, 0, TAU, 0, Math.PI / 2), tM); dome.scale.set(1.02, 1.0, 1.02); dome.position.set(0, 0.2, 0); head.add(dome);
    // wrap rings sit HIGH on the crown so the forehead shows below
    const wrap = new T.Mesh(new T.TorusGeometry(0.26, 0.085, 12, 24), tM); wrap.rotation.x = Math.PI / 2; wrap.position.set(0, 0.28, 0); head.add(wrap);
    const wrap2 = new T.Mesh(new T.TorusGeometry(0.275, 0.07, 12, 24), tM); wrap2.rotation.x = Math.PI / 2; wrap2.position.set(0, 0.21, 0.012); head.add(wrap2);
    const jewel = new T.Mesh(new T.SphereGeometry(0.05, 12, 12), mat('#ffd700', .25)); jewel.position.set(0, 0.3, 0.24); head.add(jewel);
    const plume = new T.Mesh(new T.ConeGeometry(0.05, 0.3, 10), mat('#f5f5f5', .7)); plume.position.set(0, 0.58, 0.1); plume.rotation.x = -0.3; head.add(plume);
  } else {
    const hair = new T.Mesh(new T.SphereGeometry(0.265, 18, 12, 0, TAU, 0, Math.PI / 2.1), mat('#0d0b0a', .85)); hair.scale.set(1, .8, 1); hair.position.set(0, 0.12, 0); head.add(hair);
  }

  grp.traverse(o2 => { if (o2.isMesh) o2.castShadow = true; });
  grp.userData = { lL, rL, lA, rA, head, phase: 0, punch: 0 };
  grp.scale.setScalar(0.53); // ~1.85 m tall
  return grp;
}
// ---------- Rigged human (GLB) system ----------
let HERO = null; // { scene, clips, height }
function loadHero(cb) {
  const B = window.HERO_ASSETS;
  if (!B || !window.GLTFLoader || !window.skeletonClone) { cb(null); return; }
  const dec = b64 => { const raw = atob(b64), u = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) u[i] = raw.charCodeAt(i); return u.buffer; };
  try {
    const L = new window.GLTFLoader();
    L.parse(dec(B.raja), '', av => {
      const clips = {}; let left = 3;
      const done = () => { if (--left > 0) return;
        const box = new T.Box3().setFromObject(av.scene);
        cb({ scene: av.scene, clips, height: Math.max(0.1, box.max.y - box.min.y) }); };
      // official RPM clips: authored for this exact skeleton, no retargeting needed
      const grab = (b64, name) => L.parse(dec(b64), '', an => { const c = (an.animations || [])[0];
        if (c) { // strip root-motion translation so the walk loops in place (no snap-back)
          const tracks = c.tracks.filter(t => t.name.endsWith('.quaternion'));
          clips[name] = new T.AnimationClip(name, c.duration, tracks); }
        done(); }, done);
      grab(B.idle, 'Idle'); grab(B.walk, 'Walk'); grab(B.run, 'Run');
    }, () => cb(null));
  } catch (e) { cb(null); }
}
// fabric textures so the clothes read as Indian attire, not a western suit
function makeBrocadeTexture(baseHex) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = baseHex; g.fillRect(0, 0, S, S);
  // silk sheen
  const sh = g.createLinearGradient(0, 0, S, S);
  sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(.5, 'rgba(0,0,0,.06)'); sh.addColorStop(1, 'rgba(255,255,255,.08)');
  g.fillStyle = sh; g.fillRect(0, 0, S, S);
  // woven grain
  g.globalAlpha = .05; g.strokeStyle = '#000';
  for (let y = 0; y < S; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  g.globalAlpha = 1;
  // gold zari motifs — staggered paisley dots
  const gold = 'rgba(212,175,55,.75)', goldDim = 'rgba(212,175,55,.35)';
  for (let r = 0; r < 8; r++) for (let cc = 0; cc < 8; cc++) {
    const x = cc * 32 + (r % 2 ? 16 : 0) + 8, y = r * 32 + 10;
    g.fillStyle = gold; g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill();
    g.strokeStyle = goldDim; g.lineWidth = 1.2;
    g.beginPath(); g.arc(x, y, 6, 0.6, 0.6 + Math.PI * 1.4); g.stroke(); // paisley curl
  }
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(3, 3);
  if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; return tex;
}
function makeTurbanTexture(baseHex) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = baseHex; g.fillRect(0, 0, S, S);
  // wrapped-cloth folds: soft diagonal bands
  for (let i = -S; i < S * 2; i += 14) {
    const grd = g.createLinearGradient(i, 0, i + 14, S);
    grd.addColorStop(0, 'rgba(0,0,0,.16)'); grd.addColorStop(.5, 'rgba(255,255,255,.10)'); grd.addColorStop(1, 'rgba(0,0,0,.12)');
    g.fillStyle = grd; g.save(); g.translate(i, 0); g.rotate(0.5); g.fillRect(0, -S, 12, S * 3); g.restore();
  }
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(4, 2);
  if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; return tex;
}
// accessories authored in metres around the head centre
const ACC = { turbY: 0.10, turbZ: 0.0, beardY: -0.085, beardZ: 0.055, mouY: -0.045, mouZ: 0.095 };
function buildHeadgear(o) {
  const g = new T.Group();
  if (o.turban) {
    // smooth wrapped pagdi: lathe profile + cloth-fold texture, matching the avatar's realism
    const tM = new T.MeshStandardMaterial({ color: '#ffffff', map: makeTurbanTexture(o.turbanColor), roughness: .78, metalness: 0 });
    const prof = [];
    prof.push(new T.Vector2(0.001, 0.155));
    prof.push(new T.Vector2(0.055, 0.150));
    prof.push(new T.Vector2(0.105, 0.118));
    prof.push(new T.Vector2(0.128, 0.072));
    prof.push(new T.Vector2(0.126, 0.028));
    prof.push(new T.Vector2(0.112, -0.008));
    prof.push(new T.Vector2(0.092, -0.028));
    const pag = new T.Mesh(new T.LatheGeometry(prof, 28), tM); pag.position.y = ACC.turbY - 0.035; g.add(pag);
    // front band across the brow
    const band = new T.Mesh(new T.TorusGeometry(0.101, 0.018, 10, 26), tM); band.rotation.x = Math.PI / 2;
    band.position.y = ACC.turbY - 0.055; band.scale.set(1, 1, 1.04); g.add(band);
    const jewel = new T.Mesh(new T.SphereGeometry(0.018, 12, 12), mat('#ffd700', .2)); jewel.position.set(0, ACC.turbY + 0.02, 0.112); g.add(jewel);
    const plume = new T.Mesh(new T.ConeGeometry(0.013, 0.085, 8), mat('#f2ead8', .65)); plume.position.set(0, ACC.turbY + 0.135, 0.075); plume.rotation.x = -0.35; g.add(plume);
  }
  if (o.beard && o.beard !== 'none') {
    const bM = mat('#171310', .85);
    const b = new T.Mesh(new T.SphereGeometry(0.085, 14, 12), bM);
    if (o.beard === 'stubble') b.scale.set(1.0, .55, .62);
    else if (o.beard === 'full') b.scale.set(1.02, .85, .7);
    else b.scale.set(1.0, 1.5, .7);
    b.position.set(0, ACC.beardY - (o.beard === 'long' ? 0.05 : 0), ACC.beardZ); g.add(b);
  }
  if (o.moustache) { const m = new T.Mesh(new T.TorusGeometry(0.035, 0.012, 8, 14, Math.PI), mat('#171310', .85));
    m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI; m.position.set(0, ACC.mouY, ACC.mouZ); g.add(m); }
  g.traverse(x => { if (x.isMesh) x.castShadow = true; });
  return g;
}
function makeHuman(o) {
  const grp = new T.Group();
  const model = window.skeletonClone(HERO.scene);
  const s = 1.8 / HERO.height; model.scale.setScalar(s);
  grp.add(model);
  const skinTint = new T.Color('#ffffff').lerp(new T.Color(o.skin), 0.55);
  model.traverse(n => { if (!(n.isMesh || n.isSkinnedMesh)) return;
    n.castShadow = true; n.frustumCulled = false;
    const mn = (n.material && n.material.name) || '';
    n.material = n.material.clone();
    if (/Outfit_Top/i.test(mn)) { // sherwani: gold-zari brocade in the chosen colour
      n.material.map = makeBrocadeTexture(o.kurta); n.material.color = new T.Color('#ffffff'); n.material.roughness = .72; }
    else if (/Outfit_Bottom/i.test(mn)) n.material.color = new T.Color(o.dhoti);     // churidar / pyjama
    else if (/Footwear/i.test(mn)) n.material.color = new T.Color('#7a4f28');        // leather juttis
    else if (/Skin|Body/i.test(mn)) n.material.color = skinTint;                     // face + body skin tone
    else if (/Headwear/i.test(mn)) n.visible = false;                                // replaced by our pagdi
    else if (/Beard/i.test(mn)) n.visible = o.beard !== 'none';                      // the avatar's real beard
    else if (/visor/i.test(n.name) || /visor/i.test(mn)) { n.visible = !!o.shades; if (o.shades) { n.material.color = new T.Color('#101014'); n.material.roughness = .15; } } });
  grp.updateMatrixWorld(true);
  let head = null, neck = null, spine = null, rArm = null, lArm = null, rLeg = null, lLeg = null, rCalf = null, lCalf = null, rFore = null, lFore = null;
  model.traverse(n => { if (!n.isBone) return; const nm = n.name;
    if (/Head$/.test(nm)) head = n; else if (/Neck$/.test(nm)) neck = n; else if (/Spine2$/.test(nm)) spine = n;
    else if (/RightArm$/.test(nm)) rArm = n; else if (/LeftArm$/.test(nm)) lArm = n;
    else if (/RightUpLeg$/.test(nm)) rLeg = n; else if (/LeftUpLeg$/.test(nm)) lLeg = n;
    else if (/RightLeg$/.test(nm)) rCalf = n; else if (/LeftLeg$/.test(nm)) lCalf = n;
    else if (/RightForeArm$/.test(nm)) rFore = n; else if (/LeftForeArm$/.test(nm)) lFore = n; });
  const V = new T.Vector3();
  if (head) { const ws = head.getWorldScale(V).x || 1;
    // the avatar has a real beard mesh, so only the pagdi is attached here
    const acc = buildHeadgear({ turban: o.turban, turbanColor: o.turbanColor }); acc.scale.setScalar(1 / ws); acc.position.set(0, 0.085 / ws, 0.005 / ws); head.add(acc); }
  if (neck && (o.scarf || o.kurta)) { const ws = neck.getWorldScale(V).x || 1;
    const scarf = new T.Group(); const sM = mat(o.scarf || o.kurta, .8);
    const loop = new T.Mesh(new T.TorusGeometry(0.085, 0.028, 8, 18), sM); loop.rotation.x = Math.PI / 2; loop.position.y = -0.02; scarf.add(loop);
    for (const sx of [-0.05, 0.05]) { const strip = new T.Mesh(new T.BoxGeometry(0.07, 0.34, 0.015), sM); strip.position.set(sx, -0.2, 0.1); strip.rotation.x = 0.12; scarf.add(strip); }
    scarf.traverse(x => { if (x.isMesh) x.castShadow = true; });
    scarf.scale.setScalar(1 / ws); scarf.position.set(0, 0.02 / ws, 0); neck.add(scarf); }
  const mixer = new T.AnimationMixer(model);
  const actions = {};
  for (const nm of ['Idle', 'Walk', 'Run']) { const c = HERO.clips[nm]; if (c) { const a = mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(nm === 'Idle' ? 1 : 0); a.play(); actions[nm.toLowerCase()] = a; } }
  grp.userData = { human: { mixer, actions, w: { idle: 1, walk: 0, run: 0 }, gait: rand(.82, 1.18), head, neck, spine, rArm, lArm, rFore, lFore, rLeg, lLeg, rCalf, lCalf, seated: false }, attack: null };
  return grp;
}
function animateHuman(g, moving, dt, speed) {
  const u = g.userData, h = u.human;
  // blend weights by state
  const tgt = { idle: moving ? 0 : 1, walk: moving && speed < 4.6 ? 1 : 0, run: moving && speed >= 4.6 ? 1 : 0 };
  for (const k in h.w) { h.w[k] = lerp(h.w[k], tgt[k], Math.min(1, dt * 8)); if (h.actions[k]) h.actions[k].setEffectiveWeight(h.w[k]); }
  if (h.actions.walk) h.actions.walk.setEffectiveTimeScale(clamp(speed / 3.2, .55, 1.3) * h.gait);
  if (h.actions.run) h.actions.run.setEffectiveTimeScale(clamp(speed / 6, .8, 1.2) * h.gait);
  h.mixer.update(dt);
  if (h.seated) { // driving pose: hips/knees bent, hands on the bar
    const set = (b, x) => { if (b) b.rotation.x = x; };
    set(h.rLeg, -1.3); set(h.lLeg, -1.3); set(h.rCalf, 1.35); set(h.lCalf, 1.35);
    if (h.rArm) { h.rArm.rotation.x = -.95; h.rArm.rotation.z = -.3; }
    if (h.lArm) { h.lArm.rotation.x = -.95; h.lArm.rotation.z = .3; }
    return;
  }
  // full-body MMA strikes: guard up, hips drive, elbows extend
  if (u.attack && u.attack.t > 0) {
    const p = 1 - u.attack.t, ext = Math.sin(clamp(p * 1.25, 0, 1) * Math.PI), k = u.attack.kind;
    // fighting stance: both fists up in guard, slight crouch
    if (h.lArm) { h.lArm.rotation.x -= .85; h.lArm.rotation.z += .35; }
    if (h.rArm) { h.rArm.rotation.x -= .85; h.rArm.rotation.z -= .35; }
    if (h.lFore) h.lFore.rotation.x -= 1.15;
    if (h.rFore) h.rFore.rotation.x -= 1.15;
    if (h.rLeg) h.rLeg.rotation.x -= .18; if (h.lLeg) h.lLeg.rotation.x -= .18; // crouch
    if (k === 0) { // JAB: lead straight — shoulders rotate, elbow snaps out
      if (h.spine) h.spine.rotation.y += .55 * ext;
      if (h.head) h.head.rotation.y -= .3 * ext;
      if (h.lArm) { h.lArm.rotation.x = -1.5 * ext - .5; h.lArm.rotation.z = .1; h.lArm.rotation.y = -.2 * ext; }
      if (h.lFore) h.lFore.rotation.x = -1.15 * (1 - ext); // elbow extends
    } else if (k === 1) { // CROSS: rear straight — full hip drive
      if (h.spine) { h.spine.rotation.y -= .8 * ext; h.spine.rotation.x += .15 * ext; }
      if (h.head) h.head.rotation.y += .35 * ext;
      if (h.rArm) { h.rArm.rotation.x = -1.55 * ext - .5; h.rArm.rotation.z = -.1; h.rArm.rotation.y = .25 * ext; }
      if (h.rFore) h.rFore.rotation.x = -1.15 * (1 - ext);
    } else { // ROUNDHOUSE LOW KICK: torso counter-rotates, leg whips in an arc
      if (h.spine) { h.spine.rotation.y -= .7 * ext; h.spine.rotation.z += .3 * ext; }
      if (h.rLeg) { h.rLeg.rotation.x = -1.25 * ext; h.rLeg.rotation.z = -.6 * ext; }
      if (h.rCalf) h.rCalf.rotation.x = 1.1 * (1 - ext * .8);
      if (h.lLeg) h.lLeg.rotation.x = -.3 * ext; // planted leg bends
    }
    u.attack.t -= dt * 3.4;
  }
}
const makeCharacter = o => HERO ? makeHuman(o) : buildCharacter(o);

function animateChar(g, moving, dt, speed) {
  if (g.userData.human) return animateHuman(g, moving, dt, speed);
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
  { name:'Purani Dilli', greet:'Welcome to Purani Dilli', ground:'#b8956a', pal:['#e8d9b8','#b8c9a8','#a9bfc9','#c9a15a','#b0523a'],
    fact:'Purani Dilli — 400-year-old lanes of Chandni Chowk, the call to prayer over India’s busiest bazaar.' },
  { name:'Bambai', greet:'Welcome to Bambai', ground:'#8f9aa3', pal:['#e8e0c8','#dcd2b4','#bcd8cc','#e8c8b8'],
    fact:'Bambai — Bollywood dreams above, dabbawalas below: 200,000 tiffins delivered daily by hand.' },
  { name:'Marwar', greet:'Padharo — Marwar', ground:'#caa25e', pal:['#d15b7a','#c76a8f','#3f6fb0','#e08a3c'],
    fact:'Marwar — Jaipur the Pink City, Jodhpur the Blue City, a fort on every hill.' },
  { name:'Kashi', greet:'Har Har Mahadev — Kashi', ground:'#c2a06a', pal:['#e07b2e','#9c3b2a','#ede3c8','#c4a876'],
    fact:'Kashi (Varanasi) — one of the oldest living cities on Earth; the Ganga Aarti lights the ghats each dusk.' },
  { name:'Punjab', greet:'Sat Sri Akal — Punjab', ground:'#b7a94e', pal:['#a8503a','#b85c40','#e8dcc4','#c8b89a'],
    fact:'Punjab — the Golden Temple langar feeds 100,000 people free every day, all seated as equals.' },
  { name:'Kerala', greet:'Namaskaram — Kerala', ground:'#5f8f5c', pal:['#f2ead6','#e8dcc0','#b85838','#d8ccb0'],
    fact:'Kerala — “God’s Own Country”: backwaters, 90%+ literacy, and Onam’s flower carpets and feasts.' },
  { name:'Kolkata', greet:'Eso — Kolkata', ground:'#a6996e', pal:['#8a3a30','#a04438','#c8a44a','#b89858'],
    fact:'Kolkata — yellow Ambassador taxis, hand-pulled rickshaws, and Durga Puja’s open-air art.' },
  { name:'Chennai', greet:'Vanakkam — Chennai', ground:'#c2a15e', pal:['#d8b868','#e8dcc0','#a8c8a8','#b85838'],
    fact:'Chennai — towering temple gopurams, filter “kaapi” in steel tumblers, and the long Marina beach.' },
  { name:'Goa', greet:'Welcome to Goa', ground:'#d8c48f', pal:['#e8dcc0','#3fa0a0','#c0563a','#e0b93c'],
    fact:'Goa — Portuguese-white churches, palm beaches and “susegad”: the art of doing nothing, slowly.' },
];
const WORLD = 320, HALF = WORLD / 2, CELL = WORLD / 3, STEP = 20, ROADW = 7, SIDEW = 2.4;
function districtAt(x, z) {
  const mx = clamp(Math.floor((x + HALF) / CELL), 0, 2), mz = clamp(Math.floor((z + HALF) / CELL), 0, 2);
  return mz * 3 + mx;
}
// some grid roads are unpaved dirt lanes, like most of India outside the metros
const dirtV = new Set(), dirtH = new Set();
{ let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 1; k * STEP < WORLD; k++) { if (rnd() < .3) dirtV.add(k); if (rnd() < .3) dirtH.add(k); } }
const isDirtV = k => dirtV.has(k), isDirtH = k => dirtH.has(k);
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
let renderer, scene, camera, clock, sun, composer;
const buildings = []; // {x,z,hw,hd}
let ground, winTex, winTexPools = {};
function makeSky() {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#2e5f9e'); grd.addColorStop(.45, '#7fa9d0'); grd.addColorStop(.72, '#e8bf96'); grd.addColorStop(.92, '#f0c184'); grd.addColorStop(1, '#eec489');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // low warm sun with glow
  const sx = W * .68, sy = H * .70;
  const glow = g.createRadialGradient(sx, sy, 2, sx, sy, 110);
  glow.addColorStop(0, 'rgba(255,238,200,.95)'); glow.addColorStop(.18, 'rgba(255,205,130,.55)'); glow.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // hazy streaked clouds
  g.globalAlpha = .16; g.fillStyle = '#fbe6c8';
  for (let i = 0; i < 9; i++) { const y = rand(H * .2, H * .62), w = rand(70, 190), h = rand(4, 10);
    g.beginPath(); g.ellipse(rand(0, W), y, w, h, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
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
  scene.fog = new T.Fog('#ecc9a0', 60, 175);
  camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
  const hemi = new T.HemisphereLight('#a8c4e8', '#6b5335', 0.42); scene.add(hemi);
  const amb = new T.AmbientLight('#ffe9d0', 0.12); scene.add(amb);
  // low golden-hour sun for long cinematic shadows
  sun = new T.DirectionalLight('#ffc178', 1.7); sun.position.set(36, 48, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
  const sc = sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 260;
  scene.add(sun); scene.add(sun.target);
  // post: bloom + gamma
  if (window.EffectComposer) {
    composer = new window.EffectComposer(renderer);
    composer.addPass(new window.RenderPass(scene, camera));
    const bloom = new window.UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.2, 0.3, 0.9);
    composer.addPass(bloom);
    composer.addPass(new window.ShaderPass(window.GammaCorrectionShader));
  }
  clock = new T.Clock();
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); if (composer) composer.setSize(innerWidth, innerHeight); });
}

// ground texture: district colours + sidewalks + road grid + lane dashes
function makeGroundTexture() {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const u = w => w / WORLD * S, px = v => (v + HALF) / WORLD * S;
  for (let i = 0; i < 9; i++) { const mx = i % 3, mz = (i / 3) | 0;
    g.fillStyle = mute(DISTRICTS[i].ground, .3); g.fillRect(mx * S / 3, mz * S / 3, S / 3 + 1, S / 3 + 1); }
  g.fillStyle = 'rgba(60,50,35,.06)'; for (let i = 0; i < 6000; i++) g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  // sidewalks (light paving) — a band straddling each road
  g.fillStyle = '#9a978f';
  for (let v = -HALF; v <= HALF; v += STEP) { g.fillRect(px(v - SIDEW), 0, u(ROADW + 2 * SIDEW), S); g.fillRect(0, px(v - SIDEW), S, u(ROADW + 2 * SIDEW)); }
  // paving joints on sidewalks
  g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 1; g.setLineDash([]);
  for (let v = -HALF; v <= HALF; v += 3) { g.beginPath(); g.moveTo(px(v), 0); g.lineTo(px(v), S); g.stroke(); g.beginPath(); g.moveTo(0, px(v)); g.lineTo(S, px(v)); g.stroke(); }
  // roads: asphalt for paved lines, rough earth for dirt lanes
  let ki = 0;
  for (let v = -HALF; v <= HALF; v += STEP, ki++) {
    const kIdx = Math.round((v + HALF) / STEP);
    g.fillStyle = isDirtV(kIdx) ? '#8a6b4a' : '#3b3b41'; g.fillRect(px(v), 0, u(ROADW), S);
    g.fillStyle = isDirtH(kIdx) ? '#8a6b4a' : '#3b3b41'; g.fillRect(0, px(v), S, u(ROADW));
  }
  // dirt texture: ruts, potholes, ragged edges
  g.globalAlpha = .35;
  for (let v = -HALF; v <= HALF; v += STEP) { const kIdx = Math.round((v + HALF) / STEP);
    if (isDirtV(kIdx)) for (let i = 0; i < 260; i++) { g.fillStyle = pick(['#6e5238', '#9c7d58', '#5c452e']);
      g.beginPath(); g.ellipse(px(v) + rand(0, u(ROADW)), rand(0, S), rand(2, 7), rand(1.5, 4), 0, 0, TAU); g.fill(); }
    if (isDirtH(kIdx)) for (let i = 0; i < 260; i++) { g.fillStyle = pick(['#6e5238', '#9c7d58', '#5c452e']);
      g.beginPath(); g.ellipse(rand(0, S), px(v) + rand(0, u(ROADW)), rand(2, 7), rand(1.5, 4), 0, 0, TAU); g.fill(); } }
  g.globalAlpha = 1;
  // asphalt grain
  g.globalAlpha = .12;
  for (let i = 0; i < 9000; i++) { const x = Math.random() * S, y = Math.random() * S;
    g.fillStyle = Math.random() < .5 ? '#2e2e33' : '#4a4a52'; g.fillRect(x, y, 1.6, 1.6); }
  g.globalAlpha = 1;
  // curb line
  g.strokeStyle = 'rgba(20,20,24,.5)'; g.lineWidth = 2;
  for (let v = -HALF; v <= HALF; v += STEP) { for (const e of [px(v), px(v) + u(ROADW)]) { g.beginPath(); g.moveTo(e, 0); g.lineTo(e, S); g.stroke(); g.beginPath(); g.moveTo(0, e); g.lineTo(S, e); g.stroke(); } }
  // lane dashes on paved roads only
  g.strokeStyle = 'rgba(240,210,120,.5)'; g.lineWidth = 2; g.setLineDash([12, 14]);
  for (let v = -HALF; v <= HALF; v += STEP) { const kIdx = Math.round((v + HALF) / STEP), p = px(v) + u(ROADW) / 2;
    if (!isDirtV(kIdx)) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke(); }
    if (!isDirtH(kIdx)) { g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke(); } }
  g.setLineDash([]);
  // kolam dot-motifs on Chennai sidewalks (district 7: cell mx=1, mz=2)
  (function kolams() {
    const x0 = S / 3, x1 = 2 * S / 3, z0 = 2 * S / 3, z1 = S;
    g.fillStyle = 'rgba(245,242,232,.85)';
    for (let k = 0; k < 60; k++) {
      const kx = rand(x0, x1), kz = rand(z0, z1);
      const wx = kx / S * WORLD - HALF, wz = kz / S * WORLD - HALF;
      if (!onSidewalk(wx, wz)) continue;
      for (let ring = 0; ring < 3; ring++) { const n = 4 + ring * 4, rr = 2.5 + ring * 3;
        for (let p2 = 0; p2 < n; p2++) { const a = p2 / n * TAU;
          g.beginPath(); g.arc(kx + Math.cos(a) * rr, kz + Math.sin(a) * rr, 1.1, 0, TAU); g.fill(); } }
    }
  })();
  // zebra crossings: only where two paved roads meet, and only in busier blocks
  g.fillStyle = 'rgba(230,228,220,.75)';
  for (let vx = -HALF; vx <= HALF; vx += STEP) for (let vz = -HALF; vz <= HALF; vz += STEP) {
    const kx = Math.round((vx + HALF) / STEP), kz = Math.round((vz + HALF) / STEP);
    if (isDirtV(kx) || isDirtH(kz)) continue;
    if (((kx * 31 + kz * 17) % 10) > 4) continue;
    const ix = px(vx), iz = px(vz), rw = u(ROADW);
    for (let s2 = 2; s2 < rw - 2; s2 += 7) {
      g.fillRect(ix + s2, iz - u(1.6), 4, u(1.1));           // north arm
      g.fillRect(ix + s2, iz + rw + u(0.5), 4, u(1.1));      // south arm
      g.fillRect(ix - u(1.6), iz + s2, u(1.1), 4);           // west arm
      g.fillRect(ix + rw + u(0.5), iz + s2, u(1.1), 4);      // east arm
    }
  }
  const tex = new T.CanvasTexture(c); tex.anisotropy = 8; return tex;
}
function makeFacadeTexture(style, floors) {
  floors = floors || 7;
  // style 0: modern flats · 1: old-city arches + shutters · 2: bazaar with painted signboards · 3: patched/weathered mix
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#d8d2c2'; g.fillRect(0, 0, S, S);
  // Indian walls: big patches of mismatched repaints + exposed brick
  const patchN = style === 3 ? 34 : 16;
  for (let i = 0; i < patchN; i++) { g.globalAlpha = style === 3 ? .16 : .07;
    g.fillStyle = pick(['#b8ad96', '#efe9da', '#c9a15a', '#a9bfc9', '#b8c9a8', '#c67b62']);
    g.fillRect(rand(0, S), rand(0, S), rand(50, 170), rand(40, 130)); }
  // exposed brick patches
  if (style !== 0) for (let i = 0; i < 5; i++) { const bx = rand(0, S - 70), by = rand(S * .3, S - 60);
    g.globalAlpha = .5; g.fillStyle = '#a85c3e'; g.fillRect(bx, by, rand(36, 70), rand(24, 48));
    g.globalAlpha = .3; g.strokeStyle = '#7c4029'; g.lineWidth = 1;
    for (let yy = by; yy < by + 48; yy += 7) { g.beginPath(); g.moveTo(bx, yy); g.lineTo(bx + 70, yy); g.stroke(); } }
  g.globalAlpha = 1;
  const cols = 4, padx = 22, ww = (S - padx * (cols + 1)) / cols, fh = S / floors;
  for (let f = 0; f < floors; f++) {
    const yTop = f * fh;
    g.fillStyle = 'rgba(60,55,45,.35)'; g.fillRect(0, yTop, S, 3);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, yTop + 3, S, 2);
    if (f === floors - 1) { // ground floor
      for (let cc = 0; cc < cols; cc++) {
        const x = padx + cc * (ww + padx), y = yTop + fh * .18, h2 = fh * .74;
        g.fillStyle = pick(['#7f8a92', '#9a8a6a', '#7d9484', '#a08878']); g.fillRect(x - 6, y, ww + 12, h2);
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5;
        for (let s2 = 0; s2 < h2; s2 += 5) { g.beginPath(); g.moveTo(x - 6, y + s2); g.lineTo(x + ww + 6, y + s2); g.stroke(); }
        if (style === 2) { // painted signboard with script-like strokes
          const sb = pick(['#c0392b', '#1a5c8a', '#c9a02b', '#1e7a4a', '#8a2b6b']);
          g.fillStyle = sb; g.fillRect(x - 8, y - 16, ww + 16, 15);
          g.strokeStyle = pick(['#ffe9a8', '#ffffff']); g.lineWidth = 2;
          g.beginPath(); g.moveTo(x - 2, y - 5); g.lineTo(x + ww + 2, y - 5); g.stroke(); // headline bar (devanagari-like)
          for (let sx2 = x; sx2 < x + ww; sx2 += rand(6, 12)) { g.beginPath(); g.moveTo(sx2, y - 5); g.lineTo(sx2 + rand(-2, 2), y - 12 + rand(0, 4)); g.stroke(); }
        } else { g.fillStyle = 'rgba(30,28,24,.5)'; g.fillRect(x - 8, y - 8, ww + 16, 8); }
      }
      continue;
    }
    for (let cc = 0; cc < cols; cc++) {
      const x = padx + cc * (ww + padx), y = yTop + fh * .22, wh = fh * .52;
      g.fillStyle = style === 1 ? '#4a3a2c' : '#3a3f46'; // frame
      if (style === 1) { g.beginPath(); g.moveTo(x - 3, y + wh + 3); g.lineTo(x - 3, y + wh * .35); g.arc(x + ww / 2, y + wh * .35, ww / 2 + 3, Math.PI, 0); g.lineTo(x + ww + 3, y + wh + 3); g.closePath(); g.fill(); }
      else g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
      const lit = Math.random() < .18;
      const gl = g.createLinearGradient(0, y, 0, y + wh);
      if (lit) { gl.addColorStop(0, '#ffe2a8'); gl.addColorStop(1, '#e8a94f'); }
      else { gl.addColorStop(0, '#9db4c4'); gl.addColorStop(.5, '#5f7484'); gl.addColorStop(1, '#3c4a56'); }
      g.fillStyle = gl;
      if (style === 1 && Math.random() < .45) { // closed wooden shutters instead of glass
        g.fillStyle = pick(['#2e5d3a', '#7c9e8a', '#5a7d99', '#3f7d5c']);
        g.fillRect(x, y, ww, wh);
        g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.4;
        for (let yy = y + 3; yy < y + wh; yy += 4) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + ww, yy); g.stroke(); }
      } else { g.fillRect(x, y, ww, wh);
        g.strokeStyle = 'rgba(20,22,26,.7)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + wh); g.stroke(); }
      if (Math.random() < .3) { // balcony
        g.fillStyle = 'rgba(50,46,40,.85)'; g.fillRect(x - 8, y + wh + 2, ww + 16, 4);
        g.strokeStyle = 'rgba(50,46,40,.8)'; g.lineWidth = 1.6;
        for (let b = 0; b <= ww + 16; b += 6) { g.beginPath(); g.moveTo(x - 8 + b, y + wh + 6); g.lineTo(x - 8 + b, y + wh + 18); g.stroke(); }
        g.fillStyle = 'rgba(50,46,40,.85)'; g.fillRect(x - 8, y + wh + 18, ww + 16, 3);
        if (Math.random() < .5) { g.fillStyle = pick(['#c0392b', '#2980b9', '#e0b93c', '#8e44ad']); g.fillRect(x + rand(-4, ww * .4), y + wh + 7, rand(8, 16), 10); } // drying laundry
      } else if (Math.random() < .3) {
        g.fillStyle = '#9a948a'; g.fillRect(x + ww * .25, y + wh + 4, ww * .5, 12);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + ww * .25, y + wh + 16, ww * .5, 2);
      }
      if (Math.random() < .55) { const gr = g.createLinearGradient(0, y + wh, 0, y + wh + 26);
        gr.addColorStop(0, 'rgba(45,38,26,.34)'); gr.addColorStop(1, 'rgba(45,38,26,0)');
        g.fillStyle = gr; g.fillRect(x - 4, y + wh, ww + 8, 26); }
    }
  }
  const ao = g.createLinearGradient(0, S - fh * 1.4, 0, S);
  ao.addColorStop(0, 'rgba(30,25,18,0)'); ao.addColorStop(1, 'rgba(30,25,18,.42)');
  g.fillStyle = ao; g.fillRect(0, S - fh * 1.4, S, fh * 1.4);
  g.globalAlpha = .05; for (let i = 0; i < 2400; i++) { g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(Math.random() * S, Math.random() * S, 2, 2); } g.globalAlpha = 1;
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; return tex;
}
function makeWindowTexture() { return makeFacadeTexture(0); }
// district-specific architecture, from studying each city's real streetscape
function addDistrictArchitecture(di, x, z, w, h, d, boxGeo) {
  const front = z + d / 2;
  switch (di) {
    case 0: { // Old Delhi: projecting wooden jharokha bays on the upper floors
      if (Math.random() < .6) { const bayM = mat('#6b4a2e', .85);
        for (let k = 0; k < 2; k++) { const bay = new T.Mesh(boxGeo, bayM);
          bay.scale.set(1.4, 1.1, .5); bay.position.set(x + rand(-w * .28, w * .28), rand(h * .45, h * .8), front + .2); bay.castShadow = true; scene.add(bay);
          const shade = new T.Mesh(boxGeo, mat('#3f7d5c', .9)); shade.scale.set(1.5, .08, .7); shade.position.set(bay.position.x, bay.position.y + .62, front + .3); scene.add(shade); } }
      break; }
    case 1: { // Mumbai: monsoon-blue tarpaulin patches on roofs (iconic from above)
      if (Math.random() < .45) { const tarp = new T.Mesh(boxGeo, mat('#2d6cdf', .95));
        tarp.scale.set(w * rand(.3, .55), .1, d * rand(.3, .55)); tarp.position.set(x + rand(-w * .2, w * .2), h + .4, z + rand(-d * .2, d * .2)); scene.add(tarp); }
      break; }
    case 2: { // Jaipur: white trim + rooftop chhatri (domed pavilion)
      const trim = new T.Mesh(boxGeo, mat('#f2ece0', .8)); trim.scale.set(w + .12, .35, d + .12); trim.position.set(x, h - .5, z); scene.add(trim);
      if (Math.random() < .5) { const g = new T.Group(); const cM = mat('#f2ece0', .75);
        for (const [sx, sz] of [[-.55, -.55], [.55, -.55], [-.55, .55], [.55, .55]]) { const p = new T.Mesh(new T.CylinderGeometry(.08, .08, 1.1, 8), cM); p.position.set(sx, .55, sz); g.add(p); }
        const dome = new T.Mesh(new T.SphereGeometry(.85, 12, 8, 0, TAU, 0, Math.PI / 2), cM); dome.position.y = 1.1; dome.scale.y = .75; g.add(dome);
        g.position.set(x + w * .25, h + .35, z + d * .25); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); }
      break; }
    case 3: { // Varanasi: temple shikhara spires + saffron pennant flags
      if (Math.random() < .3) { const sM = mat(pick(['#d98a2b', '#c9b8a0']), .85); const g = new T.Group();
        for (let k = 0; k < 4; k++) { const s = new T.Mesh(new T.CylinderGeometry(1 - k * .22, 1.15 - k * .22, 1.1, 8), sM); s.position.y = k * 1.05; g.add(s); }
        const tip = new T.Mesh(new T.SphereGeometry(.3, 8, 8), mat('#ffd700', .3)); tip.position.y = 4.4; g.add(tip);
        g.scale.setScalar(rand(.8, 1.2)); g.position.set(x + rand(-w * .2, w * .2), h, z + rand(-d * .2, d * .2));
        g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); }
      if (Math.random() < .5) { const pole = new T.Mesh(new T.CylinderGeometry(.04, .04, 2.4, 6), mat('#8a6b3a')); pole.position.set(x + w * .3, h + 1.2, z - d * .3); scene.add(pole);
        const flag = new T.Mesh(new T.ConeGeometry(.35, 1.0, 3), new T.MeshStandardMaterial({ color: '#ff7722', emissive: '#c84400', emissiveIntensity: .25, side: T.DoubleSide }));
        flag.rotation.z = Math.PI / 2; flag.position.set(x + w * .3 + .5, h + 2.1, z - d * .3); scene.add(flag); }
      break; }
    case 4: { // Punjab: white Sikh dome + Nishan Sahib (saffron flag on wrapped pole)
      if (Math.random() < .3) { const pole = new T.Mesh(new T.CylinderGeometry(.06, .06, 5.5, 8), mat('#ff9933', .8)); pole.position.set(x + w * .3, h + 2.75, z + d * .3); scene.add(pole);
        const nishan = new T.Mesh(new T.ConeGeometry(.5, 1.5, 3), new T.MeshStandardMaterial({ color: '#ff8811', emissive: '#c85500', emissiveIntensity: .3, side: T.DoubleSide }));
        nishan.rotation.z = Math.PI / 2; nishan.position.set(x + w * .3 + .7, h + 4.9, z + d * .3); scene.add(nishan); }
      if (Math.random() < .35) { const dm = new T.Mesh(new T.SphereGeometry(.9, 14, 10, 0, TAU, 0, Math.PI / 2), mat('#f4f0e6', .6));
        dm.scale.y = 1.15; dm.position.set(x - w * .25, h + .3, z - d * .25); dm.castShadow = true; scene.add(dm);
        const fin = new T.Mesh(new T.ConeGeometry(.1, .5, 8), mat('#ffd700', .3)); fin.position.set(x - w * .25, h + 1.5, z - d * .25); scene.add(fin); }
      break; }
    case 6: { // Kolkata: colonial colonnade portico at street level
      if (Math.random() < .55) { const cM = mat('#e8e2d2', .8);
        const ent = new T.Mesh(boxGeo, cM); ent.scale.set(w * .95, .45, .9); ent.position.set(x, 3.1, front + .35); ent.castShadow = true; scene.add(ent);
        const n = Math.max(3, Math.round(w / 2.4));
        for (let k = 0; k < n; k++) { const col = new T.Mesh(new T.CylinderGeometry(.16, .18, 2.9, 10), cM);
          col.position.set(x - w * .45 + k * (w * .9 / (n - 1)), 1.45, front + .6); col.castShadow = true; scene.add(col); } }
      break; }
    case 7: { // Chennai: red-and-white striped temple compound wall
      if (Math.random() < .4) { const wallC = document.createElement('canvas'); wallC.width = 64; wallC.height = 32; const wg = wallC.getContext('2d');
        for (let k = 0; k < 8; k++) { wg.fillStyle = k % 2 ? '#f2ece0' : '#c0392b'; wg.fillRect(k * 8, 0, 8, 32); }
        const wt = new T.CanvasTexture(wallC); wt.wrapS = T.RepeatWrapping; wt.repeat.set(Math.round(w / 2), 1);
        const wall = new T.Mesh(boxGeo, new T.MeshStandardMaterial({ map: wt, roughness: .9 }));
        wall.scale.set(w + 1.2, 1.2, .25); wall.position.set(x, .6, front + .8); wall.castShadow = true; scene.add(wall); }
      break; }
    case 8: { // Goa: white-trimmed Portuguese balcão porch posts
      if (Math.random() < .5) { const pM = mat('#f6f2e8', .8);
        const porch = new T.Mesh(boxGeo, mat('#a24a30', .9)); porch.scale.set(w * .5, .12, 1.2); porch.position.set(x, 2.3, front + .5); porch.castShadow = true; scene.add(porch);
        for (const sx of [-w * .2, w * .2]) { const post = new T.Mesh(new T.CylinderGeometry(.09, .09, 2.2, 8), pM); post.position.set(x + sx, 1.15, front + .95); post.castShadow = true; scene.add(post); } }
      break; }
  }
}
function buildCity() {
  const gt = makeGroundTexture(); if ('sRGBEncoding' in T) gt.encoding = T.sRGBEncoding;
  ground = new T.Mesh(new T.PlaneGeometry(WORLD, WORLD), new T.MeshStandardMaterial({ map: gt, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  winTexPools = {};
  for (const nf of [2, 3, 5, 8]) winTexPools[nf] = [makeFacadeTexture(0, nf), makeFacadeTexture(1, nf), makeFacadeTexture(2, nf), makeFacadeTexture(3, nf)];
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
      const di2 = districtAt(px2, pz2), D = DISTRICTS[di2];
      // studied city profiles: Kerala/Goa are LOW with pitched roofs, Mumbai towers high,
      // Jaipur is the Pink City, Varanasi/Delhi stay dense mid-rise
      const lowRise = di2 === 5 || di2 === 8, isMumbai = di2 === 1;
      const h = lowRise ? rand(5, 9.5) : isMumbai ? rand(12, 26) : rand(6.5, 16);
      const w = cw * rand(.72, .92), d = cd * rand(.72, .92);
      const baseCol = di2 === 2 ? pick(['#c67b62', '#d98e75', '#cc8069']) : mute(pick(D.pal)); // Jaipur's mandated pink
      const nf = h < 8 ? 2 : h < 11 ? 3 : h < 18 ? 5 : 8; // ≈3m per floor, human scale
      const pool = winTexPools[nf];
      const texPick = (di2 === 0 || di2 === 3) ? pick([pool[1], pool[2], pool[3]])
        : (di2 === 1 || di2 === 6) ? pick([pool[0], pool[2], pool[3]])
        : pick(pool);
      const bm = new T.MeshStandardMaterial({ color: new T.Color(baseCol), map: texPick, roughness: .92, metalness: .02 });
      const m = new T.Mesh(boxGeo, bm); m.scale.set(w, h, d); m.position.set(px2, h / 2, pz2); m.castShadow = true; m.receiveShadow = true; scene.add(m);
      if (lowRise) { // Kerala / Goa: steep clay-tile hipped roof
        const roofM = mat(pick(['#a24a30', '#94402a', '#b0563a']), .9);
        const pyr = new T.Mesh(new T.ConeGeometry(1, 1, 4), roofM);
        pyr.rotation.y = Math.PI / 4; pyr.scale.set(w * .78, Math.max(1.6, h * .34), d * .78);
        pyr.position.set(px2, h + Math.max(1.6, h * .34) / 2 - .1, pz2); pyr.castShadow = true; scene.add(pyr);
      } else {
        const roof = new T.Mesh(boxGeo, mat('#2b2b32')); roof.scale.set(w + .25, .5, d + .25); roof.position.set(px2, h + .1, pz2); roof.castShadow = true; scene.add(roof);
      }
      addDistrictArchitecture(di2, px2, pz2, w, h, d, boxGeo);
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
  genDelhiWires();
  prerenderMap();
  buildRamps();
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
    } else if (i === 0) { // Jama Masjid: red sandstone base, striped white marble domes, tall minarets
      const b = new T.Mesh(new T.BoxGeometry(8, 4.5, 5), mat('#a6402d', .9)); b.position.y = 2.25; g.add(b);
      const plinth = new T.Mesh(new T.BoxGeometry(10, 1, 7), mat('#b0523a', .9)); plinth.position.y = .5; g.add(plinth);
      for (const [sx, sc] of [[-2.6, .8], [0, 1.15], [2.6, .8]]) {
        const dome = new T.Mesh(new T.SphereGeometry(1.6 * sc, 18, 14), mat('#f4f0e8', .5)); dome.scale.y = 1.2; dome.position.set(sx, 4.6 + sc, 0); g.add(dome);
        for (let st = 0; st < 4; st++) { const stripe = new T.Mesh(new T.TorusGeometry(1.6 * sc * Math.sin((st + 1) / 5 * Math.PI / 2), .035, 6, 20), mat('#2a2a2e', .8));
          stripe.rotation.x = Math.PI / 2; stripe.position.set(sx, 4.6 + sc + 1.6 * sc * 1.2 * Math.cos((st + 1) / 5 * Math.PI / 2) * .6, 0); g.add(stripe); }
        const fin = new T.Mesh(new T.ConeGeometry(.12, .7, 8), mat('#ffd700', .3)); fin.position.set(sx, 4.6 + sc + 1.6 * sc * 1.35, 0); g.add(fin); }
      for (const sx of [-4.6, 4.6]) { // striped minarets
        for (let seg = 0; seg < 5; seg++) { const ring = new T.Mesh(new T.CylinderGeometry(.5, .52, 2, 10), mat(seg % 2 ? '#f4f0e8' : '#a6402d', .8)); ring.position.set(sx, 1 + seg * 2, 0); g.add(ring); }
        const cap = new T.Mesh(new T.SphereGeometry(.65, 10, 8), mat('#f4f0e8', .5)); cap.position.set(sx, 10.6, 0); g.add(cap); }
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
      const f = new T.Mesh(new T.SphereGeometry(r, 12, 10), mat(pick(['#3a6b39', '#456f42', '#31603a']), .95)); f.position.set(dx, dy, dz); f.castShadow = true; g.add(f); }
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
  // parked old bicycles
  for (let i = 0; i < 26 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const b = buildBicycle(); b.position.set(p.x, 0, p.z); b.rotation.y = rand(0, TAU); b.rotation.z = rand(-.08, .08); scene.add(b); }
  // street lamps (solid poles)
  for (let i = 0; i < 60 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const pole = new T.Mesh(new T.CylinderGeometry(.08, .1, 5, 6), mat('#444')); pole.position.set(p.x, 2.5, p.z); pole.castShadow = true; scene.add(pole);
    const arm = new T.Mesh(boxGeo, mat('#444')); arm.scale.set(.9, .1, .1); arm.position.set(p.x + .4, 4.8, p.z); scene.add(arm);
    const lamp = new T.Mesh(new T.SphereGeometry(.2, 10, 8), new T.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffca6a', emissiveIntensity: 1.6, roughness: .4 })); lamp.position.set(p.x + .8, 4.7, p.z); scene.add(lamp);
    buildings.push({ x: p.x, z: p.z, hw: .35, hd: .35 }); }
}
function genDelhiWires() { // Chandni Chowk's black wire spaghetti (district 0 cell)
  const wireM = new T.MeshBasicMaterial({ color: '#141414' });
  let count = 0;
  for (let i = 0; i < 240 && count < 55; i++) {
    const x = rand(-HALF + 6, -HALF + CELL - 6), z = rand(-HALF + 6, -HALF + CELL - 6);
    if (!onRoad(x, z)) continue;
    const alongX = inX(x); // which axis the road runs on
    function inX(v) { const fv = ((v % STEP) + STEP) % STEP; return fv < ROADW; }
    const h1 = rand(5.5, 8), h2 = h1 + rand(-1, 1), sag = rand(.8, 1.6);
    for (let wv = 0; wv < 2 + (Math.random() < .5 ? 1 : 0); wv++) {
      const off = wv * .35, half = ROADW / 2 + SIDEW + .5;
      const a = alongX ? new T.Vector3(x - half, h1 + off * .4, z + off) : new T.Vector3(x + off, h1 + off * .4, z - half);
      const bp = alongX ? new T.Vector3(x + half, h2 + off * .4, z + off) : new T.Vector3(x + off, h2 + off * .4, z + half);
      const mid = a.clone().lerp(bp, .5); mid.y -= sag;
      const curve = new T.QuadraticBezierCurve3(a, mid, bp);
      const tube = new T.Mesh(new T.TubeGeometry(curve, 8, .025, 4), wireM); scene.add(tube);
    }
    count++;
  }
}
function roadSpot() { for (let i = 0; i < 24; i++) { const x = rand(-HALF, HALF), z = rand(-HALF, HALF); if (onRoad(x, z)) return { x, z }; } return null; }
function sidewalkSpot() { for (let i = 0; i < 60; i++) { const x = rand(-HALF + 4, HALF - 4), z = rand(-HALF + 4, HALF - 4); if (onSidewalk(x, z) && !blocked(x, z)) return { x, z }; } return null; }
const LANDMARK_CENTRES = [];
for (let i = 0; i < 9; i++) LANDMARK_CENTRES.push([((i % 3) - 1) * CELL, (((i / 3) | 0) - 1) * CELL]);
const landmarks = LANDMARK_CENTRES.map(([x, z], i) => ({ x, z, d: i }));
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
    const g = makeCharacter(o); g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU); scene.add(g);
    npcs.push({ g, dir: rand(0, TAU), speed: rand(.7, 1.5), turn: 0, down: 0, t: rand(0, 10), pause: 0 });
  }
}
// cows
const cows = [];
function spawnCows(n) {
  for (let i = 0; i < n; i++) { const p = roadSpot(); if (!p) continue;
    const g = new T.Group();
    const coat = pick(['#e8e2d0', '#d8cfc0', '#c9b8a0', '#b0987c', '#e0d8c8']);
    const cM = mat(coat, .92), dM = mat(shadeHex ? coat : coat, .92);
    // body: deep barrel chest tapering to hips (zebu)
    const body = new T.Mesh(new T.SphereGeometry(.62, 16, 12), cM); body.scale.set(.78, .82, 1.65); body.position.y = 1.02; g.add(body);
    // shoulder hump — the zebu signature
    const hump = new T.Mesh(new T.SphereGeometry(.3, 12, 10), cM); hump.scale.set(.7, .9, .8); hump.position.set(0, 1.52, .55); g.add(hump);
    // neck + head with muzzle
    const neck = new T.Mesh(new T.CylinderGeometry(.2, .26, .5, 10), cM); neck.rotation.x = -.7; neck.position.set(0, 1.32, .95); g.add(neck);
    const head = new T.Mesh(new T.SphereGeometry(.22, 12, 10), cM); head.scale.set(.8, .9, 1.15); head.position.set(0, 1.5, 1.22); g.add(head);
    const muzzle = new T.Mesh(new T.SphereGeometry(.13, 10, 8), mat('#8a7a6a', .8)); muzzle.scale.set(.9, .7, .9); muzzle.position.set(0, 1.4, 1.44); g.add(muzzle);
    // horns curving up-out
    for (const sx of [-1, 1]) { const horn = new T.Mesh(new T.ConeGeometry(.045, .42, 8), mat('#d8d0c0', .5));
      horn.position.set(.14 * sx, 1.72, 1.18); horn.rotation.z = -.7 * sx; horn.rotation.x = -.25; g.add(horn);
      const ear = new T.Mesh(new T.SphereGeometry(.09, 8, 6), cM); ear.scale.set(1.4, .5, .8); ear.position.set(.24 * sx, 1.56, 1.14); g.add(ear); }
    // dewlap (loose skin under the neck)
    const dewlap = new T.Mesh(new T.SphereGeometry(.16, 8, 8), cM); dewlap.scale.set(.5, 1.2, .9); dewlap.position.set(0, 1.0, 1.0); g.add(dewlap);
    // legs with hooves
    for (const [sx, sz] of [[-.26, .55], [.26, .55], [-.26, -.6], [.26, -.6]]) {
      const leg = new T.Mesh(new T.CylinderGeometry(.075, .06, .95, 8), cM); leg.position.set(sx, .48, sz); g.add(leg);
      const hoof = new T.Mesh(new T.CylinderGeometry(.07, .075, .09, 8), mat('#4a3a2c', .6)); hoof.position.set(sx, .05, sz); g.add(hoof); }
    // tail with dark tuft
    const tail = new T.Mesh(new T.CylinderGeometry(.03, .02, .85, 6), cM); tail.position.set(0, .95, -1.05); tail.rotation.x = .25; g.add(tail);
    const tuft = new T.Mesh(new T.SphereGeometry(.06, 6, 6), mat('#3a2f24', .9)); tuft.position.set(0, .52, -1.16); g.add(tuft);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU); scene.add(g);
    cows.push({ g, dir: rand(0, TAU), speed: rand(.25, .6), t: rand(0, 10) }); }
}

// ---------- Vehicle: auto-rickshaw ----------
function wheel(r, w) { const g = new T.Group();
  const tyre = new T.Mesh(new T.TorusGeometry(r * .72, r * .3, 10, 18), mat('#16161a', .95)); g.add(tyre);
  const hub = new T.Mesh(new T.CylinderGeometry(r * .42, r * .42, w, 12), new T.MeshStandardMaterial({ color: '#b9bec4', roughness: .35, metalness: .7 }));
  hub.rotation.x = Math.PI / 2; g.add(hub); g.rotation.y = Math.PI / 2; return g; }
function glassMat() { return new T.MeshStandardMaterial({ color: '#1c2b38', roughness: .12, metalness: .35 }); }
function chromeLight(warm) { return new T.MeshStandardMaterial({ color: warm ? '#ffdf9a' : '#ffffff', emissive: warm ? '#ffb84d' : '#dfe8ff', emissiveIntensity: .8, roughness: .2, metalness: .4 }); }
// classic Mumbai auto-rickshaw: rounded cowl, black+colour body, canvas hood
function buildAuto(color) {
  const g = new T.Group();
  const bodyM = mat(color, .55), blackM = mat('#1c1c20', .7);
  // tub
  const tub = new T.Mesh(new T.CylinderGeometry(.95, 1.0, .9, 18, 1, false, 0, Math.PI), blackM);
  tub.rotation.y = -Math.PI / 2; tub.scale.set(1, 1, 1.9); tub.position.set(0, .85, -.35); g.add(tub);
  const floor = new T.Mesh(new T.BoxGeometry(1.8, .5, 2.9), blackM); floor.position.set(0, .62, 0); g.add(floor);
  // rounded front cowl
  const cowl = new T.Mesh(new T.SphereGeometry(.85, 18, 14), bodyM); cowl.scale.set(1.02, .9, 1.15); cowl.position.set(0, 1.05, 1.15); g.add(cowl);
  // windshield
  const wsh = new T.Mesh(new T.CylinderGeometry(.8, .8, .75, 14, 1, true, -Math.PI * .32, Math.PI * .64), glassMat());
  wsh.rotation.y = Math.PI; wsh.position.set(0, 1.72, 1.05); g.add(wsh);
  // canvas hood (rounded half-cylinder)
  const hood = new T.Mesh(new T.CylinderGeometry(.92, .92, 2.0, 16, 1, false, 0, Math.PI), mat('#22221f', .95));
  hood.rotation.z = Math.PI / 2; hood.rotation.y = Math.PI / 2; hood.scale.set(1, 1, 1.05); hood.position.set(0, 1.78, -.45); g.add(hood);
  // colour skirt panels
  const skirt = new T.Mesh(new T.BoxGeometry(1.85, .5, 2.2), bodyM); skirt.position.set(0, 1.02, -.5); g.add(skirt);
  // headlight + meter
  const hl = new T.Mesh(new T.SphereGeometry(.13, 12, 10), chromeLight(true)); hl.position.set(0, 1.28, 1.98); g.add(hl);
  // wheels: 1 front, 2 rear
  const fw = wheel(.42, .22); fw.position.set(0, .42, 1.55); g.add(fw);
  for (const sx of [-.85, .85]) { const w = wheel(.42, .22); w.position.set(sx, .42, -1.05); g.add(w); }
  g.userData.seat = { x: 0, y: .55, z: .3 };
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// rounded passenger car: hatch / sedan / taxi / cop
function buildCar(kind, color) {
  const g = new T.Group();
  const col = kind === 'taxi' ? '#1a1a1c' : kind === 'cop' ? '#22334e' : color || pick(['#b8bcc2', '#8a2f28', '#2d4a6b', '#d8d5cc', '#5c6156', '#7d3b52']);
  const bodyM = mat(col, .42);
  const sedan = kind === 'sedan' || kind === 'taxi' || kind === 'cop';
  const L = sedan ? 4.4 : 3.7;
  // lower body with rounded nose/tail
  const body = new T.Mesh(new T.BoxGeometry(1.75, .62, L * .72), bodyM); body.position.set(0, .78, 0); g.add(body);
  const nose = new T.Mesh(new T.SphereGeometry(.62, 14, 10), bodyM); nose.scale.set(1.35, .52, 1.1); nose.position.set(0, .74, L * .36); g.add(nose);
  const tail = new T.Mesh(new T.SphereGeometry(.62, 14, 10), bodyM); tail.scale.set(1.35, .52, .9); tail.position.set(0, .76, -L * .36); g.add(tail);
  // cabin: rounded greenhouse
  const cab = new T.Mesh(new T.SphereGeometry(.95, 18, 12), glassMat()); cab.scale.set(.88, .62, sedan ? 1.25 : 1.05); cab.position.set(0, 1.35, -L * .04); g.add(cab);
  const roof = new T.Mesh(new T.SphereGeometry(.9, 18, 12), bodyM); roof.scale.set(.86, .3, sedan ? 1.2 : 1.0); roof.position.set(0, 1.62, -L * .04); g.add(roof);
  // lights + bumpers
  for (const sx of [-.55, .55]) { const hl = new T.Mesh(new T.SphereGeometry(.09, 10, 8), chromeLight(true)); hl.position.set(sx, .82, L * .46); g.add(hl);
    const tl = new T.Mesh(new T.BoxGeometry(.22, .1, .05), new T.MeshStandardMaterial({ color: '#a02020', emissive: '#901515', emissiveIntensity: .7 })); tl.position.set(sx, .82, -L * .455); g.add(tl); }
  const bump = new T.Mesh(new T.BoxGeometry(1.7, .16, .1), mat('#3a3d42', .5)); bump.position.set(0, .52, L * .46); g.add(bump);
  // wheels
  for (const [sx, sz] of [[-.85, L * .3], [.85, L * .3], [-.85, -L * .3], [.85, -L * .3]]) {
    const w = wheel(.44, .24); w.position.set(sx, .44, sz); g.add(w); }
  if (kind === 'taxi') { const sign = new T.Mesh(new T.BoxGeometry(.5, .18, .3), mat('#e8b820', .6)); sign.position.set(0, 1.9, -L * .04); g.add(sign);
    const yroof = new T.Mesh(new T.SphereGeometry(.9, 18, 12), mat('#e8b820', .5)); yroof.scale.set(.87, .31, 1.21); yroof.position.set(0, 1.63, -L * .04); g.add(yroof); }
  if (kind === 'cop') { const bar = new T.Mesh(new T.BoxGeometry(1.1, .14, .34), mat('#ff3b3b')); bar.position.set(0, 1.86, -L * .04); g.add(bar); g.userData.bar = bar; }
  g.userData.seat = { x: .38, y: .5, z: L * .06 }; // right-hand drive, like India
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// Royal Enfield Bullet: wire wheels, teardrop tank with gold pinstripe, round lamp, long exhaust
function buildEnfield() {
  const g = new T.Group();
  const black = mat('#141416', .5), chrome = new T.MeshStandardMaterial({ color: '#c8ccd2', roughness: .25, metalness: .85 });
  const wF = wheel(.5, .12); wF.position.set(0, .5, .95); g.add(wF);
  const wR = wheel(.5, .12); wR.position.set(0, .5, -.85); g.add(wR);
  const frame = new T.Mesh(new T.CylinderGeometry(.05, .05, 1.7, 8), black); frame.rotation.x = Math.PI / 2; frame.position.set(0, .78, 0); g.add(frame);
  const tank = new T.Mesh(new T.SphereGeometry(.3, 14, 10), mat(pick(['#1a1a1e', '#4a1518', '#1c3a2a']), .35)); tank.scale.set(.8, .7, 1.5); tank.position.set(0, 1.02, .3); g.add(tank);
  const stripe = new T.Mesh(new T.TorusGeometry(.28, .015, 6, 18), mat('#d4af37', .3)); stripe.rotation.y = Math.PI / 2; stripe.scale.set(1.4, .68, .8); stripe.position.set(0, 1.02, .3); g.add(stripe);
  const seat = new T.Mesh(new T.BoxGeometry(.34, .1, .7), black); seat.position.set(0, 1.05, -.4); g.add(seat);
  const engine = new T.Mesh(new T.BoxGeometry(.3, .35, .4), chrome); engine.position.set(0, .62, .15); g.add(engine);
  const pipe = new T.Mesh(new T.CylinderGeometry(.045, .055, 1.5, 8), chrome); pipe.rotation.x = Math.PI / 2 - .08; pipe.position.set(.16, .48, -.35); g.add(pipe);
  const bar = new T.Mesh(new T.CylinderGeometry(.03, .03, .72, 8), chrome); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.28, .82); g.add(bar);
  const lamp = new T.Mesh(new T.SphereGeometry(.13, 12, 10), chromeLight(true)); lamp.position.set(0, 1.18, 1.05); g.add(lamp);
  const fenderF = new T.Mesh(new T.CylinderGeometry(.56, .56, .14, 12, 1, false, Math.PI * .1, Math.PI * .55), chrome); fenderF.rotation.z = Math.PI / 2; fenderF.position.set(0, .5, .95); g.add(fenderF);
  g.userData.seat = { x: 0, y: .78, z: -.28 };
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// old Indian bicycle (roadster): parked prop
function buildBicycle() {
  const g = new T.Group(); const black = mat('#1c1c20', .6);
  for (const sz of [.62, -.62]) { const w = new T.Mesh(new T.TorusGeometry(.42, .028, 8, 20), black); w.rotation.y = Math.PI / 2; w.position.set(0, .42, sz); g.add(w); }
  const bar1 = new T.Mesh(new T.CylinderGeometry(.022, .022, 1.15, 6), black); bar1.rotation.x = Math.PI / 2; bar1.position.set(0, .78, 0); g.add(bar1);
  const bar2 = new T.Mesh(new T.CylinderGeometry(.022, .022, .8, 6), black); bar2.rotation.x = Math.PI / 4; bar2.position.set(0, .6, .3); g.add(bar2);
  const seatp = new T.Mesh(new T.BoxGeometry(.16, .06, .26), mat('#3a2a1a', .7)); seatp.position.set(0, .92, -.34); g.add(seatp);
  const hb = new T.Mesh(new T.CylinderGeometry(.02, .02, .5, 6), black); hb.rotation.z = Math.PI / 2; hb.position.set(0, .95, .58); g.add(hb);
  const basket = new T.Mesh(new T.BoxGeometry(.3, .2, .24), mat('#8a6b3a', .9)); basket.position.set(0, .8, .66); g.add(basket);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// stunt ramps (tremplins) on paved roads — drive up, fly off
const ramps = [];
function buildRamps() {
  const rM = mat('#b0561e', .85), sM = mat('#e8dcc4', .8);
  let placed = 0;
  for (let tries = 0; tries < 400 && placed < 6; tries++) {
    const p = roadSpot(); if (!p) continue;
    const kx = Math.round((p.x + HALF) / STEP), kz = Math.round((p.z + HALF) / STEP);
    // sit on a paved road, aligned with it
    const fx = ((p.x % STEP) + STEP) % STEP, alongZ = fx < ROADW && !dirtV.has(kx);
    const alongX = !alongZ && !dirtH.has(kz);
    if (!alongZ && !alongX) continue;
    const yaw = alongZ ? 0 : Math.PI / 2;
    const len = 11, w = 5.4, h = 3.4;
    const geo = new T.BufferGeometry();
    // wedge: rises from 0 at -len/2 to h at +len/2 (local +Z)
    const hw = w / 2, hl = len / 2;
    const verts = new Float32Array([
      -hw,0,-hl,  hw,0,-hl,  hw,h,hl,   -hw,0,-hl,  hw,h,hl,  -hw,h,hl,   // top slope
      -hw,0,hl,   hw,0,hl,   hw,h,hl,   -hw,0,hl,   hw,h,hl,  -hw,h,hl,   // back face
      -hw,0,-hl, -hw,0,hl,  -hw,h,hl,   hw,0,-hl,   hw,h,hl,   hw,0,hl,   // sides
    ]);
    geo.setAttribute('position', new T.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, rM); m.position.set(p.x, 0, p.z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    // warning stripes post
    const sign = new T.Mesh(new T.BoxGeometry(.6, 1.2, .1), sM); sign.position.set(p.x + (alongZ ? 3.2 : 0), .6, p.z + (alongZ ? 0 : 3.2)); scene.add(sign);
    ramps.push({ x: p.x, z: p.z, yaw, len, w, h });
    placed++;
  }
}
function rampHeightAt(x, z) {
  for (const r of ramps) {
    const dx = x - r.x, dz = z - r.z;
    const c = Math.cos(-r.yaw), s = Math.sin(-r.yaw);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) <= r.w / 2 && lz >= -r.len / 2 && lz <= r.len / 2) {
      return (lz + r.len / 2) / r.len * r.h;
    }
  }
  return 0;
}
const vehicles = [];
function spawnVehicles(n) {
  for (let i = 0; i < n; i++) { const p = roadSpot(); if (!p) continue;
    const r = Math.random();
    const g = r < .34 ? buildAuto(pick(['#f4c20d', '#207a4a', '#1a1a1e'])) :
              r < .52 ? buildCar('hatch') : r < .74 ? buildCar('sedan') : r < .88 ? buildCar('taxi') : buildEnfield();
    g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU);
    scene.add(g);
    const v = { g, yaw: g.rotation.y, speed: 0, ai: true, aiDir: rand(0, TAU), aiTimer: 0 };
    // some autos come with a visible driver you can hire (and haggle with)
    if (HERO && r < .6 && Math.random() < .55) {
      const o = { skin: pick(SKINS), turban: Math.random() < .5, turbanColor: pick(TURBANS),
        kurta: pick(KURTAS), dhoti: pick(DHOTIS), beard: pick(BEARDS), moustache: true };
      const d = makeHuman(o); const seat = g.userData.seat || { x: 0, y: .55, z: .3 };
      g.add(d); d.position.set(seat.x, seat.y, seat.z);
      if (d.userData.human) d.userData.human.seated = true;
      v.driver = { g: d, fare: randi(60, 150) };
    }
    vehicles.push(v); }
}

// ---------- Player ----------
const player = { g: null, pos: new T.Vector3(0, 0, 4), yaw: 0, vel: new T.Vector3(),
  health: 100, fuel: 100, cash: 500, inVehicle: null, moving: false, speed: 0 }; // pocket money for tickets & autos
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
  if (k === 'r' && player.inVehicle) { const st = Radio.switch(); toast('\ud83d\udcfb ' + st.name, '#8ef58e'); }
  if (k === 'm') toggleBigMap();
  if (k === 'e') { if (player.nego) acceptRide(); else tryVisit(); }
  if (k === 'n' && player.nego) haggle();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
// mouse drag to orbit
let dragging = false, lastX = 0, lastY = 0;
$('game').addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => { if (!dragging || !started) return;
  cam.yaw -= (e.clientX - lastX) * .006; cam.pitch = clamp(cam.pitch - (e.clientY - lastY) * .004, .12, 1.2);
  cam.freeUntil = performance.now() + 2600;
  lastX = e.clientX; lastY = e.clientY; });
addEventListener('click', e => { if (started && !dragging) { /* click punch on foot */ } });
// touch
const tHeld = {};
(function touch() {
  const bind = (id, fn, up) => { const el = $(id); if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); });
    if (up) el.addEventListener('touchend', e => { e.preventDefault(); up(); }); };
  bind('tAct', tryEnterExit); bind('tPunch', punch); bind('tSpit', spit);
  bind('tRadio', () => { if (player.inVehicle) { const st = Radio.switch(); toast('\ud83d\udcfb ' + st.name, '#8ef58e'); } });
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
function doorWorld(v) { const seat = v.g.userData.seat || { x: 0 };
  return new T.Vector3(seat.x >= 0 ? 1.6 : -1.6, 0, .3).applyQuaternion(v.g.quaternion).add(v.g.position); }
function tryEnterExit() {
  if (!started || player.transition) return; ensureAudio();
  if (player.inVehicle) { // step out at the door
    const v = player.inVehicle;
    Radio.setOn(false);
    const u = player.g.userData; if (u.human) u.human.seated = false;
    scene.add(player.g);
    const door = doorWorld(v);
    player.pos.set(door.x, 0, door.z); player.g.position.copy(player.pos);
    player.g.rotation.set(0, v.yaw + Math.PI / 2, 0); player.yaw = v.yaw + Math.PI / 2;
    player.inVehicle = null; v.ai = false;
    return;
  }
  let best = null, bd = 6 * 6;
  for (const v of vehicles) { const d = v.g.position.distanceToSquared(player.pos); if (d < bd) { bd = d; best = v; } }
  if (!best) return;
  if (best.driver) { // occupied auto: negotiate the fare
    player.nego = { veh: best, fare: best.driver.fare, tries: 0 };
    best.ai = false; best.speed = 0;
    return;
  }
  player.transition = { veh: best, t: 0 }; best.ai = false; best.speed = 0;
}
function acceptRide() {
  const n = player.nego; if (!n) return;
  if (player.cash < n.fare) { toast('Not enough cash (\u20b9' + n.fare + ')', '#ffd24d'); return; }
  const v = n.veh; player.nego = null;
  v.hired = true; v.fareDue = n.fare; v.ai = true;
  // hop in the back seat
  v.g.add(player.g); player.g.position.set(0, .6, -.85); player.g.rotation.set(0, 0, 0);
  const u = player.g.userData; if (u.human) u.human.seated = true;
  player.riding = v; player.rideT = 0; player.rideDur = rand(16, 26);
  Radio.setOn(true);
  toast('\ud83d\udee9 Chalo! \u20b9' + n.fare, '#8ef58e');
}
function haggle() {
  const n = player.nego; if (!n) return;
  n.tries++;
  if (n.tries <= 2 && Math.random() < .65) {
    n.fare = Math.max(30, Math.round(n.fare * rand(.6, .85)));
    n.veh.driver.fare = n.fare;
    toast('\u201cTheek hai\u2026 \u20b9' + n.fare + '\u201d', '#8ef58e');
  } else {
    toast('\u201cNahi nahi!\u201d \u2014 he drives off', '#ff9f43');
    n.veh.ai = true; player.nego = null;
  }
}
function endRide() {
  const v = player.riding; if (!v) return;
  player.cash = Math.max(0, player.cash - (v.fareDue || 0));
  scene.add(player.g);
  const door = doorWorld(v);
  player.pos.set(door.x, 0, door.z); player.g.position.copy(player.pos);
  player.g.rotation.set(0, v.yaw + Math.PI / 2, 0);
  const u = player.g.userData; if (u.human) u.human.seated = false;
  player.riding = null; v.hired = false;
  Radio.setOn(false);
  toast('Pahunch gaye! \u2212\u20b9' + (v.fareDue || 0), '#8ef58e');
}
function updateTransition(dt) {
  const tr = player.transition, v = tr.veh; tr.t += dt;
  const door = doorWorld(v);
  const d = Math.hypot(door.x - player.pos.x, door.z - player.pos.z);
  if (d > .3 && tr.t < 1.4) { // walk to the door
    const ang = Math.atan2(door.x - player.pos.x, door.z - player.pos.z);
    player.yaw = ang; const spd = 3.4;
    player.pos.x += Math.sin(ang) * spd * dt; player.pos.z += Math.cos(ang) * spd * dt;
    player.g.position.copy(player.pos); player.g.rotation.y = ang;
    animateChar(player.g, true, dt, spd);
  } else { // slide in and sit at the wheel
    const seat = v.g.userData.seat || { x: 0, y: .55, z: .3 };
    player.inVehicle = v; player.transition = null;
    v.g.add(player.g); player.g.position.set(seat.x, seat.y, seat.z); player.g.rotation.set(0, 0, 0);
    const u = player.g.userData; if (u.human) u.human.seated = true;
    player.yaw = v.yaw;
    Radio.setOn(true); toast('📻 ' + Radio.stations[Radio.idx].name, '#8ef58e');
  }
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
  const g = buildCar('cop');
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
function AudioSysCrash() { if (!actx) return; const t = actx.currentTime, b = actx.createBufferSource(), buf = actx.createBuffer(1, 4410, 44100), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const g = actx.createGain(); g.gain.value = .25; b.buffer = buf; b.connect(g); g.connect(amaster); b.start(t); }
function blip(f, d, ty, v) { if (!actx) return; const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.type = ty || 'square'; o.frequency.value = f; g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(amaster); o.start(t); o.stop(t + d); }
function cashSnd() { blip(880, .08, 'sine', .3); setTimeout(() => blip(1320, .12, 'sine', .3), 70); }
function siren(on) { if (!actx) return; if (on && !sirenNode) { const o = actx.createOscillator(), g = actx.createGain(), lfo = actx.createOscillator(), lg = actx.createGain(); o.type = 'sine'; o.frequency.value = 700; lfo.frequency.value = 2; lg.gain.value = 250; lfo.connect(lg); lg.connect(o.frequency); g.gain.value = .04; o.connect(g); g.connect(amaster); o.start(); lfo.start(); sirenNode = { o, lfo }; } else if (!on && sirenNode) { try { sirenNode.o.stop(); sirenNode.lfo.stop(); } catch (e) {} sirenNode = null; } }

// ---------- Monuments: tickets + guided tours with real history ----------
const MONUMENTS = [
  { name: 'Jama Masjid', facts: [
    'Jama Masjid was built by Mughal emperor Shah Jahan between 1644 and 1656 \u2014 one of the largest mosques in India.',
    'Its great courtyard can hold around 25,000 worshippers at a single prayer.',
    'The three marble domes carry thin black stripes; the 40 m minarets alternate red sandstone and white marble.'] },
  { name: 'Film City', facts: [
    'Mumbai\u2019s Hindi film industry \u2014 Bollywood \u2014 releases more films every year than Hollywood.',
    'Dadasaheb Phalke shot India\u2019s first full-length feature, Raja Harishchandra, in 1913.',
    'The black-and-yellow kaali-peeli taxi and the dabbawala lunchbox network are Mumbai street icons.'] },
  { name: 'Mehrangarh Fort', facts: [
    'Mehrangarh was begun around 1459 by Rao Jodha, founder of Jodhpur.',
    'Its walls rise straight from a 120-metre cliff \u2014 among the most imposing forts in India.',
    'Below it spreads the Blue City: houses washed in indigo to stay cool and mark heritage.'] },
  { name: 'The Ghats of Kashi', facts: [
    'Varanasi\u2019s riverfront strings together some 88 ghats along the Ganga.',
    'Every dusk, priests perform the Ganga Aarti with fire lamps at Dashashwamedh Ghat.',
    'Kashi is counted among the oldest continuously inhabited cities on Earth.'] },
  { name: 'Harmandir Sahib', facts: [
    'The Golden Temple was completed in 1604 under Guru Arjan, the fifth Sikh Guru.',
    'Maharaja Ranjit Singh gilded the shrine with gold in the early 1800s.',
    'Its langar kitchen serves free meals to as many as 100,000 visitors a day, all seated as equals.'] },
  { name: 'St. Francis Church', facts: [
    'Built in 1503 in Kochi, this is the oldest European church in India.',
    'Vasco da Gama died in Kochi in 1524 and was first buried here.',
    'Kerala\u2019s spice coast traded with Rome and Arabia centuries before Europe\u2019s sea route.'] },
  { name: 'Howrah Bridge', facts: [
    'Opened in 1943, the 705-metre cantilever was riveted together \u2014 no nuts or bolts.',
    'It carries roughly 100,000 vehicles and countless pedestrians every day.',
    'It was renamed Rabindra Setu after the poet Rabindranath Tagore.'] },
  { name: 'Kapaleeshwarar Temple', facts: [
    'A Dravidian temple with roots in the 7th century, rebuilt in the 16th after coastal erosion.',
    'Its gopuram tower rises about 37 metres, crusted with painted stucco gods.',
    'Outside, look for kolam patterns \u2014 rice-flour designs drawn fresh each dawn.'] },
  { name: 'Basilica of Bom Jesus', facts: [
    'Completed in 1605 in Old Goa \u2014 a UNESCO World Heritage church.',
    'It keeps the remains of St. Francis Xavier, displayed once every ten years.',
    'Unusually, its red laterite body was left unplastered \u2014 the one great church that isn\u2019t white.'] },
];
let tour = null; // { d, i, next, guided }
function tryVisit() {
  if (!started || player.inVehicle || player.riding || tour) return;
  for (const l of landmarks) {
    if ((l.x - player.pos.x) ** 2 + (l.z - player.pos.z) ** 2 > 18 * 18) continue;
    const M = MONUMENTS[l.d];
    if (player.cash >= 90) { player.cash -= 90; tour = { d: l.d, i: 0, next: 0, guided: true };
      toast('\ud83c\udfab Ticket + guide \u2212\u20b990', '#8ef58e'); }
    else if (player.cash >= 50) { player.cash -= 50; tour = { d: l.d, i: 0, next: 0, guided: false };
      toast('\ud83c\udfab Ticket \u2212\u20b950', '#8ef58e'); }
    else toast('Need \u20b950 for a ticket', '#ffd24d');
    return;
  }
}
function updateTour(dt, now) {
  if (!tour) return;
  if (now >= tour.next) {
    const M = MONUMENTS[tour.d];
    showBanner((tour.guided ? '\ud83e\uddd4 Guide \u00b7 ' : '') + M.name, M.facts[tour.i]);
    tour.i++; tour.next = now + 7000;
    if (tour.i >= (tour.guided ? M.facts.length : 1)) { tour = null; }
  }
}
// ---------- Desi FM: generative radio (offline, three stations) ----------

const Radio = {
  idx: 0, on: false, nextT: 0, step: 0, bus: null,
  stations: [
    { name: 'Bhangra Beats 98.3', root: 196, scale: [0, 2, 4, 5, 7, 9, 10], bpm: 122, style: 0 },
    { name: 'Filmi Gold 91.1', root: 220, scale: [0, 2, 3, 7, 8], bpm: 82, style: 1 },
    { name: 'Chennai Express 104.8', root: 233.08, scale: [0, 2, 4, 7, 11], bpm: 104, style: 2 },
  ],
  ensure() { if (this.bus || !actx) return;
    const g = actx.createGain(); g.gain.value = 0;
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = .5;
    g.connect(bp); bp.connect(amaster); this.bus = g; },
  setOn(v) { ensureAudio(); this.ensure(); if (!this.bus) return; this.on = v;
    this.bus.gain.setTargetAtTime(v ? .5 : 0, actx.currentTime, .25);
    if (v) { this.nextT = actx.currentTime + .1; this.step = 0; } },
  switch() { this.idx = (this.idx + 1) % this.stations.length; this.static_(); this.step = 0; return this.stations[this.idx]; },
  static_() { if (!this.bus) return; const t = actx.currentTime, b = actx.createBufferSource(), buf = actx.createBuffer(1, 6600, 44100), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * .45 * (1 - i / d.length);
    b.buffer = buf; b.connect(this.bus); b.start(t); },
  osc(t, f, dur, type, vol, slideTo) { const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.setTargetAtTime(slideTo, t + dur * .3, dur * .2);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + .05); },
  drum(t, f, vol, snare) { const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 2.2, t); o.frequency.exponentialRampToValueAtTime(f, t + .07);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + (snare ? .09 : .16));
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + .25);
    if (snare) { const b = actx.createBufferSource(), buf = actx.createBuffer(1, 3000, 44100), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const g2 = actx.createGain(); g2.gain.value = vol * .5; b.buffer = buf; b.connect(g2); g2.connect(this.bus); b.start(t); } },
  tick() { if (!this.on || !actx || !this.bus) return;
    const st = this.stations[this.idx], s16 = 60 / st.bpm / 4;
    while (this.nextT < actx.currentTime + .3) {
      const t = this.nextT, i = this.step;
      if (st.style === 0) { // dhol-driven bhangra
        if (i % 8 === 0) this.drum(t, 62, .5); if (i % 8 === 4) this.drum(t, 190, .3, true);
        if (i % 4 === 2) this.drum(t, 62, .2); if (i % 2 === 0) this.osc(t, 2400, .03, 'square', .035); }
      else if (st.style === 1) { // slow filmi ballad
        if (i % 16 === 0) this.drum(t, 56, .38); if (i % 16 === 8) this.drum(t, 170, .2, true); if (i % 16 === 12) this.drum(t, 62, .18); }
      else { // carnatic-flavoured groove
        if ([0, 3, 6, 10, 12].includes(i % 16)) this.drum(t, 88, .28); if (i % 16 === 8) this.drum(t, 200, .2, true); }
      if (i % 32 === 0) { this.osc(t, st.root / 2, s16 * 30, 'sawtooth', .045); this.osc(t, st.root * .75, s16 * 30, 'sawtooth', .025); } // tanpura drone
      if ([0, 3, 6, 8, 11, 14].includes(i % 16) && Math.random() < .85) { // melody, filmi slides
        const deg = pick(st.scale), oct = Math.random() < .3 ? 2 : 1;
        const f = st.root * Math.pow(2, deg / 12) * oct;
        const slide = st.style === 1 && Math.random() < .5 ? f * Math.pow(2, pick([-2, -1, 1, 2]) / 12) : 0;
        this.osc(t, f, s16 * (st.style === 1 ? 3.4 : 1.8), st.style === 2 ? 'triangle' : 'sawtooth', .06, slide); }
      this.nextT += s16; this.step = (this.step + 1) % 64;
    } }
};
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

  if (player.riding) { // passenger in a hired auto
    const v = player.riding;
    player.pos.copy(v.g.position); player.speed = v.speed || 0;
    player.rideT += dt;
    animateChar(player.g, false, dt, 0);
    if (player.rideT >= player.rideDur) endRide();
  }
  else if (player.transition) updateTransition(dt);
  else if (player.inVehicle) updateDrive(dt, f, s);
  else updateFoot(dt, f, s);
  // negotiation: sticky prompt, cancels if you walk away
  if (player.nego) {
    const n = player.nego, d2 = n.veh.g.position.distanceToSquared(player.pos);
    if (d2 > 9 * 9) { n.veh.ai = true; player.nego = null; }
    else hint('\ud83d\udee9 Auto-wala asks \u20b9' + n.fare + ' \u2014 E hop in \u00b7 N haggle');
  }
  updateTour(dt, performance.now());

  updateNPCs(dt); updateCows(dt); updateVehicles(dt); updateCops(dt);
  Radio.tick();
  updateParticles(dt);

  // district banner
  const di = districtAt(player.pos.x, player.pos.z);
  if (di !== curDistrict) { curDistrict = di; $('distName').textContent = DISTRICTS[di].name; showBanner(DISTRICTS[di].greet, DISTRICTS[di].fact); }

  // sun follows player so shadows stay crisp
  if (sun) { sun.position.set(player.pos.x + 36, 48, player.pos.z + 20); sun.target.position.copy(player.pos); sun.target.updateMatrixWorld(); }
  // camera follow
  const target = player.inVehicle ? player.inVehicle.g.position : player.pos;
  const cd = player.inVehicle ? 10 : cam.dist;
  let cdArr = cd; const cdMin = player.inVehicle ? 5.2 : 2.6;
  for (; cdArr > cdMin; cdArr -= .8) { // camera collision: step in until clear of buildings
    const tx = target.x - Math.sin(cam.yaw) * Math.cos(cam.pitch) * cdArr;
    const tz = target.z - Math.cos(cam.yaw) * Math.cos(cam.pitch) * cdArr;
    if (!blocked(tx, tz)) break;
  }
  const cx = target.x - Math.sin(cam.yaw) * Math.cos(cam.pitch) * cdArr;
  const cz = target.z - Math.cos(cam.yaw) * Math.cos(cam.pitch) * cdArr;
  const cy = target.y + Math.sin(cam.pitch) * cdArr + 1.0;
  camera.position.lerp(new T.Vector3(cx, cy, cz), .25);
  camera.lookAt(target.x, target.y + 1.7, target.z);

  // regen
  if (player.combo) player.combo.t = Math.max(0, player.combo.t - dt);
  if (wanted === 0 && player.health < 100) player.health = clamp(player.health + dt * 2, 0, 100);
  if (!player.inVehicle) player.fuel = clamp(player.fuel + dt * 3, 0, 100);
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; }
  if (!player.inVehicle && !player.riding && !player.nego) {
    let hinted = false;
    for (const l of landmarks) { if ((l.x - player.pos.x) ** 2 + (l.z - player.pos.z) ** 2 < 18 * 18 && !tour) {
      hint('\ud83c\udfdb ' + MONUMENTS[l.d].name + ' \u2014 E: visit \u20b950 \u00b7 guide \u20b990'); hinted = true; break; } }
    if (!hinted) for (const v of vehicles) if (v.g.position.distanceToSquared(player.pos) < 25) {
      hint(v.driver ? 'F \u2014 hail this auto (driver inside)' : 'Press F to drive \u00b7 J punch \u00b7 T paan-spit'); break; }
  }

  updateHUD(); drawMinimap3d();
}
function updateFoot(dt, f, s) {
  player.g.visible = true;
  const mag = Math.min(1, Math.hypot(f, s));
  let dx = 0, dz = 0;
  if (mag > .12) { const ang = cam.yaw; dx = Math.sin(ang) * f - Math.cos(ang) * s; dz = Math.cos(ang) * f + Math.sin(ang) * s;
    const l = Math.hypot(dx, dz); dx /= l; dz /= l; }
  const sprint = keys['shift'] ? 1.7 : 1, spd = 3.4 * sprint * mag;
  player.moving = mag > .12; player.speed = player.moving ? spd : 0;
  if (player.moving) { player.yaw = angLerp(player.yaw, Math.atan2(dx, dz), Math.min(1, dt * 9));
    const nx = player.pos.x + dx * spd * dt, nz = player.pos.z + dz * spd * dt;
    if (!blocked(nx, player.pos.z)) player.pos.x = nx; if (!blocked(player.pos.x, nz)) player.pos.z = nz; }
  const atk = player.g.userData.attack;
  if (atk && atk.t > .55 && !player.moving) { // step into the strike
    const lx = player.pos.x + Math.sin(player.yaw) * 2.4 * dt, lz = player.pos.z + Math.cos(player.yaw) * 2.4 * dt;
    if (!blocked(lx, lz)) { player.pos.x = lx; player.pos.z = lz; }
  }
  player.g.position.copy(player.pos); player.g.rotation.y = player.yaw;
  animateChar(player.g, player.moving, dt, 3.4 * sprint);
}
function updateDrive(dt, f, s) {
  const v = player.inVehicle;
  if (player.fuel <= 0) v.speed *= .96;
  else v.speed += f * dt * 14;
  v.speed *= .985; v.speed = clamp(v.speed, -8, 20);
  if (Math.abs(v.speed) > .2) { const damp = clamp(1 - Math.abs(v.speed) / 34, .5, 1); v.yaw -= s * dt * 0.75 * damp * Math.sign(v.speed) * clamp(Math.abs(v.speed) / 5, .3, 1); }
  const nx = v.g.position.x + Math.sin(v.yaw) * v.speed * dt, nz = v.g.position.z + Math.cos(v.yaw) * v.speed * dt;
  if (!blocked(nx, v.g.position.z)) v.g.position.x = nx; else v.speed *= -.3;
  if (!blocked(v.g.position.x, nz)) v.g.position.z = nz; else v.speed *= -.3;
  // ramps & air time
  v.y = v.y || 0; v.vy = v.vy || 0;
  const gy = rampHeightAt(v.g.position.x, v.g.position.z);
  if (v.y <= gy + .06 && v.vy <= 0) { // grounded (road or ramp surface)
    if (v.y < gy - .01 && Math.abs(v.speed) > 1) { /* riding up */ }
    v.vy = (gy - v.y) > .4 && Math.abs(v.speed) > 8 ? Math.abs(v.speed) * .16 : 0; // pop at the lip
    v.y = gy;
  } else { // airborne
    v.vy -= 22 * dt; v.y += v.vy * dt;
    if (v.y <= gy) { v.y = gy; if (v.vy < -7) { damage(6); AudioSysCrash(); } v.vy = 0; }
  }
  v.g.position.y = v.y;
  v.g.rotation.y = v.yaw; player.pos.copy(v.g.position);
  if (Math.abs(v.speed) > .1) player.fuel = clamp(player.fuel - Math.abs(v.speed) * dt * .05, 0, 100);
  player.speed = v.speed; if (!(cam.freeUntil > performance.now())) cam.yaw = angLerp(cam.yaw, v.yaw, .05);
  animateChar(player.g, false, dt, 0); // seated driving pose
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
  if (n.pause > 0) { n.pause -= dt; animateChar(n.g, false, dt, 0); continue; }
  if (Math.random() < .003) { n.pause = rand(1.5, 5); animateChar(n.g, false, dt, 0); continue; }
  wanderMesh(n, dt); animateChar(n.g, true, dt, n.speed * 2.4); } }
function updateCows(dt) { for (const c of cows) wanderMesh(c, dt); }
let honkNext = 0;
function updateVehicles(dt) {
  // India runs on the horn: nearby traffic honks at random
  if (actx && performance.now() > honkNext) { honkNext = performance.now() + rand(1800, 5200);
    const near = vehicles.filter(v => v.ai && v.g.position.distanceToSquared(player.pos) < 55 * 55);
    if (near.length && Math.random() < .75) { const f = rand(300, 520);
      blip(f, .18, 'sawtooth', .05); setTimeout(() => blip(f * .92, .22, 'sawtooth', .05), rand(90, 200)); } }
  for (const v of vehicles) { if (v.driver && v.g.position.distanceToSquared(player.pos) < 70 * 70) animateChar(v.driver.g, false, dt, 0); }
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
  else { if (started) update(dt); if (composer) composer.render(); else renderer.render(scene, camera); } }

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
function rebuildPreview() { if (pChar) pScene.remove(pChar); pChar = makeCharacter(opts); pChar.scale.setScalar(HERO ? 0.62 : 0.6); pChar.rotation.y = previewYaw; pScene.add(pChar); }
function updatePreview(dt) { if (previewSpin && pChar) { previewYaw += dt * .6; pChar.rotation.y = previewYaw; } if (pChar) animateChar(pChar, false, dt, 0); }

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
  swatchRow('swScarf', KURTAS, () => opts.scarf, v => opts.scarf = v);
  chipRow('chShades', [{ t: '\ud83d\udd76 Shades on', v: true }, { t: 'No shades', v: false }], () => opts.shades, v => opts.shades = v);
  chipRow('chHand', [{ t: '\ud83d\udd90 Right-handed \u2014 stick right', v: 'right' }, { t: 'Left-handed \u2014 stick left', v: 'left' }], () => settings.hand, v => { settings.hand = v; applyHand(); });
  $('nameIn').addEventListener('input', e => opts.name = e.target.value || 'Raja');
  $('enterBtn').addEventListener('click', startGame);
}

// ---------- Start ----------
function startGame() {
  ensureAudio();
  previewOn = false;
  $('creator').style.display = 'none'; $('hud').style.display = 'block';
  $('joystick').classList.add('on'); $('touch').classList.add('on'); $('minimap3d').classList.add('on');
  $('minimap3d').style.pointerEvents = 'auto'; $('minimap3d').addEventListener('click', toggleBigMap);
  $('bigmap').addEventListener('click', toggleBigMap);
  applyHand();
  $('controls').innerHTML = '<b>Thumbstick</b> / WASD move · <b>drag</b> look<br><b>F</b> drive · <b>J</b> fight · <b>T</b> spit · <b>B</b> bribe · <b>R</b> radio · <b>M</b> map';
  // build player from chosen opts
  player.pos.copy(findSpawn());
  player.g = makeCharacter(opts); player.g.position.copy(player.pos); scene.add(player.g);
  spawnNPCs(24); spawnCows(8); spawnVehicles(16);
  started = true;
  toast('नमस्ते, ' + opts.name + '!', '#ff9933');
}

// ---------- GTA-style minimap ----------
let mapCanvas = null;
function prerenderMap() {
  const S = 1024; mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = S;
  const g = mapCanvas.getContext('2d');
  for (let i = 0; i < 9; i++) { const mx = i % 3, mz = (i / 3) | 0;
    g.fillStyle = mute(DISTRICTS[i].ground, .15); g.fillRect(mx * S / 3, mz * S / 3, S / 3 + 1, S / 3 + 1); }
  const u = w => w / WORLD * S, px = v => (v + HALF) / WORLD * S;
  g.fillStyle = '#3f4046';
  for (let v = -HALF; v <= HALF; v += STEP) { g.fillRect(px(v), 0, u(ROADW), S); g.fillRect(0, px(v), S, u(ROADW)); }
  g.fillStyle = '#f2ede2';
  for (let i = 0; i < 9; i++) { const mx = i % 3, mz = (i / 3) | 0;
    g.beginPath(); g.arc((mx + .5) * S / 3, (mz + .5) * S / 3, 7, 0, TAU); g.fill(); }
}
function drawMinimap3d() {
  const cv = $('minimap3d'); if (!cv || !mapCanvas) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  g.save();
  g.beginPath(); if (g.roundRect) g.roundRect(0, 0, W, H, 22); else g.rect(0, 0, W, H); g.clip();
  g.fillStyle = '#101014'; g.fillRect(0, 0, W, H);
  const scale = 2.1, mx = (player.pos.x + HALF) / WORLD * 1024, mz = (player.pos.z + HALF) / WORLD * 1024;
  g.translate(W / 2, H / 2 + 20); g.rotate(cam.yaw); g.scale(scale, scale); g.translate(-mx, -mz);
  g.drawImage(mapCanvas, 0, 0);
  g.fillStyle = '#4a86ff';
  for (const c of cops) { const cx2 = (c.g.position.x + HALF) / WORLD * 1024, cz2 = (c.g.position.z + HALF) / WORLD * 1024;
    g.beginPath(); g.arc(cx2, cz2, 2.4, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(240,240,240,.75)';
  for (const v of vehicles) { if (v.g.position.distanceToSquared(player.pos) > 90 * 90) continue;
    const vx2 = (v.g.position.x + HALF) / WORLD * 1024, vz2 = (v.g.position.z + HALF) / WORLD * 1024;
    g.beginPath(); g.arc(vx2, vz2, 1.6, 0, TAU); g.fill(); }
  g.restore();
  g.save(); g.translate(W / 2, H / 2 + 20);
  g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -9); g.lineTo(6.5, 7); g.lineTo(0, 3.5); g.lineTo(-6.5, 7); g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.fillStyle = 'rgba(16,16,20,.72)'; g.fillRect(0, 0, W, 30);
  g.fillStyle = '#fff'; g.font = '700 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(DISTRICTS[curDistrict >= 0 ? curDistrict : 4].name, W / 2, 15);
}
function drawBigMap() {
  const cv = $('bigmapcv'); if (!cv || !mapCanvas) return;
  const g = cv.getContext('2d'), S = cv.width;
  g.clearRect(0, 0, S, S);
  g.drawImage(mapCanvas, 0, 0, S, S);
  g.font = '700 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 9; i++) { const mx = i % 3, mz = (i / 3) | 0;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(DISTRICTS[i].name, (mx + .5) * S / 3 + 1, (mz + .5) * S / 3 + 29);
    g.fillStyle = '#fff'; g.fillText(DISTRICTS[i].name, (mx + .5) * S / 3, (mz + .5) * S / 3 + 28);
    g.fillStyle = '#ffd700'; g.beginPath(); g.arc((mx + .5) * S / 3, (mz + .5) * S / 3, 9, 0, TAU); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke(); }
  // player
  const pxp = (player.pos.x + HALF) / WORLD * S, pzp = (player.pos.z + HALF) / WORLD * S;
  g.save(); g.translate(pxp, pzp); g.rotate(cam.yaw ? -0 : 0); g.rotate(player.yaw);
  g.fillStyle = '#ff4d4d'; g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -16); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
function toggleBigMap() { if (!started) return; const el = $('bigmap'); el.classList.toggle('on'); if (el.classList.contains('on')) drawBigMap(); }
// ---------- Boot ----------
function boot() {
  if (T.ColorManagement) T.ColorManagement.enabled = true;
  initThree(); buildCity(); initPreview(); wireCreator(); applyHand();
  $('loading').classList.add('hide');
  // load the rigged human; the creator shows the procedural fallback until ready
  const btn = $('enterBtn'); btn.disabled = true; btn.textContent = 'Loading your Raja…';
  const enable = () => { btn.disabled = false; btn.textContent = '▶ Enter the City'; };
  const failsafe = setTimeout(enable, 7000);
  loadHero(h => { clearTimeout(failsafe); if (h) HERO = h; enable(); rebuildPreview(); });
  window.__tp = (x, z) => { player.pos.set(x, 0, z); if (player.inVehicle) { player.inVehicle.g.position.set(x, 0, z); } };
  window.__tpveh = () => { if (!vehicles.length) return false; const v = vehicles[0];
    player.pos.set(v.g.position.x + 2.2, 0, v.g.position.z); if (player.g) player.g.position.copy(player.pos); return true; };
  window.__tpdriver = () => { const v = vehicles.find(v2 => v2.driver); if (!v) return false;
    player.pos.set(v.g.position.x + 2.2, 0, v.g.position.z); if (player.g) player.g.position.copy(player.pos); return true; };
  window.__state = () => ({ nego: !!player.nego, fare: player.nego ? player.nego.fare : -1, riding: !!player.riding, cash: player.cash });
  window.__facefront = () => { previewSpin = false; if (pChar) pChar.rotation.y = 0; };
  window.__facezoom = (y) => { previewSpin = false; if (pChar) pChar.rotation.y = 0; pCam.position.set(0, y, 1.25); pCam.lookAt(0, y, 0); };
  window.__dbg = () => ({ cam: camera.position.toArray().map(v => +v.toFixed(2)),
    rotX: +camera.rotation.x.toFixed(3), player: player.pos.toArray().map(v => +v.toFixed(2)),
    pitch: cam.pitch, yaw: cam.yaw, inV: !!player.inVehicle,
    trans: !!player.transition, trT: player.transition ? +player.transition.t.toFixed(2) : -1,
    trD: player.transition ? +Math.hypot(doorWorld(player.transition.veh).x - player.pos.x, doorWorld(player.transition.veh).z - player.pos.z).toFixed(2) : -1,
    nvd: vehicles.length ? Math.sqrt(vehicles[0].g.position.distanceToSquared(player.pos)).toFixed(1) : -1 });
  frame();
}
if (window.THREE) boot(); else { $('loading').textContent = 'Failed to load 3D engine.'; }

})();
