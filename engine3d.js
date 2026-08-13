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
const opts = { name:'Raja Bahadur', skin:'#c68642', turban:true, turbanColor:'#ff9933', shades:false, scarf:'#c0392b', outfit:'sherwani',
  kurta:'#ff9933', dhoti:'#ffffff', beard:'full', moustache:true, hair:'crop', hairColor:'#15100b' };
const HAIRS = [['crop','Court'],['part','Raie'],['jura','Jura (chignon)'],['long','Long'],['curly','Bouclé']];
const HAIRCOLS = ['#0d0a08','#15100b','#2b1a10','#4a2f18','#6a6a6a'];
// comfort first, GTA-style: horns, city ambience and SFX each have their own switch
let ambGain = null;
const sndCfg = (() => { try { return Object.assign({ horns: true, amb: true, sfx: true }, JSON.parse(localStorage.getItem('sk_snd') || '{}')); } catch (e) { return { horns: true, amb: true, sfx: true }; } })();
function saveSnd() { try { localStorage.setItem('sk_snd', JSON.stringify(sndCfg)); } catch (e) {} if (ambGain) ambGain.gain.value = sndCfg.amb ? .05 : 0; }

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
    prof.push(new T.Vector2(0.001, 0.150));
    prof.push(new T.Vector2(0.065, 0.145));
    prof.push(new T.Vector2(0.118, 0.112));
    prof.push(new T.Vector2(0.142, 0.066));
    prof.push(new T.Vector2(0.140, 0.020));
    prof.push(new T.Vector2(0.128, -0.024));
    prof.push(new T.Vector2(0.108, -0.062));
    const pag = new T.Mesh(new T.LatheGeometry(prof, 28), tM); pag.position.y = ACC.turbY - 0.035; g.add(pag);
    // under-wrap dome: fills every gap between the lathe folds and the scalp — no skull peeking through
    const cap = new T.Mesh(new T.SphereGeometry(0.104, 20, 16), tM);
    cap.scale.set(1.04, .92, 1.06); cap.position.y = ACC.turbY - 0.052; g.add(cap);
    // front band across the brow
    const band = new T.Mesh(new T.TorusGeometry(0.103, 0.02, 10, 26), tM); band.rotation.x = Math.PI / 2;
    band.position.y = ACC.turbY - 0.062; band.scale.set(1, 1, 1.05); g.add(band);
    const jewel = new T.Mesh(new T.SphereGeometry(0.018, 12, 12), mat('#ffd700', .2)); jewel.position.set(0, ACC.turbY + 0.015, 0.125); g.add(jewel);
  }
  else if (o.hair && o.hair !== 'none') { // Indian hairstyles (shown when no pagdi)
    const hM = mat(o.hairColor || '#15100b', .92);
    const cap = new T.Mesh(new T.SphereGeometry(0.1, 18, 14), hM);
    cap.scale.set(1.0, .82, 1.0); cap.position.set(0, ACC.turbY - 0.038, -0.008); g.add(cap);
    if (o.hair === 'part') { // side-parted quiff, oiled and combed
      const quiff = new T.Mesh(new T.SphereGeometry(0.055, 12, 10), hM);
      quiff.scale.set(1.5, .55, .9); quiff.position.set(0.02, ACC.turbY + 0.008, 0.055); quiff.rotation.z = -.18; g.add(quiff);
    } else if (o.hair === 'jura') { // top-knot bun
      const bun = new T.Mesh(new T.SphereGeometry(0.042, 12, 10), hM);
      bun.position.set(0, ACC.turbY + 0.045, -0.02); g.add(bun);
    } else if (o.hair === 'bun') { // low bun at the nape, parted on top
      const bun = new T.Mesh(new T.SphereGeometry(0.05, 12, 10), hM);
      bun.position.set(0, ACC.turbY - 0.1, -0.095); g.add(bun);
    } else if (o.hair === 'long') { // shoulder-length, swept back
      const back = new T.Mesh(new T.SphereGeometry(0.085, 14, 12), hM);
      back.scale.set(1.02, 1.9, .62); back.position.set(0, ACC.turbY - 0.145, -0.062); g.add(back);
    } else if (o.hair === 'curly') { // tight curls: clustered knots over the cap
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, rr = .07;
        const c = new T.Mesh(new T.SphereGeometry(rand(.024, .036), 8, 6), hM);
        c.position.set(Math.cos(a) * rr * rand(.5, 1), ACC.turbY - 0.03 + rand(-.02, .035), Math.sin(a) * rr * rand(.4, .9) - .01); g.add(c); }
    }
  }
  if (o.shades) { // this avatar has no glasses mesh — build proper sunglasses
    const dark = new T.MeshStandardMaterial({ color: '#0c0c10', roughness: .15, metalness: .3 });
    for (const sx of [-1, 1]) { const lens = new T.Mesh(new T.SphereGeometry(.052, 10, 8), dark);
      lens.scale.set(1, .8, .45); lens.position.set(.055 * sx, .012, .105); g.add(lens); }
    const bridge = new T.Mesh(new T.BoxGeometry(.03, .012, .012), dark); bridge.position.set(0, .015, .112); g.add(bridge);
    for (const sx of [-1, 1]) { const arm = new T.Mesh(new T.BoxGeometry(.012, .012, .1), dark); arm.position.set(.1 * sx, .015, .05); g.add(arm); }
  }
  if (o.beard && o.beard !== 'none') {
    const bM = mat('#171310', .85);
    const b = new T.Mesh(new T.SphereGeometry(0.082, 16, 14), bM);
    if (o.beard === 'stubble') b.scale.set(.98, .5, .6);
    else if (o.beard === 'full') b.scale.set(1.0, .8, .66);
    else b.scale.set(.98, 1.45, .66);
    b.position.set(0, ACC.beardY - (o.beard === 'long' ? 0.05 : 0), ACC.beardZ - .01); g.add(b);
  }
  if (o.moustache) { const m = new T.Mesh(new T.TorusGeometry(0.035, 0.012, 8, 14, Math.PI), mat('#171310', .85));
    m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI; m.position.set(0, ACC.mouY, ACC.mouZ); g.add(m); }
  g.traverse(x => { if (x.isMesh) x.castShadow = true; });
  return g;
}
function makeHuman(o) {
  const grp = new T.Group();
  const model = window.skeletonClone(HERO.scene);
  const s = 1.8 / HERO.height * (o.vary ? rand(.93, 1.05) : 1); // people come in sizes
  model.scale.setScalar(s);
  grp.add(model);
  const skinTint = new T.Color(o.skin); { const hsl = { h: 0, s: 0, l: 0 }; skinTint.getHSL(hsl);
    skinTint.setHSL(hsl.h, Math.min(1, hsl.s * 1.7), Math.min(.92, hsl.l * 1.28)); } // counteract texture-multiply greying
  model.traverse(n => { if (!(n.isMesh || n.isSkinnedMesh)) return;
    n.castShadow = true; n.frustumCulled = false;
    const mn = (n.material && n.material.name) || '';
    n.material = n.material.clone();
    if (/Outfit_Top/i.test(mn)) n.visible = false; // the avatar's western tailcoat is gone for good — we dress him in a real kurta below
    else if (/Outfit_Bottom/i.test(mn)) n.material.color = new T.Color(o.dhoti);     // churidar / pyjama
    else if (/Footwear/i.test(mn)) n.material.color = new T.Color('#4a3626');        // leather juttis
    else if (/Skin|Body/i.test(mn)) n.material.color = skinTint;                     // face + body skin tone
    else if (/Headwear/i.test(mn)) n.visible = false;                                // replaced by our pagdi
    else if (/Beard/i.test(mn)) n.visible = o.moustache !== false;                  // this mesh is actually the moustache
    else if (/visor/i.test(n.name) || /visor/i.test(mn)) { n.visible = !!o.shades; if (o.shades) { n.material.color = new T.Color('#101014'); n.material.roughness = .15; } } });
  grp.updateMatrixWorld(true);
  let head = null, neck = null, spine = null, rArm = null, lArm = null, rLeg = null, lLeg = null, rCalf = null, lCalf = null, rFore = null, lFore = null, hips = null, rHand = null, lHand = null;
  model.traverse(n => { if (!n.isBone) return; const nm = n.name;
    if (/Head$/.test(nm)) head = n; else if (/Neck$/.test(nm)) neck = n; else if (/Spine2$/.test(nm)) spine = n;
    else if (/Hips$/.test(nm)) hips = n;
    else if (/RightArm$/.test(nm)) rArm = n; else if (/LeftArm$/.test(nm)) lArm = n;
    else if (/RightUpLeg$/.test(nm)) rLeg = n; else if (/LeftUpLeg$/.test(nm)) lLeg = n;
    else if (/RightLeg$/.test(nm)) rCalf = n; else if (/LeftLeg$/.test(nm)) lCalf = n;
    else if (/RightForeArm$/.test(nm)) rFore = n; else if (/LeftForeArm$/.test(nm)) lFore = n;
    else if (/RightHand$/.test(nm)) rHand = n; else if (/LeftHand$/.test(nm)) lHand = n; });
  const V = new T.Vector3();
  // ---- the real outfit: a bone-draped kurta (the avatar's western tailcoat stays hidden) ----
  {
    const kc = o.kurta || '#ffffff';
    const outfitM =
      o.outfit === 'kurta' ? new T.MeshStandardMaterial({ color: new T.Color(kc), roughness: .85, side: T.DoubleSide }) :
      o.outfit === 'silk' ? new T.MeshStandardMaterial({ color: new T.Color(kc), roughness: .3, metalness: .15, side: T.DoubleSide }) :
      o.outfit === 'khadi' ? new T.MeshStandardMaterial({ color: '#ffffff', map: makeTurbanTexture(kc), roughness: 1, side: T.DoubleSide }) :
      o.outfit === 'bandhgala' ? new T.MeshStandardMaterial({ color: new T.Color(kc).multiplyScalar(.5), roughness: .48, metalness: .1, side: T.DoubleSide }) :
      new T.MeshStandardMaterial({ color: '#ffffff', map: makeBrocadeTexture(kc), roughness: .72, side: T.DoubleSide });
    const WP = new T.Vector3();
    const worldOf = b => b.getWorldPosition(new T.Vector3());
    const drape = (bone, a, b, r1, r2, sq, open) => { // cloth tube between two world points, parented to a bone so it follows the rig
      const ws = bone.getWorldScale(WP).x || 1;
      const la = bone.worldToLocal(a.clone()), lb = bone.worldToLocal(b.clone());
      const dir = lb.clone().sub(la), len = dir.length(); if (len < 1e-5) return;
      const m2 = new T.Mesh(new T.CylinderGeometry(r1 / ws, r2 / ws, len, 16, 1, !!open), outfitM);
      m2.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
      if (sq && sq !== 1) m2.scale.z = sq;
      m2.position.copy(la.add(lb).multiplyScalar(.5)); m2.castShadow = true; bone.add(m2);
    };
    if (spine && neck && hips) {
      const nW = worldOf(neck), hW = worldOf(hips);
      const top = nW.clone().lerp(hW, .09); // collar sits just below the neck, scarf stays visible
      drape(spine, top, hW, .128, .162, .72, false);                                  // fitted trunk
      if (o.female) { // sari: ankle-length pleated fall + pallu thrown over the left shoulder
        drape(hips, hW, hW.clone().add(new T.Vector3(0, -.82, 0)), .162, .27, .86, true);
        if (lArm) { const shW = worldOf(lArm);
          drape(spine, hW.clone().add(new T.Vector3(.12, 0, .1)), shW.clone().add(new T.Vector3(0, .03, .04)), .08, .045, .38, false); }
      } else {
        const hemLen = o.outfit === 'bandhgala' ? .28 : (o.salwar ? .34 : .4);         // bandhgala stops at the hip, kurtas fall to the knee
        drape(hips, hW, hW.clone().add(new T.Vector3(0, -hemLen, 0)), .162, .205, .78, true); // flared kurta skirt
        // front placket with buttons
        const btnM = new T.MeshStandardMaterial({ color: (o.outfit === 'sherwani' || o.outfit === 'bandhgala') ? '#d4af37' : '#f2ead6', roughness: .3, metalness: .5 });
        const ws2 = spine.getWorldScale(WP).x || 1;
        for (let i = 0; i < 5; i++) { const f = .12 + i * .15;
          const p = top.clone().lerp(hW, f); p.z += lerp(.128, .162, f) * .72 * .97;
          const b2 = new T.Mesh(new T.SphereGeometry(.011 / ws2, 8, 6), btnM);
          b2.position.copy(spine.worldToLocal(p)); spine.add(b2); }
      }
    }
    for (const [a1, a2, a3] of [[rArm, rFore, rHand], [lArm, lFore, lHand]]) {
      if (!a1) continue;
      const sh = new T.Mesh(new T.SphereGeometry(.058 / (a1.getWorldScale(WP).x || 1), 12, 10), outfitM);
      sh.scale.set(1, .85, 1); sh.castShadow = true; a1.add(sh); // small shoulder seam, not a football pad
      if (a2) drape(a1, worldOf(a1), worldOf(a2), .052, .045, 1, false);              // upper sleeve
      if (a2 && a3) drape(a2, worldOf(a2), worldOf(a3), .043, .036, 1, false);        // forearm sleeve, moves with the elbow
    }
  }
  if (head) { const ws = head.getWorldScale(V).x || 1;
    // every face its own: vary the skull's proportions per person (accessories inherit the same stretch)
    if (o.vary) head.scale.set(head.scale.x * rand(.93, 1.09), head.scale.y * rand(.94, 1.1), head.scale.z * rand(.96, 1.06));
    // the avatar has a real beard mesh, so only the pagdi is attached here
    const acc = buildHeadgear({ turban: o.turban, turbanColor: o.turbanColor, beard: o.beard, shades: o.shades, hair: o.hair, hairColor: o.hairColor }); acc.scale.setScalar(1 / ws); acc.position.set(0, 0.062 / ws, 0.004 / ws); head.add(acc); }
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
  if (h.seated) { // driving pose: hips/knees bent, hands reach FORWARD to the wheel — never up in the air
    const set = (b, x) => { if (b) b.rotation.x = x; };
    set(h.rLeg, -1.3); set(h.lLeg, -1.3); set(h.rCalf, 1.35); set(h.lCalf, 1.35);
    // arms: relative to the animated pose, so they fold down+forward from wherever idle left them
    if (h.rArm) { h.rArm.rotation.x -= .5; h.rArm.rotation.z -= .12; }
    if (h.lArm) { h.lArm.rotation.x -= .5; h.lArm.rotation.z += .12; }
    if (h.rFore) h.rFore.rotation.x -= .55;
    if (h.lFore) h.lFore.rotation.x -= .55;
    if (h.spine) h.spine.rotation.x += .1; // slight lean over the bars
    return;
  }
  // full-body MMA strikes: guard up, hips drive, elbows extend
  if (u.attack && u.attack.t > 0) {
    const p = 1 - u.attack.t, ext = Math.sin(clamp(p * 1.25, 0, 1) * Math.PI), k = u.attack.kind;
    // boxing guard: elbows tucked to the ribs, fists in front of the chin — never over the head
    if (h.lArm) { h.lArm.rotation.x -= .42; h.lArm.rotation.z += .5; }
    if (h.rArm) { h.rArm.rotation.x -= .42; h.rArm.rotation.z -= .5; }
    if (h.lFore) { h.lFore.rotation.x -= .55; h.lFore.rotation.y += .9; }
    if (h.rFore) { h.rFore.rotation.x -= .55; h.rFore.rotation.y -= .9; }
    if (h.spine) h.spine.rotation.x += .12; // slight forward lean
    if (h.rLeg) h.rLeg.rotation.x -= .16; if (h.lLeg) h.lLeg.rotation.x -= .16; // crouch
    if (k === 0) { // JAB: lead straight at chin height — shoulders rotate, elbow snaps out
      if (h.spine) h.spine.rotation.y += .5 * ext;
      if (h.head) h.head.rotation.y -= .28 * ext;
      if (h.lArm) { h.lArm.rotation.x = -1.12 * ext - .28; h.lArm.rotation.z = .12; h.lArm.rotation.y = -.15 * ext; }
      if (h.lFore) { h.lFore.rotation.x = -.5 * (1 - ext); h.lFore.rotation.y = .9 * (1 - ext); } // elbow extends flat
    } else if (k === 1) { // CROSS: rear straight — hip drive, fist stays at shoulder line
      if (h.spine) { h.spine.rotation.y -= .72 * ext; h.spine.rotation.x += .14 * ext; }
      if (h.head) h.head.rotation.y += .32 * ext;
      if (h.rArm) { h.rArm.rotation.x = -1.18 * ext - .28; h.rArm.rotation.z = -.12; h.rArm.rotation.y = .2 * ext; }
      if (h.rFore) { h.rFore.rotation.x = -.5 * (1 - ext); h.rFore.rotation.y = -.9 * (1 - ext); }
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
    const di3 = districtAt(vx + STEP / 2, vz + STEP / 2);
    if (![1, 6, 7].includes(di3)) continue;
    if (((kx * 31 + kz * 17) % 10) > 3) continue;
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
    if (f === floors - 1) { // ground floor — a bazaar row: open glowing shops between pulled-down shutters
      for (let cc = 0; cc < cols; cc++) {
        const x = padx + cc * (ww + padx), y = yTop + fh * .18, h2 = fh * .74;
        const open = Math.random() < .5;
        if (open) { // shop doing business: warm interior, stacked colourful goods, hanging strings
          const gl2 = g.createLinearGradient(0, y, 0, y + h2);
          gl2.addColorStop(0, '#3a2c1a'); gl2.addColorStop(.25, '#8a5f2a'); gl2.addColorStop(.8, '#c98f3f');
          g.fillStyle = gl2; g.fillRect(x - 6, y, ww + 12, h2);
          for (let sh = 0; sh < 3; sh++) { const sy = y + h2 * (.3 + sh * .22); // shelves of wares
            g.fillStyle = 'rgba(60,40,20,.8)'; g.fillRect(x - 4, sy + 6, ww + 8, 2.5);
            for (let gx = x - 2; gx < x + ww + 2; gx += 7) { g.fillStyle = pick(['#c0392b', '#e0b93c', '#2980b9', '#1e7a4a', '#e67e22', '#efe9da', '#8e44ad']);
              g.fillRect(gx, sy, 5, 6); } }
          for (let hx = x; hx < x + ww; hx += rand(8, 14)) { // sachet strips hanging from the lintel
            g.strokeStyle = pick(['#c9c9c9', '#e0b93c']); g.lineWidth = 1.6;
            g.beginPath(); g.moveTo(hx, y); g.lineTo(hx, y + rand(10, 22)); g.stroke(); }
          g.fillStyle = 'rgba(20,14,8,.55)'; g.fillRect(x - 6, y, 4, h2); g.fillRect(x + ww + 2, y, 4, h2);
        } else { // rolled shutter, painted and rusting
          g.fillStyle = pick(['#7f8a92', '#9a8a6a', '#7d9484', '#a08878', '#8a6a7d', '#6a8a92']); g.fillRect(x - 6, y, ww + 12, h2);
          g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5;
          for (let s2 = 0; s2 < h2; s2 += 5) { g.beginPath(); g.moveTo(x - 6, y + s2); g.lineTo(x + ww + 6, y + s2); g.stroke(); }
          g.globalAlpha = .25; g.fillStyle = '#7c4029'; g.fillRect(x - 6, y + h2 - rand(6, 16), ww + 12, 8); g.globalAlpha = 1; // rust at the sill
        }
        // every shop gets its own loud signboard, stacked bazaar-style
        const sb = pick(['#c0392b', '#1a5c8a', '#c9a02b', '#1e7a4a', '#8a2b6b', '#b3541e', '#0f6a6a']);
        g.fillStyle = sb; g.fillRect(x - 8, y - 16, ww + 16, 15);
        g.strokeStyle = pick(['#ffe9a8', '#ffffff', '#ffd24d']); g.lineWidth = 2;
        g.beginPath(); g.moveTo(x - 2, y - 5); g.lineTo(x + ww + 2, y - 5); g.stroke(); // headline bar (devanagari-like)
        for (let sx2 = x; sx2 < x + ww; sx2 += rand(6, 12)) { g.beginPath(); g.moveTo(sx2, y - 5); g.lineTo(sx2 + rand(-2, 2), y - 12 + rand(0, 4)); g.stroke(); }
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
        const rh = Math.max(1.4, h * .3);
        const pyr = new T.Mesh(new T.ConeGeometry(1, 1, 4), roofM);
        pyr.rotation.y = Math.PI / 4; pyr.scale.set(w * .58, rh, d * .58);
        pyr.position.set(px2, h + rh / 2 - .05, pz2); pyr.castShadow = true; scene.add(pyr);
        const eave = new T.Mesh(boxGeo, roofM); eave.scale.set(w + .5, .22, d + .5); eave.position.set(px2, h + .05, pz2); eave.castShadow = true; scene.add(eave);
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
  buildPetrolStations(); buildFilmSet();
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
let barkTex = null, frondTex = null, leafMats = null;
function makeBarkTexture() {
  if (barkTex) return barkTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const q = c.getContext('2d');
  q.fillStyle = '#6b5138'; q.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 90; i++) { q.strokeStyle = `rgba(${30 + randi(0, 40)},${22 + randi(0, 28)},${12 + randi(0, 18)},${rand(.25, .6)})`;
    q.lineWidth = rand(1, 3); const x = rand(0, 64); q.beginPath(); q.moveTo(x, 0); q.bezierCurveTo(x + rand(-6, 6), 42, x + rand(-6, 6), 86, x + rand(-8, 8), 128); q.stroke(); }
  barkTex = new T.CanvasTexture(c); barkTex.wrapS = barkTex.wrapT = T.RepeatWrapping; return barkTex;
}
function makeFrondTexture() { // one palm leaflet blade with feathered, cut edges
  if (frondTex) return frondTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const q = c.getContext('2d');
  q.clearRect(0, 0, 64, 256);
  for (let y = 4; y < 252; y += 7) { const w = 26 * (1 - y / 300); // leaflet pairs off a centre rib
    q.fillStyle = pick(['#2f7a45', '#2a7040', '#38854e']);
    q.beginPath(); q.moveTo(32, y); q.lineTo(32 - w, y + 5 + rand(0, 3)); q.lineTo(32, y + 6); q.fill();
    q.beginPath(); q.moveTo(32, y); q.lineTo(32 + w, y + 5 + rand(0, 3)); q.lineTo(32, y + 6); q.fill(); }
  q.strokeStyle = '#245c36'; q.lineWidth = 2.5; q.beginPath(); q.moveTo(32, 0); q.lineTo(32, 256); q.stroke();
  frondTex = new T.CanvasTexture(c); return frondTex;
}
function buildTree(palm) {
  const g = new T.Group();
  if (!leafMats) leafMats = ['#3a6b35', '#446f3e', '#2f6032', '#4a7a42'].map(cc => mat(cc, .95));
  if (palm) {
    // coconut palm: curved trunk of stacked ringed segments, real drooping textured fronds
    const lean = rand(.06, .22), leanDir = rand(0, TAU), H = rand(5, 6.6), segs = 7;
    const bark = new T.MeshStandardMaterial({ color: '#9a7d52', map: makeBarkTexture(), roughness: .95 });
    let px = 0, pz = 0;
    for (let i = 0; i < segs; i++) { const t = i / segs;
      const seg = new T.Mesh(new T.CylinderGeometry(.13 * (1 - t * .35), .16 * (1 - t * .3), H / segs + .1, 8), bark);
      px = Math.cos(leanDir) * lean * (t * t) * H; pz = Math.sin(leanDir) * lean * (t * t) * H;
      seg.position.set(px, (i + .5) * H / segs, pz); seg.rotation.z = Math.cos(leanDir) * lean * 1.4; seg.rotation.x = -Math.sin(leanDir) * lean * 1.4;
      seg.castShadow = true; g.add(seg); }
    const crownY = H + .05;
    const fM = new T.MeshStandardMaterial({ map: makeFrondTexture(), transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .9 });
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + rand(-.15, .15);
      const geo = new T.PlaneGeometry(.55, 2.7, 1, 6); const pos = geo.attributes.position;
      for (let vi = 0; vi < pos.count; vi++) { const vy = pos.getY(vi), t2 = (vy + 1.35) / 2.7; // droop increases toward the tip
        pos.setZ(vi, -(t2 * t2) * 1.15); pos.setX(vi, pos.getX(vi) * (1 - t2 * .55)); }
      geo.computeVertexNormals();
      const fr = new T.Mesh(geo, fM);
      fr.position.set(px, crownY, pz);
      fr.rotation.order = 'YXZ'; fr.rotation.y = a; fr.rotation.x = -Math.PI / 2 + rand(.5, .9);
      fr.castShadow = true; g.add(fr); }
    const crown = new T.Mesh(new T.SphereGeometry(.22, 8, 6), mat('#5a4a28')); crown.position.set(px, crownY, pz); g.add(crown);
    for (let k = 0; k < 3; k++) { const nut = new T.Mesh(new T.SphereGeometry(.11, 8, 6), mat('#6d5426', .8));
      nut.position.set(px + rand(-.2, .2), crownY - .18, pz + rand(-.2, .2)); nut.castShadow = true; g.add(nut); }
  } else {
    // neem / banyan: bark-textured trunk, low branches, organic jittered canopy
    const bark = new T.MeshStandardMaterial({ color: '#7a6248', map: makeBarkTexture(), roughness: .95 });
    const tr = new T.Mesh(new T.CylinderGeometry(.24, .38, 2.6, 9), bark); tr.position.y = 1.3; tr.castShadow = true; g.add(tr);
    for (let b = 0; b < 3; b++) { const a = b / 3 * TAU + rand(-.4, .4);
      const br = new T.Mesh(new T.CylinderGeometry(.07, .12, 1.6, 6), bark);
      br.position.set(Math.cos(a) * .55, 2.9, Math.sin(a) * .55);
      br.rotation.z = Math.cos(a) * .75; br.rotation.x = -Math.sin(a) * .75; br.castShadow = true; g.add(br); }
    const isBanyan = Math.random() < .22;
    const blobs = [[0, 3.3, 0, 1.45], [-1.0, 2.9, .45, 1.05], [.9, 3.0, -.5, 1.0], [.25, 3.9, .55, .9], [-.4, 3.7, -.65, .85], [.6, 3.5, .8, .8]];
    for (const [dx, dy, dz, r] of blobs) {
      const geo = new T.IcosahedronGeometry(r, 1); const pos = geo.attributes.position;
      for (let vi = 0; vi < pos.count; vi++) { const j = () => rand(-.16, .16) * r;
        pos.setXYZ(vi, pos.getX(vi) + j(), pos.getY(vi) * .78 + j(), pos.getZ(vi) + j()); }
      geo.computeVertexNormals();
      const f = new T.Mesh(geo, pick(leafMats)); f.position.set(dx, dy, dz); f.castShadow = true; g.add(f); }
    if (isBanyan) for (let rIdx = 0; rIdx < 4; rIdx++) { // aerial prop roots
      const a = rand(0, TAU), rr = rand(.7, 1.2);
      const root = new T.Mesh(new T.CylinderGeometry(.025, .04, 2.8, 5), bark);
      root.position.set(Math.cos(a) * rr, 1.4, Math.sin(a) * rr); root.rotation.z = rand(-.06, .06); g.add(root); }
  }
  return g;
}
const vendorSpots = [], vendors = [], steams = [], steamPuffs = [];
// clear ground: no building/prop within r — trees stop growing out of walls
function clearOf(x, z, r) {
  for (const b of buildings) { if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) return false; }
  return true;
}
// props live on the SIDEWALK (not the road) and are solid so vehicles can't pass through
function scatterProps() {
  const boxGeo = new T.BoxGeometry(1, 1, 1), area = (WORLD / 180) ** 2;
  // food stalls — every stall has a trade: chai tapri, kadhai fry (jalebi/samosa), or pani puri.
  // Real equipment on the counter, steam off the pots, and a vendor cooking behind it (spawned once the rig loads).
  for (let i = 0; i < 55 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const kindS = pick(['chai', 'fry', 'panipuri', 'chai', 'fry']);
    const face = rand(0, TAU), fs = Math.sin(face), fc = Math.cos(face);
    const partsFrom = scene.children.length; // everything added below belongs to this stall — and can be smashed over
    const cart = new T.Mesh(boxGeo, mat(pick(['#6b4a2a', '#1e6a5a', '#8a3a2a']))); cart.scale.set(1.5, .85, 1); cart.position.set(p.x, .45, p.z); cart.rotation.y = face; cart.castShadow = true; scene.add(cart);
    // overhead: half get the striped parasol, half the great Indian blue tarpaulin on bamboo
    const pole = new T.Mesh(new T.CylinderGeometry(.04, .04, 2.3, 6), mat('#8a6b3a')); pole.position.set(p.x, 1.15, p.z); scene.add(pole);
    if (Math.random() < .45) {
      const tarp = new T.Mesh(new T.PlaneGeometry(2.3, 1.9, 3, 3), new T.MeshStandardMaterial({ color: '#2a5ba8', roughness: .95, side: T.DoubleSide }));
      const tp = tarp.geometry.attributes.position;
      for (let vi = 0; vi < tp.count; vi++) tp.setZ(vi, rand(-.1, .14)); tarp.geometry.computeVertexNormals();
      tarp.rotation.x = -Math.PI / 2 + rand(-.14, .14); tarp.rotation.z = rand(0, TAU);
      tarp.position.set(p.x, 2.28, p.z); tarp.castShadow = true; scene.add(tarp);
      for (const [bx, bz] of [[-1, -.8], [1, -.8], [-1, .8], [1, .8]]) { // lashed to bamboo at each corner
        const bam = new T.Mesh(new T.CylinderGeometry(.03, .035, 2.25, 6), mat('#a08a52', .9));
        bam.position.set(p.x + bx, 1.12, p.z + bz); bam.rotation.z = bx * .06; bam.rotation.x = -bz * .05; scene.add(bam); }
    } else {
      const pc = document.createElement('canvas'); pc.width = 64; pc.height = 16; const pg = pc.getContext('2d');
      const c1 = pick(['#c0392b', '#1a5c8a', '#1e7a4a', '#c9760b']);
      for (let s2 = 0; s2 < 8; s2++) { pg.fillStyle = s2 % 2 ? '#f2ead6' : c1; pg.fillRect(s2 * 8, 0, 8, 16); }
      const ptex = new T.CanvasTexture(pc); ptex.wrapS = T.RepeatWrapping; ptex.repeat.set(2, 1);
      const um = new T.Mesh(new T.ConeGeometry(1.35, .55, 10, 1, true), new T.MeshStandardMaterial({ map: ptex, roughness: .9, side: T.DoubleSide }));
      um.position.set(p.x, 2.35, p.z); um.castShadow = true; scene.add(um);
    }
    // the red 14 kg LPG cylinder every stall runs on
    const cyl = new T.Mesh(new T.CylinderGeometry(.15, .15, .48, 10), mat('#b32418', .55));
    cyl.position.set(p.x - fc * .9, .24, p.z + fs * .9); cyl.castShadow = true; scene.add(cyl);
    if (kindS === 'chai') { // battered kettle, milk pan on the burner, glass tumblers, bench for the uncles
      const pan = new T.Mesh(new T.CylinderGeometry(.2, .17, .12, 12), mat('#9aa0a8', .35)); pan.position.set(p.x + fs * .3, .95, p.z + fc * .3); scene.add(pan);
      const kettle = new T.Mesh(new T.SphereGeometry(.13, 10, 8), mat('#7a7f86', .4)); kettle.scale.y = .85; kettle.position.set(p.x - fs * .35, .96, p.z - fc * .35); scene.add(kettle);
      const spout = new T.Mesh(new T.CylinderGeometry(.02, .03, .18, 6), mat('#7a7f86', .4)); spout.rotation.z = 1; spout.position.set(p.x - fs * .35 + .12, 1.0, p.z - fc * .35); scene.add(spout);
      for (let gl = 0; gl < 4; gl++) { const tum = new T.Mesh(new T.CylinderGeometry(.03, .024, .08, 8), new T.MeshStandardMaterial({ color: '#d9c9a0', roughness: .2, transparent: true, opacity: .75 }));
        tum.position.set(p.x + fs * .1 + fc * (.15 + gl * .12) - fc * .3, .92, p.z + fc * .1 - fs * (.15 + gl * .12) + fs * .3); scene.add(tum); }
      const bench = new T.Mesh(new T.BoxGeometry(1.5, .07, .32), mat('#8a6b3a', .9)); bench.position.set(p.x + fc * 1.4, .4, p.z - fs * 1.4); bench.rotation.y = face; bench.castShadow = true; scene.add(bench);
      for (const bx of [-.6, .6]) { const leg = new T.Mesh(new T.BoxGeometry(.06, .4, .28), mat('#6b4a2a')); leg.position.set(p.x + fc * 1.4 + Math.cos(face) * bx, .2, p.z - fs * 1.4 - Math.sin(face) * bx); scene.add(leg); }
      steams.push({ x: p.x + fs * .3, y: 1.05, z: p.z + fc * .3, r: .06 });
    } else if (kindS === 'fry') { // wide black kadhai of bubbling oil + golden pile + glass display case
      const kad = new T.Mesh(new T.SphereGeometry(.3, 14, 8, 0, TAU, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: '#1c1c1e', roughness: .5, metalness: .4, side: T.DoubleSide }));
      kad.rotation.x = Math.PI; kad.position.set(p.x + fs * .25, 1.02, p.z + fc * .25); scene.add(kad);
      const oil = new T.Mesh(new T.CircleGeometry(.26, 14), new T.MeshStandardMaterial({ color: '#8a5a1a', roughness: .15, metalness: .3 }));
      oil.rotation.x = -Math.PI / 2; oil.position.set(p.x + fs * .25, .99, p.z + fc * .25); scene.add(oil);
      for (let j2 = 0; j2 < 6; j2++) { const jal = new T.Mesh(new T.TorusGeometry(.045, .018, 6, 10), mat('#e8940a', .5));
        jal.rotation.x = -Math.PI / 2 + rand(-.3, .3); jal.position.set(p.x - fs * .35 + rand(-.12, .12), .94 + j2 * .012, p.z - fc * .35 + rand(-.12, .12)); scene.add(jal); }
      const caseG = new T.Mesh(new T.BoxGeometry(.6, .34, .38), new T.MeshStandardMaterial({ color: '#cfe2ec', roughness: .1, transparent: true, opacity: .35 }));
      caseG.position.set(p.x - fc * .45, 1.05, p.z + fs * .45); caseG.rotation.y = face; scene.add(caseG);
      for (let sm = 0; sm < 5; sm++) { const smo = new T.Mesh(new T.ConeGeometry(.05, .09, 4), mat('#d9a83a', .7));
        smo.position.set(p.x - fc * .45 + rand(-.18, .18), .95 + (sm > 2 ? .07 : 0), p.z + fs * .45 + rand(-.1, .1)); scene.add(smo); }
      steams.push({ x: p.x + fs * .25, y: 1.1, z: p.z + fc * .25, r: .1 });
    } else { // pani puri: the glass-sided mound of puris + row of clay matkas with coloured pani
      const mound = new T.Mesh(new T.SphereGeometry(.26, 10, 8, 0, TAU, 0, Math.PI / 2), mat('#e8c87a', .8));
      mound.position.set(p.x + fs * .2, .9, p.z + fc * .2); scene.add(mound);
      for (let pu = 0; pu < 8; pu++) { const puri = new T.Mesh(new T.SphereGeometry(.035, 6, 5), mat('#e0bd6a', .75));
        puri.position.set(p.x + fs * .2 + rand(-.24, .24), .92 + rand(0, .16), p.z + fc * .2 + rand(-.24, .24)); scene.add(puri); }
      const waters = ['#4a7a2a', '#6b4423', '#b3552a'];
      for (let mk = 0; mk < 3; mk++) { const matka = new T.Mesh(new T.SphereGeometry(.13, 10, 8), mat('#a8642f', .9));
        matka.scale.y = .8; const mx2 = p.x - fs * .3 + fc * (mk - 1) * .3, mz2 = p.z - fc * .3 - fs * (mk - 1) * .3;
        matka.position.set(mx2, .96, mz2); scene.add(matka);
        const pani = new T.Mesh(new T.CircleGeometry(.08, 10), new T.MeshStandardMaterial({ color: waters[mk], roughness: .2 }));
        pani.rotation.x = -Math.PI / 2; pani.position.set(mx2, 1.05, mz2); scene.add(pani); }
    }
    // the vendor stands behind the counter and cooks — spawned with the rigged human once it's loaded
    vendorSpots.push({ x: p.x - fs * 1.05, z: p.z - fc * 1.05, yaw: face, kind: kindS });
    buildings.push({ x: p.x, z: p.z, hw: .9, hd: .7, parts: scene.children.slice(partsFrom) }); }
  // garbage piles (decorative, no collision)
  for (let i = 0; i < 90 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const gb = new T.Mesh(new T.SphereGeometry(rand(.3, .6), 7, 6), mat(pick(['#7a6f4a', '#8a5a3a', '#556b4a']))); gb.position.set(p.x, .2, p.z); gb.scale.y = .5; gb.castShadow = true; scene.add(gb); }
  // trees (solid trunks) — palms near coastal/southern districts; canopies keep clear of walls
  for (let i = 0; i < 150 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    if (!clearOf(p.x, p.z, 1.9)) continue;
    const di = districtAt(p.x, p.z); const palm = [5, 7, 8].includes(di) ? Math.random() < .7 : Math.random() < .2;
    const tr = buildTree(palm); tr.position.set(p.x, 0, p.z); tr.scale.setScalar(rand(.85, 1.12)); scene.add(tr);
    buildings.push({ x: p.x, z: p.z, hw: .5, hd: .5 }); }
  // scattered litter: papers, plastic bags, bottle bits — everywhere
  const litterGeo = new T.PlaneGeometry(.22, .3);
  for (let i = 0; i < 420 * area; i++) { const p = sidewalkSpot() || roadSpot(); if (!p) continue;
    const lt = new T.Mesh(litterGeo, new T.MeshStandardMaterial({ color: pick(['#e8e2d0', '#c9d4e0', '#d4c9b0', '#9fb8c9', '#e0c9c9']), roughness: 1, side: T.DoubleSide }));
    lt.rotation.x = -Math.PI / 2 + rand(-.15, .15); lt.rotation.z = rand(0, TAU);
    lt.position.set(p.x + rand(-2, 2), .02 + rand(0, .03), p.z + rand(-2, 2)); scene.add(lt); }
  // big corner trash heaps with stain
  for (let i = 0; i < 40 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const stain = new T.Mesh(new T.CircleGeometry(rand(1.2, 2), 10), new T.MeshStandardMaterial({ color: '#4a4234', roughness: 1 }));
    stain.rotation.x = -Math.PI / 2; stain.position.set(p.x, .015, p.z); scene.add(stain);
    for (let k = 0; k < 5; k++) { const bag = new T.Mesh(new T.SphereGeometry(rand(.2, .45), 7, 6), mat(pick(['#3a3f46', '#556b4a', '#7a6f4a', '#2a2e34']), 1));
      bag.scale.y = .7; bag.position.set(p.x + rand(-.8, .8), .2, p.z + rand(-.8, .8)); bag.castShadow = true; scene.add(bag); } }
  // vendor thela carts with produce pyramids
  for (let i = 0; i < 34 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const cart = new T.Group();
    const bed = new T.Mesh(new T.BoxGeometry(1.6, .14, 1), mat('#8a6b3a', .9)); bed.position.y = .8; cart.add(bed);
    for (const sx of [-.6, .6]) { const wl = new T.Mesh(new T.TorusGeometry(.32, .05, 8, 16), mat('#3a2f24', .8)); wl.rotation.y = Math.PI / 2; wl.position.set(sx, .34, 0); cart.add(wl); }
    for (const lx of [-.7, .7]) { const leg = new T.Mesh(new T.CylinderGeometry(.03, .03, .8, 6), mat('#6b4a2a')); leg.position.set(lx, .4, .42); cart.add(leg); }
    const fruit = pick(['#e67e22', '#c0392b', '#e0b93c', '#4f9e2b', '#d4691e']);
    for (let ring = 0; ring < 3; ring++) { const n = 5 - ring;
      for (let q = 0; q < n * n; q++) { const fx = (q % n - (n - 1) / 2) * .18, fz = ((q / n | 0) - (n - 1) / 2) * .18;
        const fr = new T.Mesh(new T.SphereGeometry(.085, 8, 7), mat(fruit, .55)); fr.position.set(fx, .95 + ring * .14, fz); cart.add(fr); } }
    cart.position.set(p.x, 0, p.z); cart.rotation.y = rand(0, TAU);
    cart.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(cart);
    buildings.push({ x: p.x, z: p.z, hw: 1, hd: .8, parts: [cart] }); }
  // parked roadster bicycles — walk up and ride off on one (F)
  for (let i = 0; i < 26 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    const b = buildBicycle(); b.position.set(p.x, 0, p.z); b.rotation.y = rand(0, TAU); scene.add(b);
    vehicles.push({ g: b, kind: 'cycle', yaw: b.rotation.y, speed: 0, ai: false, parked: true,
      hw: .35, hl: 1.0, horn: 4 }); }
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
    const o = npcLook(districtAt(p.x, p.z)); // men, women in saris, sadhus, sardars — dressed like their district
    const g = makeCharacter(o); g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU); scene.add(g);
    npcs.push({ g, wealth: o.wealth || 0, dir: rand(0, TAU), speed: rand(.7, 1.5), turn: 0, down: 0, t: rand(0, 10), pause: 0 });
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

// ---------- street animals: monkeys (monkey cities) + stray dogs ----------
const monkeys = [], dogs = [];
function spawnMonkeys(n) {
  for (let i = 0; i < n; i++) {
    // monkeys live where they really do: Old Delhi, Marwar, Kashi
    const cell = pick([0, 2, 3]); const mx = cell % 3, mz = (cell / 3) | 0;
    let p = null;
    for (let t = 0; t < 40; t++) { const x = rand((mx - 1) * CELL - CELL * .42, (mx - 1) * CELL + CELL * .42), z = rand((mz - 1) * CELL - CELL * .42, (mz - 1) * CELL + CELL * .42);
      if (onSidewalk(x, z) && !blocked(x, z)) { p = { x, z }; break; } }
    if (!p) continue;
    const g = new T.Group(); const fur = mat('#7a5f46', .9), face = mat('#c9a074', .7);
    const body = new T.Mesh(new T.SphereGeometry(.16, 10, 8), fur); body.scale.set(.85, 1, 1.1); body.position.y = .3; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(.1, 10, 8), fur); head.position.set(0, .5, .08); g.add(head);
    const muzzle = new T.Mesh(new T.SphereGeometry(.055, 8, 6), face); muzzle.position.set(0, .48, .16); g.add(muzzle);
    for (const sx of [-1, 1]) { const ear = new T.Mesh(new T.SphereGeometry(.03, 6, 5), face); ear.position.set(.09 * sx, .55, .05); g.add(ear); }
    const tail = new T.Mesh(new T.CylinderGeometry(.018, .012, .5, 6), fur); tail.rotation.x = 1; tail.position.set(0, .42, -.28); g.add(tail);
    for (const [sx, sz] of [[-.08, .1], [.08, .1], [-.08, -.1], [.08, -.1]]) { const leg = new T.Mesh(new T.CylinderGeometry(.025, .02, .3, 6), fur); leg.position.set(sx, .15, sz); g.add(leg); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.set(p.x, 0, p.z); scene.add(g);
    monkeys.push({ g, dir: rand(0, TAU), hop: 0, wait: rand(0, 2) });
  }
}
function updateMonkeys(dt) {
  for (const m of monkeys) {
    if (m.wait > 0) { m.wait -= dt; m.g.position.y = 0; continue; }
    if (m.hop <= 0) { // start a hop burst
      if (Math.random() < .3) { m.wait = rand(.5, 2.5); continue; }
      m.dir += rand(-1.2, 1.2); m.hop = rand(.25, .4);
    }
    m.hop -= dt;
    const spd = 3.2;
    const nx = m.g.position.x + Math.sin(m.dir) * spd * dt, nz = m.g.position.z + Math.cos(m.dir) * spd * dt;
    if (!blocked(nx, nz) && Math.abs(nx) < HALF - 2 && Math.abs(nz) < HALF - 2) { m.g.position.x = nx; m.g.position.z = nz; m.g.rotation.y = m.dir; }
    else m.dir += 2;
    m.g.position.y = Math.abs(Math.sin(m.hop * 12)) * .25; // bouncy hop
  }
}
function spawnDogs(n) {
  for (let i = 0; i < n; i++) { const p = sidewalkSpot(); if (!p) continue;
    // Indian pariah dog: lean, wedge head, big erect ears, sickle tail — two-tone coat
    const g = new T.Group();
    const cc = pick([['#b3803f', '#e0cba8'], ['#8a6a48', '#d9c9a8'], ['#3a3428', '#a89878'], ['#c9a06a', '#efe2c8'], ['#96703d', '#e8d9b8']]);
    const coat = mat(cc[0], .92), pale = mat(cc[1], .92);
    const body = new T.Mesh(new T.SphereGeometry(.19, 12, 9), coat); body.scale.set(.68, .7, 1.45); body.position.y = .34; g.add(body);
    const chest = new T.Mesh(new T.SphereGeometry(.14, 10, 8), pale); chest.scale.set(.66, .74, .9); chest.position.set(0, .31, .24); g.add(chest);
    const neck = new T.Mesh(new T.CylinderGeometry(.075, .1, .16, 8), coat); neck.rotation.x = -.7; neck.position.set(0, .42, .3); g.add(neck);
    const head = new T.Mesh(new T.SphereGeometry(.095, 10, 8), coat); head.scale.set(.82, .85, 1); head.position.set(0, .5, .38); g.add(head);
    const muzzle = new T.Mesh(new T.CylinderGeometry(.032, .05, .13, 8), pale); muzzle.rotation.x = Math.PI / 2 - .12; muzzle.position.set(0, .47, .48); g.add(muzzle);
    const nose = new T.Mesh(new T.SphereGeometry(.02, 6, 5), mat('#141414', .4)); nose.position.set(0, .485, .54); g.add(nose);
    for (const sx of [-1, 1]) {
      const ear = new T.Mesh(new T.ConeGeometry(.04, .11, 6), coat); ear.position.set(.058 * sx, .6, .34); ear.rotation.z = -.15 * sx; g.add(ear);
      const eye = new T.Mesh(new T.SphereGeometry(.014, 6, 5), mat('#1a120a', .3)); eye.position.set(.045 * sx, .52, .45); g.add(eye);
    }
    const tail = new T.Mesh(new T.CylinderGeometry(.022, .01, .3, 6), coat); tail.rotation.x = -2.4; tail.position.set(0, .45, -.4); g.add(tail);
    const legs = [];
    for (const [sx, sz] of [[-.08, .24], [.08, .24], [-.08, -.26], [.08, -.26]]) {
      const leg = new T.Mesh(new T.CylinderGeometry(.026, .021, .3, 6), coat);
      leg.position.set(sx, .15, sz); g.add(leg); legs.push(leg);
      const paw = new T.Mesh(new T.SphereGeometry(.026, 6, 5), pale); paw.position.set(sx, .015, sz + .015); g.add(paw); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU); scene.add(g);
    dogs.push({ g, tail, legs, dir: rand(0, TAU), speed: rand(.8, 1.6), t: rand(0, 10), nap: 0, phase: rand(0, TAU) });
  }
}
const corpses = []; // the street cleans itself: dogs and monkeys strip what traffic leaves behind
function updateDogs(dt) {
  for (const d of dogs) {
    d.phase += dt * (4 + d.speed * 3);
    // a corpse nearby beats everything — trot over and feed
    let target = null, td2 = 55 * 55;
    for (const c of corpses) { const q = c.n.g.position.distanceToSquared(d.g.position); if (q < td2) { td2 = q; target = c; } }
    if (target) { d.nap = 0;
      const dx = target.n.g.position.x - d.g.position.x, dz = target.n.g.position.z - d.g.position.z, dd = Math.hypot(dx, dz);
      if (dd > 1.1) { const sp = 3; d.g.rotation.y = Math.atan2(dx, dz);
        const nx = d.g.position.x + dx / dd * sp * dt, nz = d.g.position.z + dz / dd * sp * dt;
        if (!blocked(nx, nz)) { d.g.position.x = nx; d.g.position.z = nz; }
        for (const l of d.legs) l.rotation.x = Math.sin(d.phase + (d.legs.indexOf(l) % 2 ? Math.PI : 0)) * .6;
      } else { target.eaten += dt; d.g.rotation.x = .35 + Math.sin(d.phase * 2) * .15; // head-down feeding bob
        d.tail.rotation.z = Math.sin(d.phase * 3) * .4; }
      continue;
    }
    d.g.rotation.x = 0;
    if (d.nap > 0) { d.nap -= dt; d.g.rotation.z = Math.PI / 2 * .85; d.g.position.y = -.18; continue; }
    d.g.rotation.z = 0; d.g.position.y = 0;
    if (Math.random() < .0015) { d.nap = rand(4, 10); continue; } // street dogs nap anywhere
    wanderMesh(d, dt);
    const moving = true; // trot: diagonal legs swing, sickle tail sways
    if (moving) { let li = 0; for (const l of d.legs) { l.rotation.x = Math.sin(d.phase + (li % 2 ? Math.PI : 0)) * .55 * Math.min(1, d.speed); li++; }
      d.tail.rotation.z = Math.sin(d.phase * .9) * .25; }
  }
}
// ---------- district looks: dress people the way that part of India dresses ----------
function npcLook(di) {
  // clothes tell you who has money: threadbare khadi at the bottom, pressed silk and shades at the top
  const wr = Math.random(), wealth = wr < .45 ? 0 : wr < .87 ? 1 : 2;
  const o = { vary: true, wealth, skin: pick(SKINS), kurta: pick(KURTAS), dhoti: pick(DHOTIS), beard: pick(BEARDS), moustache: Math.random() < .8,
    turban: Math.random() < .22, turbanColor: pick(TURBANS),
    outfit: wealth === 0 ? 'khadi' : wealth === 1 ? pick(['kurta', 'kurta', 'silk']) : pick(['silk', 'sherwani', 'bandhgala']),
    hair: pick(['crop', 'crop', 'part', 'curly', 'jura']), hairColor: pick(HAIRCOLS) };
  if (wealth === 0) { o.kurta = pick(['#c9bfa8', '#b8ab90', '#a89f8a', '#8a8272', '#d9d0b8']); o.dhoti = pick(['#c9bfa8', '#8a8272']); }
  if (wealth === 2) { o.shades = Math.random() < .4; o.kurta = pick(['#f4efe2', '#1a1a2e', '#7b1fa2', '#00695c', '#d4af37', '#880e4f']); }
  if (Math.random() < .42) { // women — sari (regional weaves) or salwar-kameez
    o.female = true; o.beard = 'none'; o.moustache = false; o.turban = false;
    o.hair = pick(['bun', 'long', 'bun']); o.outfit = 'silk';
    o.kurta = pick(['#c2185b', '#7b1fa2', '#00695c', '#e65100', '#1a237e', '#b71c1c', '#f9a825', '#00838f']);
    if (di === 5) { o.kurta = '#f2ecd9'; }                                              // Kerala kasavu: cream & gold
    else if (di === 6) { o.kurta = pick(['#f2ede2', '#efe6d8']); }                       // Bengal: white with red border
    else if (di === 7) { o.kurta = pick(['#b71c1c', '#4a148c', '#e65100', '#00695c']); } // Kanjeevaram silks
    else if (di === 2) { o.kurta = pick(['#e91e63', '#ff5722', '#ffc107', '#00bcd4']); } // Rajasthani ghagra brights
    else if (di === 4 && Math.random() < .6) { o.female = false; o.salwar = true; o.beard = 'none'; o.moustache = false; o.turban = false;
      o.hair = 'long'; o.outfit = 'kurta'; o.kurta = pick(['#c2185b', '#00838f', '#7b1fa2']); o.dhoti = '#ffffff'; } // Punjabi salwar-kameez
    return o;
  }
  if (di === 4) { o.turban = Math.random() < .75; } // Punjab: sardars everywhere
  else if (di === 3 && Math.random() < .4) { o.outfit = 'khadi'; o.kurta = '#ff8c1a'; o.dhoti = '#ff8c1a'; o.beard = 'long'; o.hair = 'long'; o.turban = false; } // Kashi: saffron sadhus
  else if (di === 2) { o.turban = Math.random() < .6; o.turbanColor = pick(['#e91e63', '#ff5722', '#ffc107', '#d81b60', '#ff9933']); } // Marwar: blazing pagris
  else if (di === 5 && Math.random() < .5) { o.outfit = 'kurta'; o.kurta = '#ffffff'; o.dhoti = '#ffffff'; o.turban = false; } // Kerala: white mundu
  else if (di === 8 && Math.random() < .4) { o.outfit = 'kurta'; o.kurta = pick(['#f4e6c8', '#e8e8e8', '#b3d9e8']); o.shades = Math.random() < .5; o.turban = false; } // Goa: susegad
  return o;
}
// ---------- Hinglish street talk ----------
const LINES = {
  hail: ['“Kahan jaana hai, bhaiya?”', '“Arre, meter kharab hai — fixed price only!”', '“Baitho baitho! Best price for you, boss.”', '“Traffic bahut hai aaj… thoda extra, haan?”'],
  ok: ['“Theek hai theek hai, chalo!”', '“Arre okay okay — sit, sit.”', '“Bas aapke liye, boss. Chalo.”'],
  no: ['“Nahi nahi! Not possible!”', '“Kya?! Petrol bhi nahi milta itne mein!”', '“Arre boss, joking or what?”'],
};
const CHAT = [
  ['“Arre bhai, best kebab is behind Jama Masjid, trust me.”', '“Mind the wires, beta. And the monkeys.”', '“Chandni Chowk mein sab milta hai — sab!”'],
  ['“One day I will be hero in pictures, you watch.”', '“Dabbawala never late. NEVER.”', '“Local train full? Arre, there is always room for one more.”'],
  ['“Padharo mhare desh! Welcome welcome.”', '“The fort? Climb before sun gets angry, saab.”', '“This blue? Jodhpur blue. No other blue like it.”'],
  ['“Ganga maiya ki jai! You take dip?”', '“Aarti at sunset — you must see, bhaiya.”', '“Baba is meditating 40 years. FORTY.”'],
  ['“O paaji! Come, langar is for everyone.”', '“Balle balle! You dance bhangra or not?”', '“Tractor is new, 110 horsepower. Punjab da!”'],
  ['“Slow down, chetta. Backwater life is slow life.”', '“Best fish curry? My amma makes it. Second best — that shop.”', '“Monsoon comes first to Kerala, always.”'],
  ['“Kolkata adda: we argue two hours, agree nothing, drink five chai.”', '“Durga Pujo is coming — THEN you see the city.”', '“Rosogolla is ours. Full stop.”'],
  ['“Filter kaapi, degree coffee — nothing else, saar.”', '“Marina beach at 6am — whole Chennai is walking.”', '“Rajini is not actor. Rajini is emotion.”'],
  ['“Susegad, friend. Why hurry?”', '“Feni? Careful, it looks like water. It is NOT water.”', '“Beach is that side. Everything else — also beach.”'],
];
// ---------- street vendors: they stand at their stalls and actually cook ----------
function spawnVendors() {
  if (!HERO) return;
  let count = 0;
  for (const s of vendorSpots) { if (count >= 16) break; if (Math.random() < .45) continue;
    const o = npcLook(districtAt(s.x, s.z));
    const g = makeHuman(o); g.position.set(s.x, 0, s.z); g.rotation.y = s.yaw;
    scene.add(g); vendors.push({ g, kind: s.kind, phase: rand(0, TAU), h: g.userData.human, called: 0 });
    count++; }
}
const VENDOR_CRIES = { chai: '“Chaaai chai chai! Garam chai!”', fry: '“Garam jalebi! Samosa le lo!”', panipuri: '“Pani puri, ekdum fresh!”' };
function updateVendors(dt) {
  for (const v of vendors) { const d2 = v.g.position.distanceToSquared(player.pos); if (d2 > 45 * 45) continue;
    v.phase += dt * 2.6;
    animateChar(v.g, false, dt, 0);
    const h = v.h; if (!h) continue;
    if (h.rArm) { h.rArm.rotation.x = -.55 + Math.sin(v.phase) * .3; h.rArm.rotation.z = -.28; } // stirring / ladling
    if (h.rFore) h.rFore.rotation.x = -.8 + Math.cos(v.phase) * .22;
    if (h.lArm) { h.lArm.rotation.x = -.2; h.lArm.rotation.z = .15; }
    if (h.spine) h.spine.rotation.x = .1 + Math.sin(v.phase * .5) * .05;
    v.called -= dt;
    if (d2 < 8 * 8 && v.called <= 0) { v.called = rand(9, 18); hint(VENDOR_CRIES[v.kind] || VENDOR_CRIES.chai); }
  }
}
// ---------- Bollywood: a live film shoot in Bambai — join the dance, earn an actor's fee ----------
const FILM = { x: null, z: null, dancers: [], playerIn: false, timer: 0, cool: 0 };
function buildFilmSet() {
  let p = null;
  for (let t = 0; t < 400; t++) { const x = rand(-CELL * .42, CELL * .42), z = -CELL + rand(-CELL * .42, CELL * .42);
    if (!onRoad(x, z) && !blocked(x, z) && clearOf(x, z, 4) && farFromLandmarks(x, z, 14)) { p = { x, z }; break; } }
  if (!p) return;
  FILM.x = p.x; FILM.z = p.z;
  // painted backdrop flat + scaffold
  const bc = document.createElement('canvas'); bc.width = 256; bc.height = 128; const bq = bc.getContext('2d');
  const grd = bq.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, '#7ec3e8'); grd.addColorStop(.7, '#f2d9a0'); bq.fillStyle = grd; bq.fillRect(0, 0, 256, 128);
  bq.fillStyle = '#b98ac9'; for (let m = 0; m < 5; m++) { bq.beginPath(); bq.moveTo(m * 60 - 20, 95); bq.lineTo(m * 60 + 15, 55 + (m % 2) * 12); bq.lineTo(m * 60 + 55, 95); bq.fill(); }
  bq.fillStyle = '#e8b23a'; bq.beginPath(); bq.arc(200, 30, 16, 0, TAU); bq.fill();
  const flat = new T.Mesh(new T.BoxGeometry(9, 4.6, .25), new T.MeshStandardMaterial({ map: new T.CanvasTexture(bc), roughness: .9 }));
  flat.position.set(p.x, 2.3, p.z - 3.4); flat.castShadow = true; scene.add(flat);
  for (const sx of [-3.8, 0, 3.8]) { const sc = new T.Mesh(new T.CylinderGeometry(.05, .05, 4.4, 6), mat('#5a5f66', .6)); sc.position.set(p.x + sx, 2.2, p.z - 3.7); sc.rotation.x = .18; scene.add(sc); }
  // camera on tripod + operator light rigs + director's chair
  const cam3 = new T.Group();
  for (let li = 0; li < 3; li++) { const a = li / 3 * TAU; const leg = new T.Mesh(new T.CylinderGeometry(.025, .035, 1.35, 6), mat('#2a2c30', .5));
    leg.position.set(Math.cos(a) * .34, .62, Math.sin(a) * .34); leg.rotation.z = Math.cos(a) * .45; leg.rotation.x = -Math.sin(a) * .45; cam3.add(leg); }
  const camBody = new T.Mesh(new T.BoxGeometry(.42, .3, .56), mat('#17181c', .35)); camBody.position.y = 1.42; cam3.add(camBody);
  const lens = new T.Mesh(new T.CylinderGeometry(.09, .11, .3, 12), mat('#0c0c10', .2)); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.42, .4); cam3.add(lens);
  cam3.position.set(p.x, 0, p.z + 5.2); cam3.rotation.y = Math.PI; cam3.traverse(o2 => { if (o2.isMesh) o2.castShadow = true; }); scene.add(cam3);
  for (const sx of [-4, 4]) { const stand = new T.Mesh(new T.CylinderGeometry(.04, .05, 2.6, 6), mat('#3a3c40', .5)); stand.position.set(p.x + sx, 1.3, p.z + 3.4); scene.add(stand);
    const soft = new T.Mesh(new T.BoxGeometry(.8, .8, .2), new T.MeshStandardMaterial({ color: '#fff6dd', emissive: '#ffedb8', emissiveIntensity: 1.4, roughness: .6 }));
    soft.position.set(p.x + sx, 2.7, p.z + 3.2); soft.rotation.x = .5; soft.rotation.y = sx > 0 ? -.5 : .5; scene.add(soft); }
  const chair = new T.Mesh(new T.BoxGeometry(.5, .95, .5), mat('#8a2a2a', .8)); chair.position.set(p.x + 1.6, .5, p.z + 5.6); scene.add(chair);
  buildings.push({ x: p.x, z: p.z - 3.4, hw: 4.6, hd: .4 }, { x: p.x, z: p.z + 5.2, hw: .5, hd: .5 });
}
function spawnDancers() {
  if (!HERO || FILM.x == null) return;
  for (let i = 0; i < 5; i++) {
    const o = npcLook(1); o.turban = false; o.outfit = 'silk';
    o.kurta = pick(['#e91e63', '#ffc107', '#00bcd4', '#8bc34a', '#ff5722']);
    const g = makeHuman(o); g.position.set(FILM.x + (i - 2) * 1.15, 0, FILM.z + rand(-.1, .1)); g.rotation.y = Math.PI;
    scene.add(g); FILM.dancers.push(g); }
}
function danceMove(g, t, i) { // synchronized filmi choreography, driven by shared clock
  const h = g.userData.human; if (!h) return;
  const b = t * 3.4 + i * .55, up = Math.sin(b), sway = Math.sin(b * .5);
  if (h.rArm) { h.rArm.rotation.x = -1.9 + up * .55; h.rArm.rotation.z = -.7 - up * .2; }
  if (h.lArm) { h.lArm.rotation.x = -1.9 - up * .55; h.lArm.rotation.z = .7 - up * .2; }
  if (h.rFore) h.rFore.rotation.x = -.5 + up * .3;
  if (h.lFore) h.lFore.rotation.x = -.5 - up * .3;
  if (h.spine) { h.spine.rotation.z = sway * .18; h.spine.rotation.y = up * .12; }
  if (h.head) h.head.rotation.z = -sway * .14;
  g.position.y = Math.abs(up) * .09; // bhangra bounce
}
function updateFilmSet(dt) {
  if (FILM.x == null || !FILM.dancers.length) return;
  if (FILM.cool > 0) FILM.cool -= dt;
  const d2 = (FILM.x - player.pos.x) ** 2 + (FILM.z - player.pos.z) ** 2;
  if (d2 > 70 * 70) return;
  const t = performance.now() / 1000;
  for (let i = 0; i < FILM.dancers.length; i++) { const g = FILM.dancers[i];
    animateChar(g, false, dt, 0); danceMove(g, t, i); }
  if (FILM.playerIn) {
    danceMove(player.g, t, 2.5);
    FILM.timer -= dt;
    if (FILM.timer <= 0) { FILM.playerIn = false; FILM.cool = 25; player.g.position.y = 0;
      player.cash += 300; cashSnd(); toast('🎬 CUT! Cachet d’acteur +₹300', '#8ef58e'); }
  } else if (d2 < 8 * 8 && FILM.cool <= 0 && !player.inVehicle && !player.riding) {
    hint('🎬 E — rejoindre la danse (cachet ₹300)');
  }
}
// ---------- petrol: pumps in the city + the pricier jerrican man on call ----------
const PUMPS = [];
let petrolWala = null;
function buildPetrolStations() {
  let placed = 0;
  for (let t = 0; t < 600 && placed < 5; t++) {
    const p = sidewalkSpot(); if (!p || !clearOf(p.x, p.z, 3.4)) continue;
    // orange-and-white canopy over two pumps, desi highway style
    const roof = new T.Mesh(new T.BoxGeometry(5.4, .25, 3.6), mat('#e8e2d2', .8)); roof.position.set(p.x, 3.1, p.z); roof.castShadow = true; scene.add(roof);
    const band = new T.Mesh(new T.BoxGeometry(5.5, .3, 3.7), mat('#e07020', .6)); band.position.set(p.x, 2.9, p.z); scene.add(band);
    for (const [cx2, cz2] of [[-2.4, -1.5], [2.4, -1.5], [-2.4, 1.5], [2.4, 1.5]]) {
      const pil = new T.Mesh(new T.CylinderGeometry(.09, .09, 2.9, 8), mat('#c9ccd2', .5)); pil.position.set(p.x + cx2, 1.45, p.z + cz2); scene.add(pil); }
    for (const px2 of [-1.2, 1.2]) {
      const unit = new T.Mesh(new T.BoxGeometry(.6, 1.15, .45), mat('#d94f10', .55)); unit.position.set(p.x + px2, .58, p.z); unit.castShadow = true; scene.add(unit);
      const scr = new T.Mesh(new T.BoxGeometry(.4, .3, .04), mat('#dfe8e2', .3)); scr.position.set(p.x + px2, .88, p.z + .24); scene.add(scr);
      buildings.push({ x: p.x + px2, z: p.z, hw: .45, hd: .4 }); }
    PUMPS.push({ x: p.x, z: p.z });
    placed++;
  }
}
function tryFuelPump() {
  if (!player.inVehicle) return false;
  for (const pu of PUMPS) { if ((pu.x - player.pos.x) ** 2 + (pu.z - player.pos.z) ** 2 < 7 * 7) {
    if (player.fuel > 96) { toast('⛽ Tank is full, boss', '#ffd24d'); return true; }
    if (player.cash < 40) { toast('⛽ “No money, no petrol.”', '#ff9f43'); return true; }
    player.cash -= 40; player.fuel = 100; cashSnd(); toast('⛽ Full tank −₹40', '#8ef58e'); return true; } }
  return false;
}
function callPetrolWala() {
  if (!player.inVehicle) { toast('📞 You are not even in a gaadi…', '#ffd24d'); return; }
  if (petrolWala) { toast('📞 “Aa raha hoon, aa raha hoon!”', '#ffd24d'); return; }
  if (player.cash < 150) { toast('📞 ₹150 needed for home delivery', '#ff9f43'); return; }
  const a = rand(0, TAU), sx = player.pos.x + Math.sin(a) * 60, sz = player.pos.z + Math.cos(a) * 60;
  const bike = buildBicycle(); bike.position.set(clamp(sx, -HALF + 4, HALF - 4), 0, clamp(sz, -HALF + 4, HALF - 4)); scene.add(bike);
  let rider = null;
  if (HERO) { rider = makeHuman(npcLook(districtAt(sx, sz))); bike.add(rider);
    const st = bike.userData.seat; rider.position.set(st.x, st.y, st.z);
    if (rider.userData.human) { rider.userData.human.seated = true; animateChar(rider, false, .03, 0); } }
  const can = new T.Mesh(new T.BoxGeometry(.22, .3, .16), mat('#c9a020', .6)); can.position.set(0, .85, -.6); bike.add(can); // the jerrican on the carrier
  petrolWala = { g: bike, stage: 'riding', t: 0 };
  toast('📞 “Petrol? Haan ji! 10 minute… matlab 2 minute!”', '#8ef58e');
}
function updatePetrolWala(dt) {
  const w = petrolWala; if (!w) return;
  if (w.stage === 'riding') {
    const dx = player.pos.x - w.g.position.x, dz = player.pos.z - w.g.position.z, d = Math.hypot(dx, dz);
    if (d > 3) { const sp = 7; w.g.position.x += dx / d * sp * dt; w.g.position.z += dz / d * sp * dt; w.g.rotation.y = Math.atan2(dx, dz); }
    else { w.stage = 'filling'; w.t = 2.6; toast('⛽ “Jerrican se full kar deta hoon…”', '#8ef58e'); }
  } else if (w.stage === 'filling') {
    w.t -= dt;
    if (w.t <= 0) { player.cash -= 150; player.fuel = 100; cashSnd(); toast('⛽ Full! −₹150 (home delivery, boss)', '#8ef58e'); w.stage = 'leaving'; w.t = 8; }
  } else { w.t -= dt; const away = Math.atan2(w.g.position.x - player.pos.x, w.g.position.z - player.pos.z);
    w.g.position.x += Math.sin(away) * 6 * dt; w.g.position.z += Math.cos(away) * 6 * dt; w.g.rotation.y = away;
    if (w.t <= 0) { scene.remove(w.g); petrolWala = null; } }
}
// ---------- Vehicle: auto-rickshaw ----------
function wheel(r, w) { const g = new T.Group();
  const tyre = new T.Mesh(new T.TorusGeometry(r * .72, r * .3, 10, 18), mat('#16161a', .95)); g.add(tyre);
  const hub = new T.Mesh(new T.CylinderGeometry(r * .42, r * .42, w, 12), new T.MeshStandardMaterial({ color: '#b9bec4', roughness: .35, metalness: .7 }));
  hub.rotation.x = Math.PI / 2; g.add(hub); g.rotation.y = Math.PI / 2; return g; }
function glassMat() { return new T.MeshStandardMaterial({ color: '#1c2b38', roughness: .12, metalness: .35 }); }
function chromeLight(warm) { return new T.MeshStandardMaterial({ color: warm ? '#ffdf9a' : '#ffffff', emissive: warm ? '#ffb84d' : '#dfe8ff', emissiveIntensity: .8, roughness: .2, metalness: .4 }); }
// auto-rickshaw at true Bajaj proportions: 2.6 m long, 1.3 m wide, 1.72 m tall, open sides
function buildAuto(color) {
  const g = new T.Group();
  const bodyM = mat(color, .5), blackM = mat('#1c1c20', .75), greenM = mat('#1e6b3c', .6);
  // floor pan + lower skirt
  const floor = new T.Mesh(new T.BoxGeometry(1.15, .1, 2.25), blackM); floor.position.set(0, .32, 0); g.add(floor);
  const skirt = new T.Mesh(new T.BoxGeometry(1.18, .34, 2.1), greenM); skirt.position.set(0, .5, -.02); g.add(skirt);
  // rounded front cowl (vertical half-cylinder) + windshield
  const cowl = new T.Mesh(new T.CylinderGeometry(.58, .6, .75, 14, 1, false, -Math.PI / 2, Math.PI), bodyM);
  cowl.position.set(0, .84, .78); g.add(cowl);
  const wsh = new T.Mesh(new T.BoxGeometry(1.02, .5, .04), glassMat()); wsh.rotation.x = -.14; wsh.position.set(0, 1.36, .82); g.add(wsh);
  // roof (slight dome) + rear panel + corner pillars — sides stay open so you see the driver
  const roof = new T.Mesh(new T.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI * .32), bodyM);
  roof.scale.set(.62, .28, 1.1); roof.position.set(0, 1.52, -.15); g.add(roof);
  const back = new T.Mesh(new T.BoxGeometry(1.12, .88, .06), bodyM); back.position.set(0, .98, -1.05); g.add(back);
  for (const [sx, sz] of [[-.54, .72], [.54, .72], [-.54, -1.0], [.54, -1.0]]) {
    const pil = new T.Mesh(new T.CylinderGeometry(.03, .03, .95, 6), blackM); pil.position.set(sx, 1.05, sz); g.add(pil); }
  // bench + handlebar + headlight + meter
  const bench = new T.Mesh(new T.BoxGeometry(1.02, .12, .5), blackM); bench.position.set(0, .62, -.62); g.add(bench);
  const bar = new T.Mesh(new T.CylinderGeometry(.025, .025, .55, 8), blackM); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.06, .55); g.add(bar);
  const hl = new T.Mesh(new T.SphereGeometry(.085, 10, 8), chromeLight(true)); hl.position.set(0, 1.02, 1.1); g.add(hl);
  // three small wheels (real autos ride on 8-inch wheels)
  const fw = wheel(.24, .14); fw.position.set(0, .24, .95); g.add(fw);
  for (const sx of [-.52, .52]) { const w = wheel(.24, .14); w.position.set(sx, .24, -.7); g.add(w); }
  g.userData.seat = { x: 0, y: .04, z: .1 }; // low on the bench — head stays under the canopy
  g.userData.dim = { w: .78, l: 1.42 }; g.userData.maxSpd = 13; g.userData.acc = 10;
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
  g.userData.seat = { x: .38, y: .14, z: L * .06 }; // right-hand drive, like India
  g.userData.dim = { w: .95, l: L / 2 + .15 };
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// ---------- real vehicle models (Kenney CC0 + Montreal Bus CC-BY) ----------
const VEHM = {}; // name -> { scene, scale, yawFix, seat }
const VEH_SPECS = {
  sedan:  { len: 4.4, spd: 20, acc: 14, seat: { x: .35, y: .35, z: .2 } },
  hatch:  { len: 3.8, spd: 18, acc: 13, seat: { x: .35, y: .35, z: .1 } },
  taxi:   { len: 4.4, spd: 19, acc: 13, seat: { x: .35, y: .35, z: .2 } },
  van:    { len: 4.8, spd: 16, acc: 11, seat: { x: .35, y: .45, z: .9 } },
  truck:  { len: 5.6, spd: 15, acc: 10, seat: { x: .35, y: .55, z: 1.2 } },
  suv:    { len: 4.6, spd: 19, acc: 13, seat: { x: .35, y: .45, z: .2 } },
  police: { len: 4.5, spd: 21, acc: 15, seat: { x: .35, y: .35, z: .2 } },
  moto:   { len: 2.2, spd: 20, acc: 15, open: true, seat: { x: 0, y: .55, z: -.1 } },
  bus:    { len: 9.5, spd: 14, acc: 9,  seat: { x: .4, y: .5, z: 3.4 } },
};
// street-plausible Indian paint jobs, light enough to keep the kits' texture detail
const VEH_PAINTS = {
  sedan: ['#ffffff', '#e8e8e8', '#d9c9a8', '#b8c9e8', '#c9a8a8', '#8a8f96'],
  hatch: ['#ffffff', '#e8d9b0', '#c94040', '#5577bb', '#99b9d9', '#e8e8e8'],
  suv:   ['#ffffff', '#3a3f46', '#6a7078', '#8a3030', '#e8e8e8'],
  van:   ['#ffffff', '#e8e8e8', '#d9d0b8', '#7a9ab8'],
  truck: ['#e88a2a', '#d9a030', '#c96040', '#7aa050'],   // hand-painted Tata oranges
  bus:   ['#c94040', '#d98a30', '#4a7a50', '#ffffff'],
};
function loadVehModels(cb) {
  const B = window.VEH_ASSETS;
  if (!B || !window.GLTFLoader) { cb(); return; }
  const dec = b64 => { const raw = atob(b64), u = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) u[i] = raw.charCodeAt(i); return u.buffer; };
  const keys = Object.keys(B); let left = keys.length;
  for (const k of keys) {
    try {
      // the kits reference an external Textures/colormap.png — feed the right one per kit
      const tex = (window.VEH_TEX || {})[k === 'moto' ? 'racing' : 'carkit'];
      const mgr = new T.LoadingManager();
      if (tex) mgr.setURLModifier(u => /colormap\.png/i.test(u) ? tex : u);
      const L = new window.GLTFLoader(mgr);
      L.parse(dec(B[k]), '', g => {
        const box = new T.Box3().setFromObject(g.scene);
        const size = new T.Vector3(); box.getSize(size);
        const spec = VEH_SPECS[k] || { len: 4.4, seat: { x: .35, y: .35, z: .2 } };
        const long = Math.max(size.x, size.z);
        const scale = spec.len / Math.max(.001, long);
        // closed cabins: sink the seat so the driver's head stays UNDER the roof (legs clip the floor, GTA-style)
        const seat = { ...spec.seat };
        if (!spec.open) seat.y = Math.min(seat.y, size.y * scale - 1.74);
        VEHM[k] = { scene: g.scene, scale,
          yawFix: size.x > size.z ? Math.PI / 2 : 0, // some kits model along X
          minY: box.min.y, seat,
          spd: spec.spd, acc: spec.acc,
          dim: { w: Math.min(size.x, size.z) * scale / 2 + .12, l: long * scale / 2 + .12 } };
        if (--left === 0) cb();
      }, () => { if (--left === 0) cb(); });
    } catch (e) { if (--left === 0) cb(); }
  }
}
function buildVehModel(k) {
  const M = VEHM[k]; if (!M) return null;
  const g = new T.Group();
  const m = M.scene.clone(true);
  m.scale.setScalar(M.scale);
  m.rotation.y = M.yawFix;
  m.position.y = -M.minY * M.scale; // sit on the road
  const paint = (VEH_PAINTS[k] && k !== 'taxi' && k !== 'police') ? pick(VEH_PAINTS[k]) : null;
  m.traverse(o => { if (o.isMesh) { o.castShadow = true;
    if (paint && /body/i.test(o.name)) { o.material = o.material.clone(); o.material.color = new T.Color(paint); } } });
  g.add(m);
  g.userData.seat = M.seat; g.userData.dim = M.dim;
  g.userData.maxSpd = M.spd; g.userData.acc = M.acc;
  if (k === 'police') { const bar = new T.Mesh(new T.BoxGeometry(.9, .12, .3), mat('#ff3b3b')); bar.position.set(0, 1.75, 0); g.add(bar); g.userData.bar = bar; }
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
  g.userData.seat = { x: 0, y: .5, z: -.28 };
  g.userData.dim = { w: .45, l: 1.15 }; g.userData.maxSpd = 19; g.userData.acc = 14;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// old Indian roadster bicycle (Hero/Atlas style) — rideable
function buildBicycle() {
  const g = new T.Group(); const black = mat('#1c1c20', .55);
  const chrome = new T.MeshStandardMaterial({ color: '#c2c7cd', roughness: .3, metalness: .8 });
  const tube = (a, b, r) => { const d = b.clone().sub(a), l = d.length();
    const m = new T.Mesh(new T.CylinderGeometry(r, r, l, 8), black);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    m.position.copy(a.clone().add(b).multiplyScalar(.5)); g.add(m); return m; };
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  // spoked wheels
  for (const sz of [.62, -.62]) {
    const wg = new T.Group();
    const tyre = new T.Mesh(new T.TorusGeometry(.42, .03, 10, 24), mat('#141416', .95)); wg.add(tyre);
    const rim = new T.Mesh(new T.TorusGeometry(.395, .01, 6, 24), chrome); wg.add(rim);
    for (let i = 0; i < 8; i++) { const sp = new T.Mesh(new T.CylinderGeometry(.006, .006, .76, 4), chrome);
      sp.rotation.z = i / 8 * Math.PI; wg.add(sp); }
    const hub = new T.Mesh(new T.CylinderGeometry(.03, .03, .07, 8), chrome); hub.rotation.x = Math.PI / 2; wg.add(hub);
    wg.rotation.y = Math.PI / 2; wg.position.set(0, .42, sz); g.add(wg);
    // black roadster fender over the top
    const fen = new T.Mesh(new T.CylinderGeometry(.455, .455, .06, 14, 1, true, Math.PI * (sz > 0 ? 1.05 : 1.45), Math.PI * .55), black);
    fen.rotation.z = Math.PI / 2; fen.position.set(0, .42, sz); g.add(fen);
  }
  // diamond frame
  const K = V3(0, .46, .05), S = V3(0, .93, -.28), H = V3(0, .97, .42), R = V3(0, .42, -.62), F = V3(0, .42, .62);
  tube(K, H, .024); tube(K, S, .024); tube(S, H, .022); tube(S, R, .016); tube(K, R, .016); tube(H, F, .02);
  // chainguard: full-cover disc, the desi signature
  const guard = new T.Mesh(new T.CylinderGeometry(.16, .16, .035, 14), mat('#24262c', .5));
  guard.rotation.z = Math.PI / 2; guard.position.set(.05, .46, .05); g.add(guard);
  for (const px of [-.09, .09]) { const ped = new T.Mesh(new T.BoxGeometry(.05, .025, .1), mat('#3a3a40', .8));
    ped.position.set(px, .46 + (px > 0 ? .1 : -.1), .05 + (px > 0 ? .06 : -.06)); g.add(ped); }
  // sprung leather saddle + rear carrier rack
  const seatp = new T.Mesh(new T.BoxGeometry(.17, .06, .28), mat('#4a3320', .7)); seatp.position.set(0, .97, -.3); g.add(seatp);
  const rack = new T.Mesh(new T.BoxGeometry(.15, .02, .34), chrome); rack.position.set(0, .8, -.6); g.add(rack);
  tube(V3(0, .78, -.44), V3(0, .8, -.72), .01);
  // swept-back handlebar with grips
  const hb = new T.Mesh(new T.CylinderGeometry(.016, .016, .46, 8), chrome); hb.rotation.z = Math.PI / 2; hb.position.set(0, 1.02, .42); g.add(hb);
  for (const sx of [-.23, .23]) { const grip = new T.Mesh(new T.CylinderGeometry(.022, .022, .09, 8), black);
    grip.rotation.z = Math.PI / 2; grip.position.set(sx, 1.02, .38); g.add(grip); }
  const bell = new T.Mesh(new T.SphereGeometry(.03, 8, 6), chrome); bell.position.set(.1, 1.04, .44); g.add(bell);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.seat = { x: 0, y: .42, z: -.3 };
  g.userData.dim = { w: .35, l: 1.0 }; g.userData.maxSpd = 7.5; g.userData.acc = 5.5;
  return g;
}
// stunt ramps (tremplins) on paved roads — drive up, fly off
const ramps = [];
function buildRamps() {
  const rM = mat('#7a5a34', .95), sM = mat('#5c4326', .95); // weathered wood planks
  let placed = 0;
  for (let tries = 0; tries < 500 && placed < 4; tries++) {
    const p = roadSpot(); if (!p) continue;
    const kx = Math.round((p.x + HALF) / STEP), kz = Math.round((p.z + HALF) / STEP);
    // sit on a paved road, aligned with it
    const fx = ((p.x % STEP) + STEP) % STEP, alongZ = fx < ROADW && dirtV.has(kx);
    const alongX = !alongZ && dirtH.has(kz);
    if (!alongZ && !alongX) continue; // stunt ramps hide on the dirt lanes, Vice-City style
    const yaw = alongZ ? 0 : Math.PI / 2;
    const len = 8.5, w = 4.6, h = 2.6;
    const angle = Math.atan2(h, len);
    const slabLen = Math.sqrt(len * len + h * h);
    const slab = new T.Mesh(new T.BoxGeometry(w, .35, slabLen), rM);
    slab.rotation.y = yaw; slab.rotateX(-angle);
    slab.position.set(p.x, h / 2 - .05, p.z); slab.castShadow = true; slab.receiveShadow = true; scene.add(slab);
    // low side boards flush with the deck (no floating legs look)
    for (const sx of [-1, 1]) {
      const rail = new T.Mesh(new T.BoxGeometry(.12, .22, slabLen), sM);
      rail.rotation.y = yaw; rail.rotateX(-angle);
      const off = new T.Vector3(sx * (w / 2 - .06), h / 2 + .06, 0).applyAxisAngle(new T.Vector3(0, 1, 0), yaw);
      rail.position.set(p.x + off.x, off.y, p.z + off.z); rail.castShadow = true; scene.add(rail); }
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
    let g = null, kind = '';
    if (VEHM.sedan) { // real models: Kenney kit + bus + our Bajaj / Enfield / roadster cycle
      kind = r < .3 ? 'auto' : r < .41 ? 'moto' : r < .52 ? 'taxi' : r < .6 ? 'sedan' : r < .67 ? 'hatch' :
             r < .73 ? 'suv' : r < .79 ? 'van' : r < .84 ? 'truck' : r < .89 ? 'bus' : r < .95 ? 'cycle' : 'enfield';
      g = kind === 'auto' ? buildAuto(pick(['#f4c20d', '#207a4a', '#1a1a1e'])) :
          kind === 'enfield' ? buildEnfield() : kind === 'cycle' ? buildBicycle() : buildVehModel(kind);
    }
    if (!g) { kind = r < .34 ? 'auto' : r < .5 ? 'hatch' : r < .68 ? 'sedan' : r < .82 ? 'taxi' : r < .92 ? 'cycle' : 'enfield';
      g = kind === 'auto' ? buildAuto(pick(['#f4c20d', '#207a4a', '#1a1a1e'])) :
          kind === 'enfield' ? buildEnfield() : kind === 'cycle' ? buildBicycle() : buildCar(kind); }
    g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU);
    scene.add(g);
    const dim = g.userData.dim || { w: .95, l: 2.2 };
    const v = { g, kind, yaw: g.rotation.y, speed: 0, ai: true, aiDir: rand(0, TAU), aiTimer: 0,
      hw: dim.w, hl: dim.l,
      horn: kind === 'cycle' ? 4 : (kind === 'truck' || kind === 'bus') ? 2 :
            Math.random() < .22 ? 3 : (kind === 'moto' || kind === 'auto') ? 1 : 0 };
    if (kind === 'cycle') { v.cruise = rand(2, 3.5); }
    // riders are always visible on two-wheelers; autos often carry a hireable driver
    const isBike = kind === 'moto' || kind === 'enfield' || kind === 'cycle';
    if (HERO && isBike) {
      const o = { skin: pick(SKINS), turban: Math.random() < .3, turbanColor: pick(TURBANS),
        kurta: pick(KURTAS), dhoti: pick(DHOTIS), beard: pick(BEARDS), moustache: true,
        outfit: pick(['kurta', 'kurta', 'khadi', 'silk']), hair: pick(['crop', 'crop', 'part', 'curly']) };
      const d = makeHuman(o); const seat = g.userData.seat;
      g.add(d); d.position.set(seat.x, seat.y, seat.z);
      if (d.userData.human) { d.userData.human.seated = true; animateChar(d, false, .03, 0); }
      v.driver = { g: d, fare: kind === 'cycle' ? randi(15, 40) : randi(40, 90) };
    }
    else if (HERO && kind !== 'cycle' && r < .6 && Math.random() < .55) {
      const o = { skin: pick(SKINS), turban: Math.random() < .5, turbanColor: pick(TURBANS),
        kurta: pick(KURTAS), dhoti: pick(DHOTIS), beard: pick(BEARDS), moustache: true,
        outfit: pick(['kurta', 'kurta', 'khadi', 'sherwani']), hair: pick(['crop', 'part', 'curly']) };
      const d = makeHuman(o); const seat = g.userData.seat || { x: 0, y: .55, z: .3 };
      g.add(d); d.position.set(seat.x, seat.y, seat.z);
      if (d.userData.human) { d.userData.human.seated = true; animateChar(d, false, .03, 0); }
      v.driver = { g: d, fare: randi(60, 150) };
    }
    vehicles.push(v); }
}

// ---------- Player ----------
const player = { g: null, pos: new T.Vector3(0, 0, 4), yaw: 0, vel: new T.Vector3(),
  health: 100, fuel: 100, cash: 500, dharma: 50, inVehicle: null, moving: false, speed: 0 }; // pocket money for tickets & autos
// India doesn't run on money alone: your izzat/dharma (conduct) opens doors that cash can't.
// And "log kya kahenge" — a misdeed WITNESSED costs far more face than one done in an empty lane.
function karma(d) {
  if (d < 0) { let wit = 0;
    for (const n of npcs) { if (!n.dead && n.down <= 0 && n.g.position.distanceToSquared(player.pos) < 15 * 15) wit++; }
    d *= 1 + Math.min(2.5, wit * .25); }
  player.dharma = clamp(player.dharma + d, 0, 100);
}
const cam = { yaw: 0, pitch: 0.2, dist: 5.4 };

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
  if (k === 'p') callPetrolWala();
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
  // pointerdown covers finger AND mouse \u2014 the on-screen buttons work on PC too
  const bind = (id, fn) => { const el = $(id); if (!el) return;
    el.addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
    el.addEventListener('touchstart', e => e.preventDefault(), { passive: false }); };
  bind('tAct', () => { if (player.nego) acceptRide(); else tryEnterExit(); });
  bind('tPunch', punch); bind('tSpit', spit);
  bind('tRadio', () => { if (player.inVehicle) { const st = Radio.switch(); toast('\ud83d\udcfb ' + st.name, '#8ef58e'); } });
  bind('tPhone', callPetrolWala);
  bind('tE', () => { if (player.nego) haggle(); else tryVisit(); });
  bind('tSnd', () => { const p = $('sndPanel'); if (p) p.classList.toggle('on'); });
  for (const key of ['horns', 'amb', 'sfx']) { const el = $('snd_' + key); if (!el) continue;
    const paint = () => { el.classList.toggle('on', !!sndCfg[key]); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); sndCfg[key] = !sndCfg[key]; saveSnd(); paint(); }); paint(); }
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
  v.g.add(player.g); player.g.position.set(0, .06, -.68); player.g.rotation.set(0, 0, 0); // tucked INSIDE the cab
  const u = player.g.userData; if (u.human) u.human.seated = true;
  player.riding = v; player.rideT = 0; player.rideDur = rand(16, 26);
  Radio.setOn(true);
  toast('\ud83d\udee9 Chalo! \u20b9' + n.fare, '#8ef58e');
}
function haggle() {
  const n = player.nego; if (!n) return;
  n.tries++;
  // your reputation haggles with you: high dharma softens drivers, a badmash gets nowhere
  const odds = clamp(.35 + player.dharma / 160, .35, .92);
  if (n.tries <= 2 && Math.random() < odds) {
    n.fare = Math.max(15, Math.round(n.fare * rand(.6, .85)));
    n.veh.driver.fare = n.fare;
    toast(pick(LINES.ok) + ' \u20b9' + n.fare, '#8ef58e');
  } else {
    toast(pick(LINES.no) + ' \u2014 il red\u00e9marre', '#ff9f43');
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
  Radio.setOn(false); karma(2); // paid the man his fare \u2014 izzat intact
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
      // this is India, not a punching bag: some get up ANGRY and swing back, others bolt
      if (n.mood !== 'fight') n.mood = Math.random() < .45 ? 'fight' : 'flee';
      n.moodT = n.mood === 'fight' ? rand(9, 16) : rand(4, 7);
      if (n.mood === 'fight') toast(label + '  — “Abey!! 😡”', '#ff9f43'); else toast(label, '#ff9f43');
      crime(1); karma(-1.5); spark(n.g.position); break; }
  }
  // a good kick tips a stall right over
  for (const b of buildings) { if (!b.parts) continue;
    if ((fx - b.x) ** 2 + (fz - b.z) ** 2 < 2.2 * 2.2) { smashProp(b, Math.sin(player.yaw), Math.cos(player.yaw), 6); break; } }
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
const spitParts = [], sparks = [], debris = [];
// smash a stall / cart: its pieces fly with the hit, tumble, and stay lying in the street
function smashProp(b, dirx, dirz, force) {
  if (!b.parts) return;
  for (const m of b.parts) {
    debris.push({ m, vx: dirx * force * rand(.35, .7) + rand(-1.5, 1.5), vy: rand(1.5, 3.5 + force * .3),
      vz: dirz * force * rand(.35, .7) + rand(-1.5, 1.5),
      rx: rand(-4, 4), rz: rand(-4, 4), life: rand(.9, 1.5) });
  }
  b.parts = null; b.hw = 0; b.hd = 0; // no longer blocks anything
  AudioSysCrash(); crime(1); karma(-2); // somebody's livelihood, that was
}
function spark(pos) { for (let i = 0; i < 8; i++) { const m = new T.Mesh(new T.SphereGeometry(.08, 5, 5), new T.MeshBasicMaterial({ color: '#ffd24d' }));
  m.position.copy(pos); m.position.y = 1; scene.add(m); sparks.push({ m, vx: rand(-3, 3), vy: rand(2, 5), vz: rand(-3, 3), life: .5 }); } }
function horn() { const v = player.inVehicle; hornSound(.55, .16, v ? (v.horn == null ? (v.kind === 'cycle' ? 4 : 0) : v.horn) : 0); }

// ---------- wanted / crime / bribe (light) ----------
let wanted = 0, heat = 0, wantedTimer = 0;
const cops = [];
function crime(a) { heat += a; if (heat >= 3) { heat = 0; wanted = clamp(wanted + 1, 0, 5); wantedTimer = 12; updateStars(); if (cops.length < wanted) spawnCop(); } }
function spawnCop() { const p = roadSpot(); if (!p) return;
  const g = (VEHM.police && buildVehModel('police')) || buildCar('cop');
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
  if (best.corrupt) { if (player.cash >= cost) { player.cash -= cost; wanted = 0; heat = 0; cops.forEach(c => scene.remove(c.g)); cops.length = 0; updateStars(); cashSnd(); karma(-3); toast('BRIBE ACCEPTED 🤝  −₹' + cost, '#8ef58e'); }
    else toast('Need ₹' + cost, '#ffd24d'); }
  else { toast('HONEST COP! 🚨', '#ff6b6b'); wanted = clamp(wanted + 1, 0, 5); wantedTimer = 14; updateStars(); }
}

// ---------- Audio ----------
let actx, amaster, sirenNode = null, ambOn = false;
function ensureAudio() { if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); amaster = actx.createGain(); amaster.gain.value = .5; amaster.connect(actx.destination); } catch (e) {} }
// low, unpitched city bed — distant traffic rumble, no notes, no melody
function startAmbience() { if (!actx || ambOn) return; ambOn = true;
  const len = actx.sampleRate * 3, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.2; }
  const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480;
  const g = actx.createGain(); g.gain.value = .05;
  const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = .07; lg.gain.value = .018;
  lfo.connect(lg); lg.connect(g.gain);
  src.connect(lp); lp.connect(g); g.connect(amaster); src.start(); lfo.start();
  ambGain = g; if (!sndCfg.amb) g.gain.value = 0;
}
// Indian horns: every vehicle has its own — fresh two-tone, tinny scooter beep,
// truck air-horn, a tired dying horn — and a cycle bell. `vol` is pre-attenuated by distance.
function hornSound(dur, vol, kind) {
  if (!actx || vol <= 0.002 || !sndCfg.horns) return; const t = actx.currentTime; kind = kind || 0;
  const out = actx.createGain(); out.connect(amaster);
  const env = (g, v, d2, tail) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02);
    g.gain.setValueAtTime(v, t + Math.max(.03, d2 - (tail || .05))); g.gain.linearRampToValueAtTime(0, t + d2); };
  if (kind === 4) { // cycle bell: two bright pings
    for (const [f, dt2] of [[1420, 0], [1420, .14]]) { const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f; const o2 = actx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.51;
      g.gain.setValueAtTime(vol, t + dt2); g.gain.exponentialRampToValueAtTime(.001, t + dt2 + .22);
      o.connect(g); o2.connect(g); g.connect(out); o.start(t + dt2); o.stop(t + dt2 + .25); o2.start(t + dt2); o2.stop(t + dt2 + .25); }
    return; }
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2;
  const g = actx.createGain(); bp.connect(g); g.connect(out);
  if (kind === 1) { // tinny scooter beep — short, high, a bit rude
    bp.frequency.value = 1350; env(g, vol, Math.min(dur, .22));
    const o = actx.createOscillator(); o.type = 'square'; o.frequency.value = 830; o.connect(bp); o.start(t); o.stop(t + .25);
  } else if (kind === 2) { // truck/bus air-horn: low detuned pair, long
    bp.frequency.value = 520; bp.Q.value = 1.4; const d2 = Math.max(dur, .6); env(g, vol * 1.25, d2, .12);
    for (const f of [255, 322]) { const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(bp); o.start(t); o.stop(t + d2 + .02); }
  } else if (kind === 3) { // tired horn: sags in pitch, crackles, nearly gives up
    bp.frequency.value = 760; env(g, vol, dur);
    const o = actx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(505, t); o.frequency.linearRampToValueAtTime(348, t + dur);
    const wob = actx.createOscillator(), wg = actx.createGain(); wob.frequency.value = 13; wg.gain.value = vol * .5;
    wob.connect(wg); wg.connect(g.gain);
    o.connect(bp); o.start(t); o.stop(t + dur + .02); wob.start(t); wob.stop(t + dur + .02);
  } else { // fresh two-tone — the classic
    bp.frequency.value = 900; env(g, vol, dur);
    for (const f of [420, 528]) { const o = actx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(bp); o.start(t); o.stop(t + dur + .02); }
  }
}
function AudioSysCrash() { if (!actx || !sndCfg.sfx) return; const t = actx.currentTime, b = actx.createBufferSource(), buf = actx.createBuffer(1, 4410, 44100), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const g = actx.createGain(); g.gain.value = .25; b.buffer = buf; b.connect(g); g.connect(amaster); b.start(t); }
function blip(f, d, ty, v) { if (!actx || !sndCfg.sfx) return; const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.type = ty || 'square'; o.frequency.value = f; g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(amaster); o.start(t); o.stop(t + d); }
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
  if (!started || player.riding || tour) return;
  if (player.inVehicle) { tryFuelPump(); return; } // at a pump, E fills the tank
  // on the Bambai film set, E puts you in the number
  if (FILM.x != null && !FILM.playerIn && FILM.cool <= 0 && (FILM.x - player.pos.x) ** 2 + (FILM.z - player.pos.z) ** 2 < 8 * 8) {
    FILM.playerIn = true; FILM.timer = 9; karma(2); toast('\ud83c\udfac ACTION! Suis la chor\u00e9!', '#ffd24d'); return; }
  for (const l of landmarks) {
    if ((l.x - player.pos.x) ** 2 + (l.z - player.pos.z) ** 2 > 18 * 18) continue;
    const M = MONUMENTS[l.d];
    if (l.d === 4) { // Harmandir Sahib: no ticket, ever \u2014 and seva restores your izzat like nothing else
      tour = { d: l.d, i: 0, next: 0, guided: true };
      karma(8); toast('\ud83d\ude4f Langar seva \u2014 sab barabar (tous \u00e9gaux)', '#8ef58e'); return; }
    if (player.cash >= 90) { player.cash -= 90; karma(3); tour = { d: l.d, i: 0, next: 0, guided: true };
      toast('\ud83c\udfab Ticket + guide \u2212\u20b990', '#8ef58e'); }
    else if (player.cash >= 50) { player.cash -= 50; karma(2); tour = { d: l.d, i: 0, next: 0, guided: false };
      toast('\ud83c\udfab Ticket \u2212\u20b950', '#8ef58e'); }
    else toast('Need \u20b950 for a ticket', '#ffd24d');
    return;
  }
  // rob the fallen \u2014 quick money, heavy shame (and the poor barely carry anything)
  for (const n of npcs) { if ((n.down <= 0 && !n.dead) || n.looted) continue;
    if (n.g.position.distanceToSquared(player.pos) < 2.2 * 2.2) {
      const take = n.wealth === 2 ? randi(150, 600) : n.wealth === 1 ? randi(30, 150) : randi(5, 40);
      n.looted = true; player.cash += take; karma(-6); crime(1); cashSnd();
      toast('\ud83e\udef3 +\u20b9' + take + (n.wealth === 0 ? ' \u2014 c\u2019\u00e9tait tout ce qu\u2019il avait\u2026' : n.wealth === 2 ? ' \u2014 portefeuille de seth!' : ''), '#ffd24d');
      return; } }
  // feeding the street's animals is everyday piety
  for (const c of cows) { if (c.g.position.distanceToSquared(player.pos) < 3.2 * 3.2 && player.cash >= 5) {
    player.cash -= 5; karma(2); toast('\ud83c\udf3e Chara for gau mata \u2212\u20b95 \u00b7 +dharma', '#8ef58e'); return; } }
  for (const d of dogs) { if (d.g.position.distanceToSquared(player.pos) < 2.6 * 2.6 && player.cash >= 5) {
    player.cash -= 5; karma(1.5); d.nap = 0; toast('\ud83c\udf6a Biscuit for the doggie \u2212\u20b95 \u00b7 +dharma', '#8ef58e'); return; } }
  // no monument? then it's a chat: people answer you \u2014 in their district's own way
  let bestN = null, bd = 2.6 * 2.6;
  for (const n of npcs) { if (n.down > 0 || n.dead || n.mood) continue;
    const d2 = n.g.position.distanceToSquared(player.pos); if (d2 < bd) { bd = d2; bestN = n; } }
  if (bestN) {
    bestN.g.rotation.y = Math.atan2(player.pos.x - bestN.g.position.x, player.pos.z - bestN.g.position.z);
    bestN.pause = 3;
    const di = districtAt(bestN.g.position.x, bestN.g.position.z);
    const line = (player.dharma < 25 && Math.random() < .4) ? '\u201cSharam karo! (Aie honte!)\u201d \ud83d\ude20' : pick(CHAT[di] || CHAT[0]);
    toast(line, '#ffe9b8');
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

// REAL Indian radio — live web streams, no synthesized music, ever.
// On page load we ask the radio-browser.info directory for India's most-listened stations;
// if that fails (offline / sandboxed page) we fall back to well-known stream URLs.
// A dead stream auto-skips to the next station.
const Radio = {
  idx: 0, on: false, el: null, fails: 0,
  stations: [
    { name: 'Radio Mirchi 98.3 (Bollywood)', url: 'https://radioindia.net/radio/mirchi98/icecast.audio' },
    { name: 'Bombay Beats', url: 'https://radioindia.net/radio/sc-bb/icecast.audio' },
    { name: 'Radio City 91.1 Hindi', url: 'https://prclive4.listenon.in/Hindi' },
    { name: 'AIR Vividh Bharati', url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio005/hlspbaudio00564kbps.m3u8' },
  ],
  init() { // enrich with live-verified stations from the public directory (runs in the player's browser)
    try {
      fetch('https://de1.api.radio-browser.info/json/stations/search?country=India&order=clickcount&reverse=true&limit=30&hidebroken=true')
        .then(r => r.json())
        .then(list => { const good = list
          .filter(s => /^https:/.test(s.url_resolved) && /mp3|aac/i.test(s.codec || ''))
          .slice(0, 9).map(s => ({ name: s.name.trim().slice(0, 34), url: s.url_resolved }));
          if (good.length >= 3) this.stations = good; })
        .catch(() => {});
    } catch (e) {}
  },
  ensure() { if (this.el) return; this.el = new Audio(); this.el.volume = .55;
    this.el.onerror = () => this.skipDead(); },
  play() { const st = this.stations[this.idx]; this.el.src = st.url;
    const p = this.el.play(); if (p && p.catch) p.catch(() => this.skipDead()); },
  skipDead() { if (!this.on) return; this.fails++;
    if (this.fails > this.stations.length) { this.on = false; try { this.el.pause(); } catch (e) {}
      toast('📻 radio indisponible hors ligne', '#ffd24d'); return; }
    this.idx = (this.idx + 1) % this.stations.length; this.play(); },
  setOn(v) { this.ensure(); this.on = v; this.fails = 0;
    if (v) this.play(); else { try { this.el.pause(); } catch (e) {} } },
  switch() { this.ensure(); this.fails = 0; this.idx = (this.idx + 1) % this.stations.length;
    if (this.on) this.play(); return this.stations[this.idx]; },
  tick() {}
};
// ---------- UI helpers ----------
function toast(text, color) { const b = $('toastBig'); b.textContent = text; b.style.color = color || '#fff'; b.style.opacity = 1; b.style.transform = 'translateY(-10px) scale(1.05)'; clearTimeout(toast._t); toast._t = setTimeout(() => { b.style.opacity = 0; b.style.transform = 'translateY(0) scale(1)'; }, 1100); }
function showBanner(title, fact) { const el = $('banner'); $('bTitle').textContent = title; $('bFact').textContent = fact; el.classList.add('show'); clearTimeout(showBanner._t); showBanner._t = setTimeout(() => el.classList.remove('show'), 4200); }
let hintT = 0; function hint(t) { const el = $('hint'); el.textContent = t; el.style.opacity = 1; hintT = .12; }

// ---------- collision ----------
function blocked(x, z) { if (Math.abs(x) > HALF - 1 || Math.abs(z) > HALF - 1) return true;
  for (const b of buildings) { if (Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd) return true; } return false; }
// push a walking body out of a vehicle's oriented box — nobody phases through metal
function pushOutOfVehicle(pos, v, pr) {
  const dx = pos.x - v.g.position.x, dz = pos.z - v.g.position.z;
  const hw = (v.hw || .95), hl = (v.hl || 2.2);
  if (dx * dx + dz * dz > (hl + pr) * (hl + pr)) return;
  const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
  const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy; // world → vehicle local (forward = +lz)
  const cx = clamp(lx, -hw, hw), cz = clamp(lz, -hl, hl);
  let ox = lx - cx, oz = lz - cz, d2 = ox * ox + oz * oz;
  if (d2 >= pr * pr) return;
  let nlx = lx, nlz = lz;
  if (d2 > 1e-6) { const d = Math.sqrt(d2); nlx = cx + ox / d * pr; nlz = cz + oz / d * pr; }
  else { // inside the box: exit by the nearest face
    const exs = [hw + pr - lx, lx + hw + pr, hl + pr - lz, lz + hl + pr];
    const m = Math.min(...exs);
    if (m === exs[0]) nlx = hw + pr; else if (m === exs[1]) nlx = -hw - pr;
    else if (m === exs[2]) nlz = hl + pr; else nlz = -hl - pr;
  }
  pos.x = v.g.position.x + nlx * cy + nlz * sy; // vehicle local → world
  pos.z = v.g.position.z - nlx * sy + nlz * cy;
}

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
    else hint('\ud83d\udefa ' + (n.line || (n.line = pick(LINES.hail))) + ' \u20b9' + n.fare + ' \u2014 E hop in \u00b7 N haggle');
  }
  updateTour(dt, performance.now());

  if (scandal) { scandal.t -= dt; if (scandal.t <= 0) scandal = null; }
  updateNPCs(dt); updateCows(dt); updateVehicles(dt); updateCops(dt); updateMonkeys(dt); updateDogs(dt); recycleLife(dt);
  updateVendors(dt); updateFilmSet(dt); updatePetrolWala(dt);
  Radio.tick();
  updateParticles(dt);

  // district banner
  const di = districtAt(player.pos.x, player.pos.z);
  if (di !== curDistrict) { curDistrict = di; $('distName').textContent = DISTRICTS[di].name; showBanner(DISTRICTS[di].greet, DISTRICTS[di].fact); }

  // sun follows player so shadows stay crisp
  if (sun) { sun.position.set(player.pos.x + 36, 48, player.pos.z + 20); sun.target.position.copy(player.pos); sun.target.updateMatrixWorld(); }
  // camera follow
  // GTA-style soft follow: camera settles behind the character while moving
  if (!player.inVehicle && player.moving && !(cam.freeUntil > performance.now()))
    cam.yaw = angLerp(cam.yaw, player.yaw, Math.min(1, dt * 1.6));
  const shoulder = player.inVehicle ? 0 : .55; // over-the-right-shoulder offset
  const sx = Math.cos(cam.yaw) * shoulder, sz = -Math.sin(cam.yaw) * shoulder;
  const tgt0 = player.inVehicle ? player.inVehicle.g.position : player.pos;
  const target = new T.Vector3(tgt0.x + sx, tgt0.y, tgt0.z + sz);
  const cd = player.inVehicle ? 9 : cam.dist;
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
  if (player.inVehicle && player.fuel < 30) hint('⛽ Réservoir bas — E à la pompe (₹40) · P petrol-wala à domicile (₹150)');
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
  // the world is solid: cars, cows and people all have bodies
  for (const v of vehicles) pushOutOfVehicle(player.pos, v, .42);
  for (const c of cows) { const dx = player.pos.x - c.g.position.x, dz = player.pos.z - c.g.position.z, d2 = dx * dx + dz * dz;
    if (d2 < 1.3 * 1.3 && d2 > 1e-6) { const d = Math.sqrt(d2); player.pos.x = c.g.position.x + dx / d * 1.3; player.pos.z = c.g.position.z + dz / d * 1.3; } }
  for (const n of npcs) { if (n.down > 0) continue; const dx = n.g.position.x - player.pos.x, dz = n.g.position.z - player.pos.z, d2 = dx * dx + dz * dz;
    if (d2 < .8 * .8 && d2 > 1e-6) { const d = Math.sqrt(d2); // shoulder through the crowd — they give way
      const nx2 = player.pos.x + dx / d * .8, nz2 = player.pos.z + dz / d * .8;
      if (!blocked(nx2, nz2)) { n.g.position.x = nx2; n.g.position.z = nz2; } } }
  player.g.position.copy(player.pos); player.g.rotation.y = player.yaw;
  animateChar(player.g, player.moving, dt, 3.4 * sprint);
}
function updateDrive(dt, f, s) {
  const v = player.inVehicle;
  const mx = v.g.userData.maxSpd || 20, ac = v.g.userData.acc || 14;
  if (player.fuel <= 0) v.speed *= .96;
  else v.speed += f * dt * ac;
  v.speed *= .985; v.speed = clamp(v.speed, -mx * .4, mx);
  // responsive steering: quick at city speed, settles a little at top speed
  if (Math.abs(v.speed) > .2) { const damp = clamp(1 - Math.abs(v.speed) / 46, .62, 1); v.yaw -= s * dt * 1.7 * damp * Math.sign(v.speed) * clamp(Math.abs(v.speed) / 4, .35, 1); }
  // plough through a stall and it EXPLODES into its pieces (slow bumps still just stop you)
  if (Math.abs(v.speed) > 4.5) for (const b of buildings) { if (!b.parts) continue;
    if (Math.abs(v.g.position.x - b.x) < b.hw + 1 && Math.abs(v.g.position.z - b.z) < b.hd + 1) {
      smashProp(b, Math.sin(v.yaw) * Math.sign(v.speed), Math.cos(v.yaw) * Math.sign(v.speed), Math.abs(v.speed));
      v.speed *= .78; damage(3); spark(v.g.position); toast('💥 “Mera thela!!”', '#ff9f43'); break; } }
  const nx = v.g.position.x + Math.sin(v.yaw) * v.speed * dt, nz = v.g.position.z + Math.cos(v.yaw) * v.speed * dt;
  if (!blocked(nx, v.g.position.z)) v.g.position.x = nx; else v.speed *= -.3;
  if (!blocked(v.g.position.x, nz)) v.g.position.z = nz; else v.speed *= -.3;
  // metal on metal: you cannot drive through other vehicles
  for (const o of vehicles) { if (o === v) continue;
    const rr = (v.hl || 2) * .8 + (o.hl || 2) * .8;
    const dx = v.g.position.x - o.g.position.x, dz = v.g.position.z - o.g.position.z, d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), push = (rr - d);
      v.g.position.x += dx / d * push; v.g.position.z += dz / d * push;
      if (Math.abs(v.speed) > 5) { damage(5); AudioSysCrash(); spark(v.g.position); crime(1); }
      o.speed *= .3; v.speed *= -.32; break; } }
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
  player.speed = v.speed; if (!(cam.freeUntil > performance.now())) cam.yaw = angLerp(cam.yaw, v.yaw, Math.min(1, dt * 3.2)); // camera keeps up with the steering
  animateChar(player.g, false, dt, 0); // seated driving pose
  // run over npcs/cows
  for (const n of npcs) { if (n.down > 0 || n.dead) continue;
    if (n.g.position.distanceToSquared(v.g.position) < 2.2 && Math.abs(v.speed) > 3) {
      if (Math.abs(v.speed) > 7) { // fatal: the body stays — and the street's scavengers take care of it
        n.dead = true; n.g.rotation.z = Math.PI / 2; n.g.position.y = .18; corpses.push({ n, eaten: 0 });
        crime(2); karma(-8); spark(n.g.position); toast('HIT & RUN', '#ff6b6b');
      } else { n.down = 5; n.g.rotation.z = Math.PI / 2; n.g.position.y = .3; crime(1); spark(n.g.position); toast('HIT & RUN', '#ff6b6b'); } } }
  for (const c of cows) { if (c.down > 0) continue;
    if (c.g.position.distanceToSquared(v.g.position) < 4 && Math.abs(v.speed) > 3) {
      // hitting a cow is a SCANDAL — she is sacred. The whole street comes running, furious.
      c.down = 24; c.g.rotation.z = Math.PI / 2 * .88; c.g.position.y = .3;
      scandal = { x: c.g.position.x, z: c.g.position.z, t: 22 };
      crime(3); karma(-18); toast('🐄 GAU MATA!! SCANDALE!', '#ff4d4d'); hornSound(.9, .12, 2);
      for (const n of npcs) { if (n.down > 0) continue; // the closest witnesses turn on you
        if (n.g.position.distanceToSquared(v.g.position) < 20 * 20 && Math.random() < .3) { n.mood = 'fight'; n.moodT = rand(10, 18); } }
    } }
}
function wanderMesh(o, dt, speedScale) {
  o.t += dt; if (Math.random() < .01) o.dir += rand(-1, 1);
  const nx = o.g.position.x + Math.sin(o.dir) * o.speed * dt, nz = o.g.position.z + Math.cos(o.dir) * o.speed * dt;
  if (!blocked(nx, nz) && Math.abs(nx) < HALF - 1 && Math.abs(nz) < HALF - 1) { o.g.position.x = nx; o.g.position.z = nz; o.g.rotation.y = o.dir; }
  else o.dir += 2;
}
function nearPlayerSpot(rmin, rmax, wantSidewalk) {
  for (let i = 0; i < 30; i++) {
    const a = rand(0, TAU), r = rand(rmin, rmax);
    const x = clamp(player.pos.x + Math.sin(a) * r, -HALF + 4, HALF - 4);
    const z = clamp(player.pos.z + Math.cos(a) * r, -HALF + 4, HALF - 4);
    if (wantSidewalk ? (onSidewalk(x, z) && !blocked(x, z)) : onRoad(x, z)) return { x, z };
  }
  return null;
}
let recycleT = 0;
function recycleLife(dt) {
  recycleT -= dt; if (recycleT > 0) return; recycleT = .4;
  for (const n of npcs) { if (n.down > 0) continue;
    if (n.g.position.distanceToSquared(player.pos) > 130 * 130) { const p = nearPlayerSpot(35, 75, true);
      if (p) { n.g.position.set(p.x, 0, p.z); n.pause = 0; } } }
  for (const v of vehicles) { if (v === player.inVehicle || v === player.riding || v.hired || !v.ai) continue;
    if (v.g.position.distanceToSquared(player.pos) > 170 * 170) { const p = nearPlayerSpot(55, 110, false);
      if (p) { v.g.position.set(p.x, 0, p.z); } } }
  for (const d of dogs) { if (d.g.position.distanceToSquared(player.pos) > 140 * 140) { const p = nearPlayerSpot(30, 70, true); if (p) d.g.position.set(p.x, 0, p.z); } }
}
function updateNPCs(dt) {
  // corpses shrink away as the dogs and monkeys feed, then the person quietly respawns elsewhere
  for (let ci = corpses.length - 1; ci >= 0; ci--) { const c = corpses[ci];
    if (c.eaten > 5) c.n.g.scale.multiplyScalar(Math.max(0, 1 - dt * .12));
    if (c.n.g.scale.x < .3) { const p = nearPlayerSpot(45, 90, true);
      c.n.g.scale.setScalar(1); c.n.g.rotation.z = 0; c.n.g.position.y = 0; c.n.dead = false; c.n.mood = null;
      if (p) { c.n.g.position.x = p.x; c.n.g.position.z = p.z; } corpses.splice(ci, 1); } }
  for (const n of npcs) { if (n.dead) continue;
  if (n.down > 0) { n.down -= dt; if (n.down <= 0) { n.g.rotation.z = 0; n.g.position.y = 0; } continue; }
  if (n.mood) { // punched people react: brawlers close in and swing, the rest run for it
    n.moodT -= dt;
    const dx = player.pos.x - n.g.position.x, dz = player.pos.z - n.g.position.z, d = Math.hypot(dx, dz);
    if (n.moodT <= 0 || d > 40 || player.inVehicle) { n.mood = null; }
    else if (n.mood === 'fight') {
      n.g.rotation.y = Math.atan2(dx, dz);
      if (d > 1.5) { const sp = 3.6, nx = n.g.position.x + dx / d * sp * dt, nz = n.g.position.z + dz / d * sp * dt;
        if (!blocked(nx, nz)) { n.g.position.x = nx; n.g.position.z = nz; }
        n.swing = 0; animateChar(n.g, true, dt, sp);
      } else {
        n.swing = (n.swing || 0) - dt;
        if (n.swing <= 0) { n.swing = rand(.9, 1.6); n.g.userData.attack = { kind: randi(0, 3), t: 1 }; n.hitDone = false; blip(180, .08, 'square', .12); }
        const a = n.g.userData.attack;
        if (a && !n.hitDone && a.t < .55 && d < 1.8) { n.hitDone = true; damage(7); spark(player.pos); }
        animateChar(n.g, false, dt, 0);
      }
      continue;
    } else { // flee, arms pumping
      const dir = Math.atan2(-dx, -dz); n.g.rotation.y = dir;
      const sp = 4.6, nx = n.g.position.x + Math.sin(dir) * sp * dt, nz = n.g.position.z + Math.cos(dir) * sp * dt;
      if (!blocked(nx, nz)) { n.g.position.x = nx; n.g.position.z = nz; } else n.g.rotation.y += 1.5;
      animateChar(n.g, true, dt, sp * 1.4);
      continue;
    }
  }
  if (scandal) { // a cow is down: everyone nearby drops what they're doing and crowds around, furious
    const dx = scandal.x - n.g.position.x, dz = scandal.z - n.g.position.z, d2 = dx * dx + dz * dz;
    if (d2 < 42 * 42) { const d = Math.hypot(dx, dz) || 1;
      if (d > rand(2.2, 3.6)) { const sp = 3.4, nx = n.g.position.x + dx / d * sp * dt, nz = n.g.position.z + dz / d * sp * dt;
        n.g.rotation.y = Math.atan2(dx, dz);
        if (!blocked(nx, nz)) { n.g.position.x = nx; n.g.position.z = nz; }
        animateChar(n.g, true, dt, sp); }
      else { n.g.rotation.y = Math.atan2(dx, dz); // ring around the cow, shaking fists
        if (Math.random() < .008) n.g.userData.attack = { kind: randi(0, 2), t: 1 };
        animateChar(n.g, false, dt, 0); }
      continue; } }
  if (n.pause > 0) { n.pause -= dt; animateChar(n.g, false, dt, 0); continue; }
  if (Math.random() < .003) { n.pause = rand(1.5, 5); animateChar(n.g, false, dt, 0); continue; }
  wanderMesh(n, dt); if (n.g.position.distanceToSquared(player.pos) < 70 * 70) animateChar(n.g, true, dt, n.speed * 2.4); } }
let scandal = null; // { x, z, t } — an angry crowd forms here (sacred cow knocked down)
function updateCows(dt) { for (const c of cows) {
  if (c.down > 0) { c.down -= dt; if (c.down <= 0) { c.g.rotation.z = 0; c.g.position.y = 0; } continue; }
  wanderMesh(c, dt); } }
let honkNext = 0;
function updateVehicles(dt) {
  // India runs on the horn — but only when traffic is actually around you, each vehicle with its own horn
  if (actx && performance.now() > honkNext) { honkNext = performance.now() + rand(2600, 7500);
    const near = vehicles.filter(v => v.ai && Math.abs(v.speed) > .5 && v.g.position.distanceToSquared(player.pos) < 28 * 28);
    if (near.length && Math.random() < .65) { const hv = pick(near);
      const d = Math.sqrt(hv.g.position.distanceToSquared(player.pos));
      hornSound(rand(.3, .65), .09 * (1 - d / 30), hv.horn == null ? 0 : hv.horn); } }
  for (const v of vehicles) { if (v.driver && v.g.position.distanceToSquared(player.pos) < 70 * 70) animateChar(v.driver.g, false, dt, 0); }
  for (const v of vehicles) { if (v === player.inVehicle || !v.ai) continue;
    v.aiTimer -= dt; if (v.aiTimer <= 0) { v.aiDir = Math.round(v.aiDir / (Math.PI / 2)) * (Math.PI / 2) + (Math.random() < .3 ? (Math.random() < .5 ? Math.PI / 2 : -Math.PI / 2) : 0); v.aiTimer = rand(2, 5); }
    // brake for whoever is in the road ahead (player, cows, pedestrians) — with an angry horn
    let blockAhead = false;
    const ax = v.g.position.x + Math.sin(v.aiDir) * 4, az = v.g.position.z + Math.cos(v.aiDir) * 4;
    if (!player.inVehicle && !player.riding) {
      const dp2 = (player.pos.x - ax) ** 2 + (player.pos.z - az) ** 2;
      if (dp2 < 3.4 * 3.4) { blockAhead = true;
        if (actx && Math.random() < .02) hornSound(.4, .09, v.horn || 0);
        const dHit = v.g.position.distanceToSquared(player.pos);
        if (dHit < 2 * 2 && v.speed > 2.5) { damage(18); // clipped by traffic
          player.pos.x += Math.sin(v.aiDir) * 1.6; player.pos.z += Math.cos(v.aiDir) * 1.6;
          if (player.g) player.g.position.copy(player.pos); toast('OUCH!', '#ff6b6b'); v.speed *= .3; } } }
    if (!blockAhead) for (const c of cows) { if ((c.g.position.x - ax) ** 2 + (c.g.position.z - az) ** 2 < 3.4 * 3.4) { blockAhead = true; break; } }
    if (!blockAhead) for (const n of npcs) { if (n.down > 0) continue; if ((n.g.position.x - ax) ** 2 + (n.g.position.z - az) ** 2 < 2.4 * 2.4) { blockAhead = true; break; } }
    // traffic never rolls through other traffic: brake behind whoever is ahead
    if (!blockAhead) for (const o of vehicles) { if (o === v) continue;
      const rr = 2.2 + (o.hl || 2);
      if ((o.g.position.x - ax) ** 2 + (o.g.position.z - az) ** 2 < rr * rr) { blockAhead = true;
        if (actx && Math.random() < .012 && v.g.position.distanceToSquared(player.pos) < 26 * 26) hornSound(.35, .05, v.horn || 0); break; } }
    if (blockAhead) { v.speed = lerp(v.speed, 0, .25); }
    else v.speed = lerp(v.speed, v.cruise || (v.cruise = rand(4, 7.5)), .04); const nx = v.g.position.x + Math.sin(v.aiDir) * v.speed * dt, nz = v.g.position.z + Math.cos(v.aiDir) * v.speed * dt;
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
  // smashed-stall pieces: fly, tumble, land, and stay there
  for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i];
    d.m.position.x += d.vx * dt; d.m.position.z += d.vz * dt; d.m.position.y += d.vy * dt; d.vy -= 12 * dt;
    d.m.rotation.x += d.rx * dt; d.m.rotation.z += d.rz * dt;
    if (d.m.position.y < .1 && d.vy < 0) { d.m.position.y = .1; d.vy = 0; d.vx *= .6; d.vz *= .6; d.rx *= .5; d.rz *= .5; }
    d.life -= dt; if (d.life <= 0) debris.splice(i, 1); } // pieces simply rest where they fell
  // cooking steam drifting off the stalls near you
  const now2 = performance.now();
  if (!updateParticles._st || now2 > updateParticles._st) { updateParticles._st = now2 + 240;
    for (const s of steams) { if ((s.x - player.pos.x) ** 2 + (s.z - player.pos.z) ** 2 > 40 * 40) continue;
      if (steamPuffs.length > 40) break;
      const m = new T.Mesh(new T.PlaneGeometry(.26, .26), new T.MeshBasicMaterial({ color: '#e8e8e8', transparent: true, opacity: .34, depthWrite: false }));
      m.position.set(s.x + rand(-s.r, s.r), s.y, s.z + rand(-s.r, s.r)); scene.add(m);
      steamPuffs.push({ m, life: 1.3 }); } }
  for (let i = steamPuffs.length - 1; i >= 0; i--) { const s = steamPuffs[i];
    s.m.position.y += dt * .75; s.m.material.opacity -= dt * .26; s.m.lookAt(camera.position); s.m.scale.multiplyScalar(1 + dt * .8);
    s.life -= dt; if (s.life <= 0) { scene.remove(s.m); steamPuffs.splice(i, 1); } }
}
function updateHUD() {
  $('hpFill').style.width = player.health + '%'; $('fuelFill').style.width = player.fuel + '%';
  $('cash').textContent = '₹' + Math.max(0, player.cash | 0).toLocaleString('en-IN');
  $('kmh').textContent = player.inVehicle ? Math.round(Math.abs(player.speed) * 6) : '—';
  $('gearv').textContent = player.inVehicle ? (player.inVehicle.kind === 'cycle' ? 'CYCLE' : 'AUTO') : 'ON FOOT';
  const dh = $('dharma'); if (dh) { const v = Math.round(player.dharma);
    dh.textContent = '🪷 ' + v; dh.style.color = v >= 60 ? '#9be89b' : v >= 30 ? '#ffe9a8' : '#ff8a8a'; }
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
  chipRow('chOutfit', [{ t: 'Sherwani (brocade)', v: 'sherwani' }, { t: 'Kurta', v: 'kurta' }, { t: 'Silk kurta', v: 'silk' }, { t: 'Khadi', v: 'khadi' }, { t: 'Bandhgala', v: 'bandhgala' }], () => opts.outfit, v => opts.outfit = v);
  chipRow('chHair', HAIRS.map(([v, t]) => ({ t, v })), () => opts.hair, v => { opts.hair = v; opts.turban = false; });
  swatchRow('swHair', HAIRCOLS, () => opts.hairColor, v => opts.hairColor = v);
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
  $('controls').innerHTML = '<b>Thumbstick</b> / WASD move · <b>drag</b> look<br><b>F</b> drive · <b>E</b> talk/visit · <b>J</b> fight · <b>T</b> spit · <b>B</b> bribe<br><b>R</b> radio · <b>P</b> petrol-wala · <b>M</b> map';
  startAmbience(); // low city rumble — mutable in the 🔊 panel
  // build player from chosen opts
  player.pos.copy(findSpawn());
  player.g = makeCharacter(opts); player.g.position.copy(player.pos); scene.add(player.g);
  spawnNPCs(40); spawnCows(9); spawnVehicles(32); spawnMonkeys(12); spawnDogs(13);
  spawnVendors(); spawnDancers(); // the rigged human is loaded by now — staff the stalls, roll camera
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
  const R2 = Math.min(W, H) / 2;
  g.beginPath(); g.arc(W / 2, H / 2, R2 - 2, 0, TAU); g.clip();
  g.fillStyle = '#101014'; g.fillRect(0, 0, W, H);
  const scale = 2.1, mx = (player.pos.x + HALF) / WORLD * 1024, mz = (player.pos.z + HALF) / WORLD * 1024;
  g.translate(W / 2, H / 2 + 20); g.rotate(cam.yaw + Math.PI); g.scale(scale, scale); g.translate(-mx, -mz);
  g.drawImage(mapCanvas, 0, 0);
  g.fillStyle = '#4a86ff';
  for (const c of cops) { const cx2 = (c.g.position.x + HALF) / WORLD * 1024, cz2 = (c.g.position.z + HALF) / WORLD * 1024;
    g.beginPath(); g.arc(cx2, cz2, 2.4, 0, TAU); g.fill(); }
  // GTA-style blips: services and landmarks, never raw traffic
  g.fillStyle = '#57b9e8';
  for (const pu of PUMPS) { const px2 = (pu.x + HALF) / WORLD * 1024, pz2 = (pu.z + HALF) / WORLD * 1024;
    g.fillRect(px2 - 2.6, pz2 - 2.6, 5.2, 5.2); }
  if (FILM.x != null) { g.fillStyle = '#e85794'; const fx2 = (FILM.x + HALF) / WORLD * 1024, fz2 = (FILM.z + HALF) / WORLD * 1024;
    g.beginPath(); g.arc(fx2, fz2, 3, 0, TAU); g.fill(); }
  g.restore();
  g.save(); g.translate(W / 2, H / 2 + 20);
  g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -14); g.lineTo(10, 11); g.lineTo(0, 5.5); g.lineTo(-10, 11); g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.fillStyle = 'rgba(16,16,20,.72)'; g.beginPath(); g.arc(W / 2, H / 2, Math.min(W, H) / 2 - 2, Math.PI * 1.18, Math.PI * 1.82); g.arc(W / 2, H / 2, Math.min(W, H) / 2 - 30, Math.PI * 1.82, Math.PI * 1.18, true); g.fill();
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
  const BUILD = 'build 19'; if ($('buildTag')) $('buildTag').textContent = BUILD;
  Radio.init(); // fetch tonight's real Indian stations (works online; harmless offline)
  // load the rigged human; the creator shows the procedural fallback until ready
  const btn = $('enterBtn'); btn.disabled = true; btn.textContent = 'Loading your Raja…';
  const enable = () => { btn.disabled = false; btn.textContent = '▶ Enter the City'; };
  const failsafe = setTimeout(enable, 7000);
  loadHero(h => { if (h) HERO = h; window.__heroOk = !!h; loadVehModels(() => { clearTimeout(failsafe); enable(); rebuildPreview(); }); });
  window.__tp = (x, z) => { player.pos.set(x, 0, z); if (player.inVehicle) { player.inVehicle.g.position.set(x, 0, z); } };
  window.__tpkind = (k) => { const v = vehicles.find(v2 => v2.kind === k); if (!v) return false;
    player.pos.set(v.g.position.x + 2, 0, v.g.position.z); player.g.position.copy(player.pos); return v.g.position.toArray(); };
  window.__tpveh = () => { if (!vehicles.length) return false; const v = vehicles[0];
    player.pos.set(v.g.position.x + 2.2, 0, v.g.position.z); if (player.g) player.g.position.copy(player.pos); return true; };
  window.__lookveh = () => { // stand facing the first Kenney-model vehicle
    const v = vehicles.find(v2 => v2.g.userData.seat && v2.g.children[0] && v2.g.children[0].type === 'Group');
    if (!v) return false; v.ai = false; v.speed = 0;
    player.pos.set(v.g.position.x, 0, v.g.position.z - 6.5);
    if (player.g) player.g.position.copy(player.pos);
    cam.yaw = 0; cam.freeUntil = performance.now() + 9999; return true; };
  window.__tpvehN = (i) => { const v = vehicles[i % vehicles.length]; if (!v) return false;
    player.pos.set(v.g.position.x + 3, 0, v.g.position.z - 2); if (player.g) player.g.position.copy(player.pos); return true; };
  window.__tpdriver = () => { const v = vehicles.find(v2 => v2.driver); if (!v) return false;
    player.pos.set(v.g.position.x + 2.2, 0, v.g.position.z); if (player.g) player.g.position.copy(player.pos); return true; };
  window.__state = () => ({ nego: !!player.nego, fare: player.nego ? player.nego.fare : -1, riding: !!player.riding, cash: player.cash });
  window.__facefront = () => { previewSpin = false; if (pChar) pChar.rotation.y = 0; };
  window.__opts = opts;
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
