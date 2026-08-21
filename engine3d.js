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
const HAIRS_F = [['bun','Chignon'],['long','Long'],['braid','Natte'],['curly','Bouclé']];
const HAIRCOLS = ['#0d0a08','#15100b','#2b1a10','#4a2f18','#6a6a6a'];
// comfort first, GTA-style: horns, city ambience and SFX each have their own switch
let ambGain = null;
const sndCfg = (() => { try { return Object.assign({ horns: true, amb: true, sfx: true, voice: false }, JSON.parse(localStorage.getItem('sk_snd') || '{}')); } catch (e) { return { horns: true, amb: true, sfx: true, voice: false }; } })();
function saveSnd() { try { localStorage.setItem('sk_snd', JSON.stringify(sndCfg)); } catch (e) {} if (ambGain) ambGain.gain.value = sndCfg.amb ? .05 : 0; }

// ---------- Character builder (low-poly humanoid) ----------
function mat(color, rough, metal, emissive) {
  const m = new T.MeshStandardMaterial({ color: new T.Color(color), roughness: rough == null ? .88 : rough, metalness: metal == null ? .02 : metal });
  if (emissive) { m.emissive = new T.Color(emissive); m.emissiveIntensity = .7; }
  return m;
}
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
let HEROINE = null; // Michelle (three.js examples / Mixamo) — a real rigged dancer with her own authentic dance clip
function loadHeroine(cb) {
  const B = window.HEROINE_ASSETS;
  if (!B || !window.GLTFLoader) { cb(null); return; }
  const dec = b64 => { const raw = atob(b64), u = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) u[i] = raw.charCodeAt(i); return u.buffer; };
  try {
    new window.GLTFLoader().parse(dec(B.michelle), '', av => {
      const box = new T.Box3().setFromObject(av.scene);
      const dance = (av.animations || []).find(a => /samba|dance/i.test(a.name));
      if (!dance) { cb(null); return; }
      cb({ scene: av.scene, dance, height: Math.max(.1, box.max.y - box.min.y) });
    }, () => cb(null));
  } catch (e) { cb(null); }
}
function makeMichelle() { // the film-set star, dancing her own motion-captured number (one of her — the original scene, bind intact)
  if (HEROINE.used) return null;
  HEROINE.used = true;
  const g = new T.Group();
  const m = HEROINE.scene;
  // Mixamo rigs measure in centimetres: the skinned result is 100× the geometry box, so size her by the hip bone's real height
  m.updateMatrixWorld(true);
  let hipsB = null; m.traverse(n => { if (n.isBone && /Hips$/.test(n.name)) hipsB = n; });
  const hy = hipsB ? hipsB.getWorldPosition(new T.Vector3()).y : 0;
  const est = hy > 3 ? hy / .56 : HEROINE.height;
  m.scale.setScalar(1.66 / est);
  g.add(m);
  const mixer = new T.AnimationMixer(m);
  const a = mixer.clipAction(HEROINE.dance); a.play();
  g.userData.mMixer = mixer;
  g.traverse(n => { if (n.isMesh || n.isSkinnedMesh) { n.castShadow = true; n.frustumCulled = false; } });
  return g;
}
function loadHero(cb) {
  const B = window.HERO_ASSETS;
  if (!B || !window.GLTFLoader || !window.skeletonClone) { cb(null); return; }
  const dec = b64 => { const raw = atob(b64), u = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) u[i] = raw.charCodeAt(i); return u.buffer; };
  try {
    const L = new window.GLTFLoader();
    L.parse(dec(B.raja), '', av => {
      // surgery: flatten the tuxedo's MODELLED bow tie into the chest so no outfit ever shows neckwear
      av.scene.traverse(n => { if (!(n.isMesh || n.isSkinnedMesh)) return;
        if (!/Outfit_Top/i.test((n.material && n.material.name) || '')) return;
        const pos = n.geometry.attributes.position;
        for (let vi = 0; vi < pos.count; vi++) { const x = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi);
          if (y > 1.4 && y < 1.68 && Math.abs(x) < .1 && z > .045) pos.setZ(vi, .042);            // bow tie
          else if (y > 1.02 && y <= 1.5 && Math.abs(x) < .16 && z > .088) pos.setZ(vi, .086); }   // lapel ridges → one smooth closed front
        pos.needsUpdate = true; n.geometry.computeVertexNormals(); });
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
      // official FEMININE idle & walk — same skeleton, a woman's gait for the women of the city
      const F = window.FEM_ANIMS;
      if (F) { left += 2; grab(F.idle, 'FIdle'); grab(F.walk, 'FWalk'); }
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
const embCache = {};
function makeEmbroideredKurta(baseHex) { // the poster look: plain rich cloth, gold-embroidered placket and collar
  if (embCache[baseHex]) return embCache[baseHex];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = baseHex; g.fillRect(0, 0, S, S);
  g.globalAlpha = .05; // cloth grain — darken ONLY; light lines read as pinstripes on dark cloth
  for (let y = 0; y < S; y += 3) { g.fillStyle = '#000'; g.fillRect(0, y, S, 1); }
  g.globalAlpha = 1;
  // NO bright bands — unknown UVs would paint them onto the collar like neckwear.
  // Just fine allover gold motifs on the dark cloth, poster-style.
  for (let i = 0; i < 120; i++) { const x = rand(0, S), y = rand(0, S);
    g.strokeStyle = 'rgba(201,162,39,.32)'; g.lineWidth = .8;
    g.beginPath(); g.arc(x, y, rand(.8, 1.7), 0, TAU); g.stroke();
    if (Math.random() < .4) { g.beginPath(); g.moveTo(x - 2, y + 3); g.quadraticCurveTo(x, y + 5, x + 2, y + 3); g.stroke(); } }
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping;
  embCache[baseHex] = tex; return tex;
}
const plaidCache = {};
function makePlaidTexture(c1, c2) { // the checked lungi cloth of every Indian street
  const key = c1 + c2; if (plaidCache[key]) return plaidCache[key];
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, S, S);
  g.globalAlpha = .55; g.fillStyle = c2;
  for (let x = 0; x < S; x += 22) g.fillRect(x, 0, 9, S);
  for (let y = 0; y < S; y += 22) g.fillRect(0, y, 9, S);
  g.globalAlpha = 1; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.2;
  for (let x = 16; x < S; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
  for (let y = 16; y < S; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(3, 3);
  plaidCache[key] = tex; return tex;
}
const fabricCache = {};
function makeFabricTexture(baseHex) { // woven cloth: weave grain + soft vertical fall-folds, so clothes stop looking like plastic
  if (fabricCache[baseHex]) return fabricCache[baseHex];
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = baseHex; g.fillRect(0, 0, S, S);
  g.globalAlpha = .05; // darkening grain only — light lines striped every kurta and sari like pinstriped suits
  for (let y = 0; y < S; y += 3) { g.fillStyle = '#000'; g.fillRect(0, y, S, 1); }
  g.globalAlpha = .04;
  for (let x = 0; x < S; x += 4) { g.fillStyle = '#000'; g.fillRect(x, 0, 1, S); }
  g.globalAlpha = .12; // fall of the cloth: broad soft vertical folds
  for (let f = 0; f < 7; f++) { const x = (f + .5) * S / 7 + rand(-4, 4);
    const gr = g.createLinearGradient(x - 9, 0, x + 9, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.4, 'rgba(0,0,0,.55)'); gr.addColorStop(.6, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - 9, 0, 18, S); }
  g.globalAlpha = 1;
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(2, 1);
  fabricCache[baseHex] = tex; return tex;
}
function makeTurbanTexture(baseHex) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = baseHex; g.fillRect(0, 0, S, S);
  // wrapped-cloth folds: STRONG diagonal bands with crisp shadow edges — cloth, not plastic
  for (let i = -S; i < S * 2; i += 11) {
    const grd = g.createLinearGradient(i, 0, i + 11, S);
    grd.addColorStop(0, 'rgba(0,0,0,.34)'); grd.addColorStop(.45, 'rgba(255,255,255,.13)'); grd.addColorStop(.55, 'rgba(255,255,255,.05)'); grd.addColorStop(1, 'rgba(0,0,0,.3)');
    g.fillStyle = grd; g.save(); g.translate(i, 0); g.rotate(0.5); g.fillRect(0, -S, 10, S * 3); g.restore();
  }
  g.globalAlpha = .1; // thread grain along the wrap
  for (let y = 0; y < S; y += 2) { g.fillStyle = '#000'; g.save(); g.translate(0, y); g.rotate(.5); g.fillRect(-S, 0, S * 3, 1); g.restore(); }
  g.globalAlpha = 1;
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(4, 2);
  if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; return tex;
}
// accessories authored in metres around the head centre
const ACC = { turbY: 0.10, turbZ: 0.0, beardY: -0.085, beardZ: 0.055, mouY: -0.045, mouZ: 0.095 };
function buildHeadgear(o) {
  const g = new T.Group();
  if (o.turban) {
    // a REAL pagdi is wound cloth: stacked visible wraps, matte, each ring slightly askew — never a smooth dome
    const tM = new T.MeshStandardMaterial({ color: '#ffffff', map: makeTurbanTexture(o.turbanColor), roughness: .96, metalness: 0 });
    // under-wrap dome seals the scalp — sits HIGH, the brow and eyes stay fully clear
    const cap = new T.Mesh(new T.SphereGeometry(0.099, 20, 16), tM);
    cap.scale.set(1.02, .78, 1.03); cap.position.y = ACC.turbY - 0.028; g.add(cap);
    const wraps = [
      [0.110, 0.016, -0.026, 0, .02],
      [0.108, 0.017, -0.004, .05, -.03],
      [0.094, 0.016, 0.016, -.04, .04],
      [0.072, 0.015, 0.034, .05, -.02],
    ];
    for (const [r, tube, y, rx, rz] of wraps) {
      const ring = new T.Mesh(new T.TorusGeometry(r, tube, 10, 26), tM);
      ring.rotation.x = Math.PI / 2 + rx; ring.rotation.z = rz;
      ring.scale.set(1, 1.02, .72); ring.position.y = ACC.turbY + y; g.add(ring); // squashed: bands of cloth, not donuts
    }
    const peak = new T.Mesh(new T.SphereGeometry(0.046, 12, 10), tM); peak.scale.y = .62; peak.position.y = ACC.turbY + 0.046; g.add(peak);
    // the larh: the wrap's tail hanging at the back of the neck
    const tail = new T.Mesh(new T.BoxGeometry(0.05, 0.14, 0.014), tM);
    tail.position.set(0.02, ACC.turbY - 0.13, -0.1); tail.rotation.x = .2; tail.rotation.z = .1; g.add(tail);
    const jewel = new T.Mesh(new T.SphereGeometry(0.015, 12, 12), mat('#ffd700', .25)); jewel.position.set(0, ACC.turbY - 0.005, 0.114); g.add(jewel);
  }
  else if (o.hair && o.hair !== 'none') { // Indian hairstyles (shown when no pagdi)
    const hM = new T.MeshStandardMaterial({ color: new T.Color(o.hairColor || '#15100b'), roughness: .48, metalness: .1 }); // oiled sheen breaks the helmet look
    const cap = new T.Mesh(new T.SphereGeometry(0.094, 18, 14), hM);
    cap.scale.set(1.0, .8, .98); cap.position.set(0, ACC.turbY - 0.026, -0.016); g.add(cap);
    if (o.hair === 'part') { // side-parted quiff, oiled and combed
      const quiff = new T.Mesh(new T.SphereGeometry(0.055, 12, 10), hM);
      quiff.scale.set(1.5, .55, .9); quiff.position.set(0.02, ACC.turbY + 0.008, 0.055); quiff.rotation.z = -.18; g.add(quiff);
    } else if (o.hair === 'jura') { // top-knot bun
      const bun = new T.Mesh(new T.SphereGeometry(0.042, 12, 10), hM);
      bun.position.set(0, ACC.turbY + 0.045, -0.02); g.add(bun);
    } else if (o.hair === 'jata') { // matted locks piled into a jata-mukuta crown
      for (let i = 0; i < 3; i++) { const coil = new T.Mesh(new T.TorusGeometry(.052 - i * .013, .021, 8, 14), hM);
        coil.rotation.x = Math.PI / 2; coil.position.set(0, ACC.turbY + .012 + i * .031, -.012); g.add(coil); }
      const top = new T.Mesh(new T.SphereGeometry(.025, 8, 6), hM); top.position.set(0, ACC.turbY + .105, -.012); g.add(top);
      for (const sx of [-1, 1]) { const lock = new T.Mesh(new T.CylinderGeometry(.012, .008, .3, 6), hM);
        lock.position.set(.084 * sx, ACC.turbY - .17, -.05); lock.rotation.z = .1 * sx; g.add(lock); }
    } else if (o.hair === 'bun') { // low bun at the nape, parted on top
      const bun = new T.Mesh(new T.SphereGeometry(0.05, 12, 10), hM);
      bun.position.set(0, ACC.turbY - 0.1, -0.095); g.add(bun);
    } else if (o.hair === 'braid') { // long plait swinging down the back
      for (let i = 0; i < 8; i++) { const bead = new T.Mesh(new T.SphereGeometry(.034 - i * .0022, 8, 6), hM);
        bead.position.set(Math.sin(i * .9) * .012, ACC.turbY - 0.09 - i * .052, -0.095 - i * .012); g.add(bead); }
      const tass = new T.Mesh(new T.ConeGeometry(.016, .05, 6), mat('#c0392b', .6));
      tass.rotation.x = Math.PI; tass.position.set(0, ACC.turbY - 0.09 - 8 * .052, -0.19); g.add(tass);
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
    // a beard hugs the JAW — flattened against the face, never a floating ball
    const bc = o.hairColor || '#1a120c';
    const bM = mat(bc, .92);
    const b = new T.Mesh(new T.SphereGeometry(0.08, 16, 14), bM);
    if (o.beard === 'stubble') { b.scale.set(.95, .48, .42); b.position.set(0, ACC.beardY + .01, ACC.beardZ - .018); }
    else if (o.beard === 'full') { b.scale.set(.95, .72, .46); b.position.set(0, ACC.beardY, ACC.beardZ - .014); }
    else { b.scale.set(.9, 1.25, .44); b.position.set(0, ACC.beardY - .045, ACC.beardZ - .012); }
    g.add(b);
    for (const sx of [-1, 1]) { // sideburns tie the beard into the hairline
      const sb = new T.Mesh(new T.SphereGeometry(.032, 8, 6), bM);
      sb.scale.set(.7, 1.7, .8); sb.position.set(.078 * sx, -.02, .028); g.add(sb); }
  }
  if (o.moustache) { const m = new T.Mesh(new T.TorusGeometry(0.035, 0.012, 8, 14, Math.PI), mat(o.hairColor || '#1a120c', .9));
    m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI; m.position.set(0, ACC.mouY, ACC.mouZ); g.add(m); }
  if (o.bindi) { const b = new T.Mesh(new T.CircleGeometry(0.0062, 10), new T.MeshBasicMaterial({ color: '#a01020' }));
    b.position.set(0, 0.03, 0.1035); g.add(b); } // the bindi: a small dot, not a sticker
  if (o.tilak === 'shaiva') { // tripundra: three pale ash stripes across the forehead
    for (let i = 0; i < 3; i++) { // a dark underlay keeps the stripes readable even on ash-pale naga skin
      const u = new T.Mesh(new T.PlaneGeometry(.056, .009), new T.MeshBasicMaterial({ color: '#57503f' }));
      u.position.set(0, 0.045 - i * .012, 0.1030); g.add(u);
      const s = new T.Mesh(new T.PlaneGeometry(.052, .0065), new T.MeshBasicMaterial({ color: '#f2ecd9' }));
      s.position.set(0, 0.045 - i * .012, 0.1032); g.add(s); }
    const dot = new T.Mesh(new T.CircleGeometry(.006, 8), new T.MeshBasicMaterial({ color: '#c0392b' })); dot.position.set(0, 0.033, 0.1036); g.add(dot);
  } else if (o.tilak === 'vaishnav') { // the U-shaped urdhva pundra
    for (const sx of [-1, 1]) { const s = new T.Mesh(new T.PlaneGeometry(.006, .045), new T.MeshBasicMaterial({ color: '#f2ecd9' }));
      s.position.set(.011 * sx, 0.038, 0.1032); s.rotation.z = -.12 * sx; g.add(s); }
    const c2 = new T.Mesh(new T.PlaneGeometry(.006, .04), new T.MeshBasicMaterial({ color: '#c94a10' })); c2.position.set(0, 0.036, 0.1034); g.add(c2);
  }
  if (o.earrings) { const gm = new T.MeshStandardMaterial({ color: '#e8c85a', metalness: .7, roughness: .25 });
    for (const sx of [-1, 1]) { const ring = new T.Mesh(new T.TorusGeometry(.014, .004, 6, 12), gm);
      ring.position.set(.086 * sx, -.048, .008); g.add(ring);
      const drop = new T.Mesh(new T.SphereGeometry(.007, 6, 5), gm); drop.position.set(.086 * sx, -.066, .008); g.add(drop); } }
  g.traverse(x => { if (x.isMesh) x.castShadow = true; });
  return g;
}
function makeHuman(o) {
  const grp = new T.Group();
  const F = false; // street characters share the one reliable rig; Michelle dances on the film set with her own clip
  const SRC = HERO;
  const model = window.skeletonClone(SRC.scene);
  const s = SRC === HERO ? 1.8 / SRC.height * (o.vary ? rand(.93, 1.05) : 1) * (o.female ? .94 : 1) : 1;
  model.scale.setScalar(s);
  grp.add(model);
  const skinTint = new T.Color(o.skin); { const hsl = { h: 0, s: 0, l: 0 }; skinTint.getHSL(hsl);
    skinTint.setHSL(hsl.h, Math.min(1, hsl.s * 1.32), Math.min(.9, hsl.l * 1.12)); } // warm without going neon-orange on the hands
  // the RPM Outfit_Top is cut like a SUIT JACKET — no recolour ever hides that. So for bare
  // chests (naga, aghori, bathers) and true kurtas we DROP the jacket mesh entirely and build
  // the torso and arms ourselves on the bones (RPM deletes the body faces under clothes).
  const bareTorso = !o.female && !!o.naga;
  const kurtaCut = !o.female && !bareTorso && (o.outfit === 'kurta' || o.outfit === 'khadi' || !!o.lungi);
  model.traverse(n => { if (!(n.isMesh || n.isSkinnedMesh)) return;
    n.castShadow = true; n.frustumCulled = false;
    const mn = (n.material && n.material.name) || '';
    n.material = n.material.clone();
    if (/Outfit_Top/i.test(mn) && (bareTorso || kurtaCut)) { n.visible = false; return; }
    if (/Outfit_Top/i.test(mn)) { // the SKINNED garment mesh follows the body perfectly (no holes, no clipping)
      n.material = n.material.clone();
      // CRUCIAL: strip the baked-in suit detailing — lapels, pocket seams, button rows live in these maps
      n.material.normalMap = null; n.material.roughnessMap = null; n.material.metalnessMap = null; n.material.aoMap = null;
      if (o.female) { n.material.map = makeFabricTexture(o.dhoti || '#c2185b'); n.material.color = new T.Color('#ffffff'); n.material.roughness = .5; } // sari blouse
      else if (o.outfit === 'kurta') { n.material.map = makeFabricTexture(o.kurta); n.material.color = new T.Color('#ffffff'); n.material.roughness = .85; }
      else if (o.outfit === 'silk') { n.material.map = makeFabricTexture(o.kurta); n.material.color = new T.Color('#ffffff'); n.material.roughness = .3; n.material.metalness = .15; }
      else if (o.outfit === 'khadi') { n.material.map = makeTurbanTexture(o.kurta); n.material.color = new T.Color('#ffffff'); n.material.roughness = 1; }
      else if (o.outfit === 'bandhgala') { n.material.map = makeFabricTexture(shadeHex(o.kurta, -80)); n.material.color = new T.Color('#ffffff'); n.material.roughness = .5; }
      else { n.material.map = makeEmbroideredKurta(o.kurta); n.material.color = new T.Color('#ffffff'); n.material.roughness = .88; }
      n.material.needsUpdate = true; }
    else if (/Outfit_Bottom/i.test(mn)) { n.material = n.material.clone();           // churidar / pyjama in REAL cloth
      n.material.normalMap = null; n.material.roughnessMap = null;
      n.material.map = makeFabricTexture(o.dhoti || '#efe6d0'); n.material.color = new T.Color('#ffffff'); n.material.roughness = .9; }
    else if (/Footwear/i.test(mn)) { n.material = n.material.clone();                // leather juttis — or bare feet
      if (o.barefoot) { n.material.map = null; n.material.normalMap = null; n.material.roughnessMap = null;
        n.material.color = skinTint.clone(); n.material.roughness = .85; }
      else n.material.color = new T.Color('#4a3626'); }
    else if (/Skin|Body/i.test(mn) && !/Ch03/i.test(mn)) n.material.color = skinTint; // face + body skin tone (Michelle keeps her own painted texture)
    else if (/Headwear/i.test(mn)) n.visible = false;                                // replaced by our pagdi
    else if (/Beard/i.test(mn)) { n.visible = o.moustache !== false;               // this mesh is actually the moustache
      n.material = n.material.clone(); n.material.color = new T.Color(o.hairColor || '#1a120c'); } // matched to the beard, never grey-vs-black
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
  if (o.female) { // feminine silhouette on the shared rig: narrow shoulders, lighter frame
    model.traverse(n => { if (n.isBone && /Shoulder$/.test(n.name)) n.scale.setScalar(.82); });
    grp.updateMatrixWorld(true);
  }
  // ---- the real outfit: a bone-draped kurta (the avatar's western tailcoat stays hidden) ----
  {
    const kc = o.kurta || '#ffffff';
    const outfitM = o.female
      ? new T.MeshStandardMaterial({ color: '#ffffff', map: makeFabricTexture(kc), roughness: .32, metalness: .1, side: T.DoubleSide }) :
      o.outfit === 'kurta' ? new T.MeshStandardMaterial({ color: '#ffffff', map: makeFabricTexture(kc), roughness: .85, side: T.DoubleSide }) :
      o.outfit === 'silk' ? new T.MeshStandardMaterial({ color: '#ffffff', map: makeFabricTexture(kc), roughness: .32, metalness: .12, side: T.DoubleSide }) :
      o.outfit === 'khadi' ? new T.MeshStandardMaterial({ color: '#ffffff', map: makeTurbanTexture(kc), roughness: 1, side: T.DoubleSide }) :
      o.outfit === 'bandhgala' ? new T.MeshStandardMaterial({ color: '#ffffff', map: makeFabricTexture(shadeHex(kc, -80)), roughness: .48, metalness: .1, side: T.DoubleSide }) :
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
      if (bareTorso || kurtaCut) { // the hand-built body: neck, chest, belly, shoulders and arms on the bones
        const skinM2 = new T.MeshStandardMaterial({ color: skinTint.clone().multiplyScalar(.9), roughness: .62 }); // matched to the face's shaded tone
        const clothM2 = bareTorso ? skinM2 : new T.MeshStandardMaterial({ map: makeFabricTexture(o.kurta), roughness: .9 });
        const att = (bone, geo, m2, y, z2, sq) => { if (!bone) return null;
          const ws3 = bone.getWorldScale(WP).x || 1;
          const mm = new T.Mesh(geo, m2); mm.scale.setScalar(1 / ws3); if (sq) mm.scale.z *= sq;
          mm.position.set(0, (y || 0) / ws3, (z2 || 0) / ws3); mm.castShadow = true; bone.add(mm); return mm; };
        att(neck, new T.CylinderGeometry(.055, .075, .18, 10), skinM2, -.05, .008);
        att(spine, new T.CylinderGeometry(.15, .163, .42, 14), clothM2, -.07, .01, .78);  // chest stops below the collarbones
        att(hips, new T.SphereGeometry(.132, 12, 10), clothM2, .11, .01, .82);            // belly tucked into the tube's foot
        for (const [arm2, fore2] of [[rArm, rFore], [lArm, lFore]]) {
          att(arm2, new T.SphereGeometry(.054, 10, 8), clothM2, .04, 0);                  // shoulder, sunk into the chest line
          att(arm2, new T.CylinderGeometry(.05, .044, .26, 8), clothM2, .14, 0);          // upper arm — the kurta's sleeve
          att(fore2, new T.CylinderGeometry(.042, .035, .24, 8), skinM2, .12, 0);         // forearm bare: sleeves rolled, always
        }
        if (kurtaCut) att(neck, new T.CylinderGeometry(.072, .078, .055, 10, 1, true), clothM2, -.1, .006); // band collar, never a lapel
      }
      const nW = worldOf(neck), hW = worldOf(hips);
      const goldM = new T.MeshStandardMaterial({ color: '#d4af37', metalness: .6, roughness: .35 });
      const zari = (bone, at, r, sq2) => { const wz = bone.getWorldScale(WP).x || 1;   // gold zari border at the hem
        const ring = new T.Mesh(new T.TorusGeometry(r / wz, .013 / wz, 6, 24), goldM);
        ring.rotation.x = Math.PI / 2; ring.scale.y = sq2 || 1;
        ring.position.copy(bone.worldToLocal(at.clone())); bone.add(ring); };
      // the skinned jacket handles the torso and sleeves; only the FALL of the garment is draped
      if (o.female) { // sari: waist wrap over the blouse hem, ankle-length fall, wide pallu over the left shoulder
        const hem = hW.clone().add(new T.Vector3(0, -.82, 0));
        drape(hips, hW.clone().add(new T.Vector3(0, .13, 0)), hW.clone().add(new T.Vector3(0, -.05, 0)), .152, .148, .8, true); // the wrap at the waist
        drape(hips, hW.clone().add(new T.Vector3(0, .06, 0)), hem, .142, .205, .84, true);
        zari(hips, hem.clone().add(new T.Vector3(0, .015, 0)), .2, .84);
        if (lArm) { const shW = worldOf(lArm);
          drape(spine, hW.clone().add(new T.Vector3(.13, 0, .1)), shW.clone().add(new T.Vector3(0, .04, .05)), .1, .05, .5, false); }
      } else if (o.lungi) { // the checked lungi: a straight ankle-length wrap under an untucked light kurta
        const lM = new T.MeshStandardMaterial({ color: '#ffffff', map: makePlaidTexture(o.lungi[0], o.lungi[1]), roughness: .95, side: T.DoubleSide });
        const hem = hW.clone().add(new T.Vector3(0, -.8, 0));
        const lg = new T.Mesh(new T.CylinderGeometry(.152 / (hips.getWorldScale(WP).x || 1), .165 / (hips.getWorldScale(WP).x || 1),
          .8 / (hips.getWorldScale(WP).x || 1), 16, 1, true), lM);
        lg.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), hips.worldToLocal(hem.clone()).sub(hips.worldToLocal(hW.clone())).normalize());
        lg.scale.z *= .8; lg.position.copy(hips.worldToLocal(hW.clone().add(hem).multiplyScalar(.5))); lg.castShadow = true; hips.add(lg);
        drape(hips, hW.clone().add(new T.Vector3(0, .08, 0)), hW.clone().add(new T.Vector3(0, -.22, 0)), .152, .175, .76, true); // short untucked shirt-fall
      } else if (!o.naga) {                                                            // a naga wears no kurta — no fall to drape
        const hemLen = o.outfit === 'bandhgala' ? .26 : (o.salwar ? .34 : .38);        // the kurta's fall, knee-length, over the jacket's own hip line
        drape(hips, hW.clone().add(new T.Vector3(0, .08, 0)), hW.clone().add(new T.Vector3(0, -hemLen, 0)), .152, .188, .76, true);
        if (o.outfit === 'sherwani' || o.outfit === 'silk') zari(hips, hW.clone().add(new T.Vector3(0, -hemLen + .015, 0)), .183, .76);
      }
    }
  }
  if (head) { const ws = head.getWorldScale(V).x || 1;
    // every face its own: vary the skull's proportions per person (accessories inherit the same stretch)
    if (o.vary) head.scale.set(head.scale.x * rand(.93, 1.09), head.scale.y * rand(.94, 1.1), head.scale.z * rand(.96, 1.06));
    // the avatar has a real beard mesh, so only the pagdi is attached here
    const acc = buildHeadgear({ turban: F ? false : o.turban, turbanColor: o.turbanColor, beard: F ? 'none' : o.beard, shades: o.shades, hair: F ? 'none' : o.hair, hairColor: o.hairColor, bindi: o.female, earrings: o.female, tilak: o.tilak }); acc.scale.setScalar(1 / ws); acc.position.set(0, 0.062 / ws, 0.004 / ws); head.add(acc); }
  if (o.mala && neck) { // rudraksha bead mala around the neck
    const wsM = neck.getWorldScale(V).x || 1;
    const mala = new T.Group(); const bM2 = mat('#5c3a24', .7);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU;
      const bead = new T.Mesh(new T.SphereGeometry(.011, 6, 5), bM2);
      bead.position.set(Math.cos(a) * .085, -.06 - Math.sin(Math.max(0, Math.sin(a / 2))) * .06, Math.sin(a) * .062 + .01); mala.add(bead); }
    const pend = new T.Mesh(new T.SphereGeometry(.018, 8, 6), bM2); pend.position.set(0, -.145, .075); mala.add(pend);
    mala.scale.setScalar(1 / wsM); neck.add(mala);
  }
  if (o.trident && rHand) { // the sadhu's trishul
    const wsT = rHand.getWorldScale(V).x || 1;
    const tri = new T.Group(); const tm = new T.MeshStandardMaterial({ color: '#b9bec4', roughness: .35, metalness: .7 });
    const staff = new T.Mesh(new T.CylinderGeometry(.012, .014, 1.7, 8), mat('#6b4a2a', .85)); tri.add(staff);
    for (const sx of [-.05, 0, .05]) { const prong = new T.Mesh(new T.CylinderGeometry(.008, .003, .3, 6), tm);
      prong.position.set(sx, .95, 0); if (sx !== 0) prong.rotation.z = -sx * 2.2; tri.add(prong); }
    const bar = new T.Mesh(new T.CylinderGeometry(.008, .008, .14, 6), tm); bar.rotation.z = Math.PI / 2; bar.position.y = .84; tri.add(bar);
    // the hand bone's +Y points down the fingers (toward the ground with arms at rest),
    // so flip the whole trishul 180° about Z to send the prongs skyward
    tri.scale.setScalar(1 / wsT); tri.position.set(0, .02 / wsT, .02 / wsT); tri.rotation.set(.15, 0, Math.PI); rHand.add(tri);
  }
  if (false && neck && !F) { // (retired — the bow tie is now flattened at load time)
    const wsN = neck.getWorldScale(V).x || 1;
    const colM = new T.MeshStandardMaterial({ color: '#ffffff', map: o.female ? makeFabricTexture(o.dhoti || '#c2185b') : makeFabricTexture(shadeHex(o.kurta || '#c68642', -20)), roughness: .7 });
    const col = new T.Mesh(new T.CylinderGeometry(.088, .108, .15, 14, 1, true), colM);
    col.material.side = T.DoubleSide;
    col.scale.set(1 / wsN, 1 / wsN, .8 / wsN);
    col.position.set(0, -.055 / wsN, .02 / wsN);
    neck.add(col);
  }
  if (false && neck && !F && !o.female && (o.scarf || o.kurta)) { const ws = neck.getWorldScale(V).x || 1; // retired: anything at the throat reads as neckwear from a suit
    // angavastram: one cloth over the RIGHT shoulder, falling front and back — never a bow at the throat
    const scarf = new T.Group(); const sM = new T.MeshStandardMaterial({ color: '#ffffff', map: makeFabricTexture(o.scarf || o.kurta), roughness: .75, side: T.DoubleSide });
    const pad = new T.Mesh(new T.SphereGeometry(0.055, 10, 8), sM); pad.scale.set(1.3, .5, 1.1); pad.position.set(0.085, -0.035, 0); scarf.add(pad);
    const front = new T.Mesh(new T.BoxGeometry(0.085, 0.44, 0.014), sM); front.position.set(0.085, -0.26, 0.085); front.rotation.x = 0.14; scarf.add(front);
    const back = new T.Mesh(new T.BoxGeometry(0.085, 0.4, 0.014), sM); back.position.set(0.085, -0.24, -0.075); back.rotation.x = -0.12; scarf.add(back);
    scarf.traverse(x => { if (x.isMesh) x.castShadow = true; });
    scarf.scale.setScalar(1 / ws); scarf.position.set(0, 0.02 / ws, 0); neck.add(scarf); }
  const mixer = new T.AnimationMixer(model);
  const actions = {};
  // women move with the official feminine gait when it's loaded
  const wants = o.female && SRC.clips.FIdle && SRC.clips.FWalk
    ? [['FIdle', 'idle'], ['FWalk', 'walk'], ['Run', 'run']]
    : [['Idle', 'idle'], ['Walk', 'walk'], ['Run', 'run']];
  for (const [nm, key] of wants) { const c = SRC.clips[nm]; if (c) { const a = mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(key === 'idle' ? 1 : 0); a.play(); actions[key] = a; } }
  addContactShadow(grp, .3, .22, .42);
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
    if (h.sideSaddle) {          // riding side-saddle: knees together, both legs hanging off one flank
      set(h.rLeg, -1.05); set(h.lLeg, -.95); set(h.rCalf, .55); set(h.lCalf, .5);
      if (h.rLeg) h.rLeg.rotation.z = .12; if (h.lLeg) h.lLeg.rotation.z = .12;
      if (h.rArm) { h.rArm.rotation.x -= .25; h.rArm.rotation.z -= .1; }
      if (h.lArm) { h.lArm.rotation.x -= .25; h.lArm.rotation.z += .1; }
      if (h.spine) h.spine.rotation.x += .06;
      return;
    }
    if (h.bike) {                // motorbike: thighs open around the tank, feet back on the pegs
      set(h.rLeg, -.62); set(h.lLeg, -.62);
      if (h.rLeg) h.rLeg.rotation.z = -.30; if (h.lLeg) h.lLeg.rotation.z = .30;
      set(h.rCalf, 1.25); set(h.lCalf, 1.25);
      if (h.rArm) { h.rArm.rotation.x -= .78; h.rArm.rotation.z -= .22; }
      if (h.lArm) { h.lArm.rotation.x -= .78; h.lArm.rotation.z += .22; }
      if (h.rFore) h.rFore.rotation.x -= .18;
      if (h.lFore) h.lFore.rotation.x -= .18;
      if (h.spine) h.spine.rotation.x += .22;
      return;
    }
    if (h.pedal !== undefined) { // on a bicycle: legs drive the cranks in opposition, back bowed to the bars
      const p = h.pedal;
      set(h.rLeg, -.92 + Math.sin(p) * .4); set(h.lLeg, -.92 + Math.sin(p + Math.PI) * .4);
      set(h.rCalf, .98 - Math.sin(p) * .3); set(h.lCalf, .98 - Math.sin(p + Math.PI) * .3);
      if (h.rArm) { h.rArm.rotation.x -= .66; h.rArm.rotation.z -= .1; }
      if (h.lArm) { h.lArm.rotation.x -= .66; h.lArm.rotation.z += .1; }
      if (h.rFore) h.rFore.rotation.x -= .3;
      if (h.lFore) h.lFore.rotation.x -= .3;
      if (h.spine) h.spine.rotation.x += .3; // the roadster crouch
      return;
    }
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
  if (!g.visible) return; // culled by distance: no skeleton work for someone nobody can see
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
// ---------- THE STREET NETWORK ----------
// An Indian old city is not a lattice. It grows: arteries radiate from a chowk, bend around what
// was already there, narrow as they go, fork into galis and die in courtyards. Junctions are
// mostly T-shaped, almost never four clean arms. So the streets here are a GRAPH, grown outward
// from hubs — not a modulo. The one exception is Jaipur, whose walled city really was planned on
// a grid in 1727 along Vastu Shastra lines; that district alone keeps its lattice, on purpose.
const ROADS = { nodes: [], edges: [], grid: new Map(), Q: 12 };
function _bucket(e) {
  const m = e.w / 2 + SIDEW + 2, q = ROADS.Q;
  const gx0 = ((Math.min(e.a.x, e.b.x) - m + HALF) / q) | 0, gx1 = ((Math.max(e.a.x, e.b.x) + m + HALF) / q) | 0;
  const gz0 = ((Math.min(e.a.z, e.b.z) - m + HALF) / q) | 0, gz1 = ((Math.max(e.a.z, e.b.z) + m + HALF) / q) | 0;
  for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
    const k = gx + ',' + gz; let arr = ROADS.grid.get(k);
    if (!arr) ROADS.grid.set(k, arr = []); arr.push(e);
  }
}
function roadNode(x, z) { const n = { x, z, e: [] }; ROADS.nodes.push(n); return n; }
function roadEdge(a, b, w, kind) {
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  if (len < 2) return null;
  const e = { a, b, w, kind: kind || 'street', len, ux: dx / len, uz: dz / len, dirt: false };
  ROADS.edges.push(e); a.e.push(e); b.e.push(e); _bucket(e);
  return e;
}
// nearest street to a point, via the bucket grid — this replaces the old modulo test
function nearRoad(x, z) {
  const q = ROADS.Q;
  const arr = ROADS.grid.get((((x + HALF) / q) | 0) + ',' + (((z + HALF) / q) | 0));
  if (!arr) return null;
  let best = null, bd = 1e9;
  for (let i = 0; i < arr.length; i++) { const e = arr[i];
    const px = x - e.a.x, pz = z - e.a.z;
    let s = px * e.ux + pz * e.uz; if (s < 0) s = 0; else if (s > e.len) s = e.len;
    const dx = px - e.ux * s, dz = pz - e.uz * s, d = dx * dx + dz * dz;
    if (d < bd) { bd = d; best = e; }
  }
  return best ? { d: Math.sqrt(bd), e: best } : null;
}
const onRoad = (x, z) => { const r = nearRoad(x, z); return !!r && r.d < r.e.w / 2; };
// sidewalk band = just outside the carriageway, before the buildings
const onSidewalk = (x, z) => { const r = nearRoad(x, z); return !!r && r.d >= r.e.w / 2 && r.d < r.e.w / 2 + SIDEW; };

function buildRoadNetwork() {
  const inWorld = (x, z) => Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4 && !inBeach(x, z) && !inGhats(x, z);
  const trunks = [];
  for (let i = 0; i < 9; i++) {
    const mx = i % 3, mz = (i / 3) | 0, cx = (mx - 1) * CELL, cz = (mz - 1) * CELL;
    const reach = CELL / 2 - 8;
    const grow = (from, ang, w, segs, kind) => {
      let cur = from, a2 = ang, ww = w;
      for (let s = 0; s < segs; s++) {
        a2 += rand(-.38, .38);                                    // nothing runs straight for long
        const len = rand(15, 30);
        const nx = cur.x + Math.sin(a2) * len, nz = cur.z + Math.cos(a2) * len;
        if (!inWorld(nx, nz)) break;
        const n2 = roadNode(nx, nz);
        const e = roadEdge(cur, n2, ww, kind);
        if (!e) break;
        e.dirt = (i !== 1 && i !== 6 && i !== 7) && Math.random() < .3; // metros are paved, the rest often aren't
        cur = n2; ww = Math.max(3.2, ww * rand(.82, .95));
        // side lanes peel off, and the thinnest of them are galis no car can enter
        if (s > 0 && Math.random() < .45) {
          const bw = Math.max(3, ww * rand(.55, .8));
          grow(n2, a2 + (Math.random() < .5 ? 1 : -1) * (Math.PI / 2 + rand(-.5, .5)),
            bw, randi(1, 3), bw < 4.2 ? 'gali' : 'lane');
        }
      }
      return cur;
    };
    // Each city is laid out the way the real one is: not copied street for street (a district here
    // is 107 m across, Chandni Chowk alone is 1.5 km) but built on the same plan.
    const PATTERN = ['spine', 'arterial', 'grid', 'ghatfan', 'organic', 'organic', 'spine', 'coastal', 'organic'][i];
    if (PATTERN === 'grid') {
      // MARWAR / JAIPUR: the walled city was laid out on a grid in 1727 — nine wards, wide straight
      // bazaar streets. The one planned exception in a country of organic cities.
      const cols = [], rows = [];
      for (let k = -1; k <= 1; k++) { cols.push(cx + k * 34 + rand(-3, 3)); rows.push(cz + k * 34 + rand(-3, 3)); }
      const grid = [];
      for (let a = 0; a < cols.length; a++) { grid[a] = [];
        for (let b = 0; b < rows.length; b++) grid[a][b] = roadNode(cols[a], rows[b]); }
      for (let a = 0; a < cols.length; a++) for (let b = 0; b < rows.length; b++) {
        if (a < cols.length - 1) roadEdge(grid[a][b], grid[a + 1][b], 9, 'bazaar');
        if (b < rows.length - 1) roadEdge(grid[a][b], grid[a][b + 1], 9, 'bazaar');
      }
      trunks.push(grid[1][1]);
      continue;
    }
    if (PATTERN === 'spine' || PATTERN === 'ghatfan' || PATTERN === 'coastal') {
      // PURANI DILLI: one great bazaar spine — Chandni Chowk ran dead straight from the Fort to
      // Fatehpuri Masjid — with a dense comb of katra lanes hanging off both sides.
      // KASHI: the spine runs PARALLEL to the Ganga, and the galis fall away west toward the water.
      // CHENNAI: the long road follows the shore, and everything inland hangs off it.
      const along = PATTERN === 'ghatfan' ? 0 : PATTERN === 'coastal' ? Math.PI / 2 : Math.PI / 2;
      const start = { x: cx - Math.sin(along) * reach, z: cz - Math.cos(along) * reach };
      let cur = roadNode(clamp(start.x, -HALF + 6, HALF - 6), clamp(start.z, -HALF + 6, HALF - 6));
      trunks.push(cur);
      const spine = [cur];
      let a2 = along;
      for (let s = 0; s < 7; s++) {
        a2 += rand(-.11, .11);                                  // even a "straight" bazaar drifts
        const nx = cur.x + Math.sin(a2) * (reach * 2 / 7), nz = cur.z + Math.cos(a2) * (reach * 2 / 7);
        if (!inWorld(nx, nz)) break;
        const n2 = roadNode(nx, nz); const e = roadEdge(cur, n2, PATTERN === 'coastal' ? 10 : 11, 'bazaar');
        if (!e) break; cur = n2; spine.push(n2);
      }
      for (const n of spine) {
        // the comb of lanes: dense, short, narrow — the capillaries of an old quarter
        for (const side of [-1, 1]) {
          if (PATTERN === 'coastal' && side < 0) continue;       // nothing is built out into the sea
          const toward = PATTERN === 'ghatfan' && side < 0 ? 3.2 : rand(3.4, 5.4);
          if (Math.random() < .22) continue;
          grow(n, a2 + side * (Math.PI / 2 + rand(-.22, .22)), toward, randi(2, 4), toward < 4.2 ? 'gali' : 'lane');
        }
        if (Math.random() < .35) grow(n, a2 + rand(-.6, .6) + Math.PI / 2, rand(6, 7.5), randi(1, 2), 'street');
      }
      continue;
    }
    if (PATTERN === 'arterial') {
      // BAMBAI: reclaimed strips, so the arteries run long north–south, tied by short cross-streets.
      const lanes = [];
      for (let k = -1; k <= 1; k++) {
        let cur2 = roadNode(cx + k * 30 + rand(-4, 4), cz - reach), col = [cur2];
        let a3 = 0;
        for (let s = 0; s < 6; s++) { a3 += rand(-.14, .14);
          const nx = cur2.x + Math.sin(a3) * (reach * 2 / 6), nz = cur2.z + Math.cos(a3) * (reach * 2 / 6);
          if (!inWorld(nx, nz)) break;
          const n2 = roadNode(nx, nz); if (!roadEdge(cur2, n2, 9.5, 'artery')) break; cur2 = n2; col.push(n2); }
        lanes.push(col);
      }
      trunks.push(lanes[1] ? lanes[1][0] : ROADS.nodes[ROADS.nodes.length - 1]);
      for (let k = 0; k < lanes.length - 1; k++) {
        const A = lanes[k], B = lanes[k + 1];
        for (let s = 1; s < Math.min(A.length, B.length); s++) if (Math.random() < .7) roadEdge(A[s], B[s], rand(5, 7), 'street');
      }
      for (const col of lanes) for (const n of col) if (Math.random() < .4) grow(n, rand(0, TAU), rand(3.2, 5), randi(1, 3), 'gali');
      continue;
    }
    // everywhere else: hubs, then arteries that wander outward and thin as they go
    const hubs = [roadNode(cx + rand(-8, 8), cz + rand(-8, 8))];
    const nH = 1 + randi(1, 2);
    for (let h = 1; h <= nH; h++) {
      const a = rand(0, TAU), r = rand(reach * .4, reach * .8);
      const hx = cx + Math.cos(a) * r, hz = cz + Math.sin(a) * r;
      if (inWorld(hx, hz)) { const n = roadNode(hx, hz); hubs.push(n); roadEdge(hubs[0], n, 8.5, 'artery'); }
    }
    trunks.push(hubs[0]);
    for (const hub of hubs) {
      const arms = randi(4, 6), base = rand(0, TAU);
      for (let k = 0; k < arms; k++) grow(hub, base + k / arms * TAU + rand(-.3, .3), rand(7, 9), randi(3, 6), 'artery');
    }
  }
  // loops: an organic city is not a tree — nearby dead ends grow into each other
  for (let pass = 0; pass < 600; pass++) {
    const a = ROADS.nodes[randi(0, ROADS.nodes.length - 1)], b = ROADS.nodes[randi(0, ROADS.nodes.length - 1)];
    if (a === b || a.e.length > 3 || b.e.length > 3) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d < 8 || d > 30) continue;
    if (a.e.some(e => e.a === b || e.b === b)) continue;
    if (!inWorld((a.x + b.x) / 2, (a.z + b.z) / 2)) continue;
    roadEdge(a, b, rand(4.5, 7), 'street');
  }
  // and the districts must be reachable from each other
  for (let i = 0; i < trunks.length; i++) for (let j = i + 1; j < trunks.length; j++) {
    const A = trunks[i], B = trunks[j];
    if (Math.hypot(A.x - B.x, A.z - B.z) > CELL * 1.2) continue;
    let na = A, nb = B, bd = 1e9;
    for (const n of ROADS.nodes) { // meet in the middle, on real junctions
      const mx2 = (A.x + B.x) / 2, mz2 = (A.z + B.z) / 2, d = Math.hypot(n.x - mx2, n.z - mz2);
      if (d < bd) { bd = d; na = n; } }
    roadEdge(A, na, 9.5, 'highway'); roadEdge(na, B, 9.5, 'highway');
  }
}

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
  g.globalAlpha = .08; g.fillStyle = '#fbe6c8'; // barely-there haze streaks, never solid discs
  for (let i = 0; i < 6; i++) { const y = rand(H * .18, H * .55), w = rand(110, 220), h = rand(2.5, 5);
    g.beginPath(); g.ellipse(rand(0, W), y, w, h, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  const tex = new T.CanvasTexture(c); if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; return tex;
}
// graphics quality: phones and weak laptops default to LIGHT (no bloom, no shadows, tight fog);
// switchable from the 🔊 panel — the choice persists and reloads
const GFX = (() => { try { const saved = localStorage.getItem('sk_gfx'); if (saved) return saved; } catch (e) {}
  const mob = (matchMedia && matchMedia('(pointer:coarse)').matches) || innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4;
  return mob ? 'low' : 'high'; })();
// ---------- adaptive quality: the game watches its own framerate and sheds work until it's smooth ----------
// Order of sacrifice, cheapest-looking first: resolution → bloom → shadows. It climbs back up when
// the frames come easily again, so a heavy district costs you sharpness for a moment, not the session.
const ADAPT = { base: 1, floor: 1, scale: 1, t0: 0, frames: 0, until: 0, bloomOff: false, shadowsOff: false, told: false };
function adaptQuality() {
  if (!renderer) return;
  // WALL-CLOCK timing, not game time: game dt is capped at 50ms, so on a machine crawling at 3fps
  // a dt-based counter would take twenty seconds to notice — exactly when help is needed fastest.
  const now = performance.now();
  if (!ADAPT.t0) { ADAPT.t0 = now; ADAPT.frames = 0; ADAPT.until = now + 2500; return; }
  ADAPT.frames++;
  const el = now - ADAPT.t0;
  if (now < ADAPT.until) { if (el > 1200) { ADAPT.t0 = now; ADAPT.frames = 0; } return; }
  if (el < 1200) return;                           // judge on a full second, never on one bad frame
  const fps = ADAPT.frames * 1000 / el;
  ADAPT.t0 = now; ADAPT.frames = 0;
  if (fps < 45) {
    if (ADAPT.scale > ADAPT.floor) { ADAPT.scale = Math.max(ADAPT.floor, ADAPT.scale - .11); renderer.setPixelRatio(ADAPT.base * ADAPT.scale); if (composer) composer.setSize(innerWidth, innerHeight); }
    else if (composer && !ADAPT.bloomOff) { ADAPT.bloomOff = true; composer = null; }   // drop the bloom pass
    else if (!ADAPT.shadowsOff && renderer.shadowMap.enabled) { ADAPT.shadowsOff = true; // and finally the shadows
      renderer.shadowMap.enabled = false; if (sun) sun.castShadow = false;
      scene.traverse(o => { if (o.isMesh) o.castShadow = false; }); }
    else return;
    ADAPT.until = now + 2000;
    if (!ADAPT.told) { ADAPT.told = true; toast('⚙️ Qualité réduite pour rester fluide · 🔊 → Graphismes', '#8ec9f5'); }
  } else if (fps > 58 && ADAPT.scale < 1 && !ADAPT.shadowsOff) {
    ADAPT.scale = Math.min(1, ADAPT.scale + .1); renderer.setPixelRatio(ADAPT.base * ADAPT.scale);
    if (composer) composer.setSize(innerWidth, innerHeight);
    ADAPT.until = now + 4000;
  }
}
function initThree() {
  const low = GFX === 'low';
  renderer = new T.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' });
  // a Retina laptop reports devicePixelRatio 2 — that is FOUR times the pixels to shade every
  // frame, and it is the single biggest cost in the whole engine. Cap it, then let ADAPT tune it.
  ADAPT.base = low ? 1 : Math.min(devicePixelRatio || 1, 1.5);
  // Never render BELOW the screen's native resolution: on a 1x display that is what turns every
  // diagonal into a staircase. Below this floor the bloom and the shadows go instead.
  ADAPT.floor = Math.max(.72, Math.min(1, 1 / ADAPT.base));
  renderer.setPixelRatio(ADAPT.base);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !low; renderer.shadowMap.type = T.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer && T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
  else if ('sRGBEncoding' in T) renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  scene = new T.Scene();
  daySkyTex = makeSky(); nightSkyTex = makeNightSky(); scene.background = daySkyTex;
  scene.fog = low ? new T.Fog('#ecc9a0', 42, 120) : new T.Fog('#ecc9a0', 60, 175);
  camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, low ? 135 : 220);
  const hemi = new T.HemisphereLight('#a8c4e8', '#6b5335', 0.30); scene.add(hemi); dayHemi = hemi;
  const amb = new T.AmbientLight('#ffe9d0', 0.09); scene.add(amb);
  // low golden-hour sun for long cinematic shadows
  sun = new T.DirectionalLight('#ffc178', 2.05); sun.position.set(36, 48, 20); sun.castShadow = !low;
  sun.shadow.mapSize.set(low ? 512 : 1536, low ? 512 : 1536); sun.shadow.bias = -0.0004;
  const sc = sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 260;
  scene.add(sun); scene.add(sun.target);
  // post: bloom + gamma — only on the pretty tier
  if (window.EffectComposer && !low) {
    composer = new window.EffectComposer(renderer);
    // THE JAGGED EDGES: once rendering goes through the composer's own buffers, the canvas
    // antialias flag is ignored and every diagonal turns into a staircase. WebGL2 can multisample
    // those buffers directly — this is what puts the smooth edges back with the bloom still on.
    if (renderer.capabilities && renderer.capabilities.isWebGL2) {
      if (composer.renderTarget1) composer.renderTarget1.samples = 4;
      if (composer.renderTarget2) composer.renderTarget2.samples = 4;
    }
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
  // every street is now painted from the road GRAPH, so the tarmac follows the same crooked
  // lines the city was grown from — no straight bands, no repeating lattice.
  const stroke = (e, col, wWorld) => { g.strokeStyle = col; g.lineWidth = u(wWorld);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(px(e.a.x), px(e.a.z)); g.lineTo(px(e.b.x), px(e.b.z)); g.stroke(); };
  for (const e of ROADS.edges) stroke(e, '#9a978f', e.w + 2 * SIDEW);   // paving either side
  for (const e of ROADS.edges) stroke(e, e.dirt ? '#8a6b4a' : '#3b3b41', e.w);
  // dirt lanes get ruts; tarmac gets grain
  g.globalAlpha = .35;
  for (const e of ROADS.edges) { if (!e.dirt) continue;
    const n = Math.round(e.len * 1.6);
    for (let i = 0; i < n; i++) { const t = Math.random(), o = rand(-e.w / 2, e.w / 2);
      const wx = e.a.x + e.ux * e.len * t - e.uz * o, wz = e.a.z + e.uz * e.len * t + e.ux * o;
      g.fillStyle = pick(['#6e5238', '#9c7d58', '#5c452e']);
      g.beginPath(); g.ellipse(px(wx), px(wz), rand(2, 6), rand(1.5, 4), 0, 0, TAU); g.fill(); } }
  g.globalAlpha = .12;
  for (let i = 0; i < 9000; i++) { const x = Math.random() * S, y = Math.random() * S;
    g.fillStyle = Math.random() < .5 ? '#2e2e33' : '#4a4a52'; g.fillRect(x, y, 1.6, 1.6); }
  g.globalAlpha = 1;
  // this is an OLD country: earth eats into every road edge in ragged bites, and the tar is patched
  for (const e of ROADS.edges) {
    const bites = Math.round(e.len * .9);
    for (let i = 0; i < bites; i++) { const t = Math.random(), side = Math.random() < .5 ? -1 : 1;
      const o = side * (e.w / 2 - rand(0, .6));
      const wx = e.a.x + e.ux * e.len * t - e.uz * o, wz = e.a.z + e.uz * e.len * t + e.ux * o;
      g.globalAlpha = rand(.25, .6); g.fillStyle = pick(['#8a7a5a', '#9a978f', '#7a6a4e']);
      g.beginPath(); g.ellipse(px(wx), px(wz), rand(2, 7), rand(2, 7), 0, 0, TAU); g.fill(); }
    if (!e.dirt) { const holes = Math.round(e.len * .35);
      for (let i = 0; i < holes; i++) { const t = Math.random(), o = rand(-e.w / 2 + .4, e.w / 2 - .4);
        const wx = e.a.x + e.ux * e.len * t - e.uz * o, wz = e.a.z + e.uz * e.len * t + e.ux * o;
        g.globalAlpha = .8; g.fillStyle = '#1e1e22';
        g.beginPath(); g.ellipse(px(wx), px(wz), rand(2, 6), rand(1.5, 4.5), rand(0, 3), 0, TAU); g.fill();
        g.globalAlpha = .3; g.fillStyle = '#55555c';
        g.beginPath(); g.ellipse(px(wx), px(wz), rand(6, 12), rand(4, 8), rand(0, 3), 0, TAU); g.fill(); } }
  }
  g.globalAlpha = 1;
  // faded centre lines: only the metros ever painted them, and only on the wide roads
  g.strokeStyle = 'rgba(240,210,120,.26)'; g.lineWidth = 2; g.setLineDash([10, 18]);
  for (const e of ROADS.edges) { if (e.dirt || e.w < 7) continue;
    if (![1, 6, 7].includes(districtAt((e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2))) continue;
    g.beginPath(); g.moveTo(px(e.a.x), px(e.a.z)); g.lineTo(px(e.b.x), px(e.b.z)); g.stroke(); }
  g.setLineDash([]);
  // broken curbs along the paving edge
  g.strokeStyle = 'rgba(20,20,24,.45)'; g.lineWidth = 2; g.setLineDash([18, 34]);
  for (const e of ROADS.edges) { for (const side of [-1, 1]) { const o = side * e.w / 2;
    g.beginPath(); g.moveTo(px(e.a.x - e.uz * o), px(e.a.z + e.ux * o));
    g.lineTo(px(e.b.x - e.uz * o), px(e.b.z + e.ux * o)); g.stroke(); } }
  g.setLineDash([]);
  // kolam dot-motifs on Chennai sidewalks
  g.fillStyle = 'rgba(245,242,232,.85)';
  for (let k = 0; k < 70; k++) {
    const wx = rand(0, CELL) - CELL / 2, wz = rand(HALF - CELL, HALF - 4);
    if (!onSidewalk(wx, wz)) continue;
    const kx = px(wx), kz = px(wz);
    for (let ring = 0; ring < 3; ring++) { const n = 4 + ring * 4, rr = 2.5 + ring * 3;
      for (let p2 = 0; p2 < n; p2++) { const a = p2 / n * TAU;
        g.beginPath(); g.arc(kx + Math.cos(a) * rr, kz + Math.sin(a) * rr, 1.1, 0, TAU); g.fill(); } }
  }
  // zebra crossings on the approach to big paved junctions in the metros
  g.fillStyle = 'rgba(230,228,220,.7)';
  for (const n of ROADS.nodes) {
    if (n.e.length < 3) continue;
    const di3 = districtAt(n.x, n.z); if (![1, 6, 7].includes(di3)) continue;
    for (const e of n.e) { if (e.dirt || e.w < 7 || Math.random() < .5) continue;
      const away = e.a === n ? 1 : -1, ox = e.ux * away, oz = e.uz * away;
      const bx = n.x + ox * (e.w * .8), bz = n.z + oz * (e.w * .8);
      for (let s2 = -e.w / 2 + .5; s2 < e.w / 2 - .5; s2 += 1.2) {
        const wx = bx - oz * s2, wz = bz + ox * s2;
        g.save(); g.translate(px(wx), px(wz)); g.rotate(Math.atan2(oz, ox));
        g.fillRect(-u(.7), -u(.35), u(1.4), u(.7)); g.restore(); } }
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
  // WEATHER. Indian walls are written on by the monsoon: black streaks run down from every sill,
  // the base of the wall is stained by splashback and soot, and the parapet catches the sky.
  for (let i = 0; i < 46; i++) {
    const sx = rand(0, S), sy = rand(S * .08, S * .8), len = rand(18, 90), w2 = rand(1.5, 6);
    const gr = g.createLinearGradient(0, sy, 0, sy + len);
    gr.addColorStop(0, 'rgba(40,34,26,.34)'); gr.addColorStop(1, 'rgba(40,34,26,0)');
    g.fillStyle = gr; g.fillRect(sx, sy, w2, len);
  }
  { const gr = g.createLinearGradient(0, S * .82, 0, S);
    gr.addColorStop(0, 'rgba(28,24,18,0)'); gr.addColorStop(1, 'rgba(28,24,18,.42)');
    g.fillStyle = gr; g.fillRect(0, S * .82, S, S * .18);
    const gs = g.createLinearGradient(0, 0, 0, S * .16);
    gs.addColorStop(0, 'rgba(226,236,248,.16)'); gs.addColorStop(1, 'rgba(226,236,248,0)');
    g.fillStyle = gs; g.fillRect(0, 0, S, S * .16); }
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; if ('sRGBEncoding' in T) tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; return tex;
}
function makeWindowTexture() { return makeFacadeTexture(0); }
// district-specific architecture, from studying each city's real streetscape
// the war on the box: no building leaves here as a plain cube. Chhajja ledges cut every facade
// with shadow lines, rooflines break into vaults, chhatris and stair-huts, corners go round.
function decubeBuilding(x, z, w, h, d, rot, boxGeo, lowRise) {
  if (GFX !== 'low' && !lowRise) { // overhanging chhajja ledges at the floor lines
    const ledgeM = mat(pick(['#8a7a66', '#96846c', '#7c6e5c']), .92);
    const nL = clamp(Math.round(h / 8), 1, 2);
    for (let k = 1; k <= nL; k++) { const le = new T.Mesh(boxGeo, ledgeM);
      le.scale.set(w + .55, .16, d + .55); le.position.set(x, h * k / (nL + 1) + .6, z); le.rotation.y = rot; le.castShadow = true; scene.add(le); }
  }
  if (!lowRise) { const r = Math.random(); // the flat roof is over — every skyline breaks differently
    if (r < .26) { // plastered barrel vault riding the roof
      const v = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 14), mat(pick(['#b8a88a', '#a89478', '#9a8a72']), .92));
      v.rotation.z = Math.PI / 2; v.rotation.y = rot; v.scale.set(1.9, w * .46, Math.min(3.4, d * .38));
      v.position.set(x, h + .15, z); v.castShadow = true; scene.add(v);
    } else if (r < .46) { // domed chhatri pavilion
      const g = new T.Group(); const cM = mat(pick(['#e8dcc4', '#d9c9a3', '#cfc0a8']), .8);
      for (const [sx, sz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) { const p = new T.Mesh(new T.CylinderGeometry(.07, .07, 1, 8), cM); p.position.set(sx, .5, sz); g.add(p); }
      const dome = new T.Mesh(new T.SphereGeometry(.78, 12, 8, 0, TAU, 0, Math.PI / 2), cM); dome.position.y = 1; dome.scale.y = .8; g.add(dome);
      g.position.set(x + rand(-w * .2, w * .2), h + .3, z + rand(-d * .2, d * .2));
      g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
    } else if (r < .66) { // stair-head hut capped with a little dome
      const hut = new T.Mesh(boxGeo, mat(pick(['#c9b896', '#b8a88a']), .9)); hut.scale.set(1.7, 1.5, 1.7);
      hut.position.set(x + w * .22, h + .95, z - d * .18); hut.rotation.y = rot; hut.castShadow = true; scene.add(hut);
      const hd2 = new T.Mesh(new T.SphereGeometry(.95, 10, 8, 0, TAU, 0, Math.PI / 2), mat('#a89478', .85));
      hd2.scale.set(1, .6, 1); hd2.position.set(x + w * .22, h + 1.7, z - d * .18); hd2.castShadow = true; scene.add(hd2);
    } else if (r < .78) { // weathered tin lean-to pitched over one end, kept small and light
      const tin = new T.Mesh(boxGeo, mat(pick(['#9a8a72', '#8a7a66', '#a08e74']), .7));
      tin.scale.set(w * .55, .1, d * .4); tin.rotation.set(.22, rot, 0);
      tin.position.set(x + w * .12, h + .55, z + d * .1); tin.castShadow = true; scene.add(tin);
    }
  }
  if (GFX !== 'low' && h > 8 && Math.random() < .18) { // rounded corner balcony tower, half-buried in the corner
    const sx = pick([-1, 1]), sz2 = pick([-1, 1]);
    const bT = new T.Mesh(new T.CylinderGeometry(1, 1, h * .55, 12), mat(pick(['#cfc0a8', '#c0ae94', '#b8a88a']), .88));
    bT.position.set(x + sx * w / 2, h * .5, z + sz2 * d / 2); bT.castShadow = true; scene.add(bT);
    const bCap = new T.Mesh(new T.SphereGeometry(1, 10, 8, 0, TAU, 0, Math.PI / 2), mat('#a24a30', .85));
    bCap.scale.y = .6; bCap.position.set(x + sx * w / 2, h * .5 + h * .275, z + sz2 * d / 2); bCap.castShadow = true; scene.add(bCap);
  }
}
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
// the coast: the south and south-east of the city meet the sea — Marina, Goa, Kerala backwater mouths
const BEACH_W = 14;
const inBeach = (x, z) => z > HALF - BEACH_W || (x > HALF - BEACH_W && z > -HALF + CELL);
let seaMats = [];
function buildSea() {
  // sand: warm strips inside the world edge
  const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sg = sc.getContext('2d');
  sg.fillStyle = '#dcc493'; sg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { sg.fillStyle = pick(['#cdb27b', '#e8d3a8', '#c2a76e']); sg.globalAlpha = .5; sg.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6); }
  sg.globalAlpha = 1;
  const sandTex = new T.CanvasTexture(sc); sandTex.wrapS = sandTex.wrapT = T.RepeatWrapping; sandTex.repeat.set(10, 2);
  const sandM = new T.MeshStandardMaterial({ map: sandTex, roughness: 1 });
  const south = new T.Mesh(new T.PlaneGeometry(WORLD, BEACH_W), sandM);
  south.rotation.x = -Math.PI / 2; south.position.set(0, .04, HALF - BEACH_W / 2); south.receiveShadow = true; scene.add(south);
  const east = new T.Mesh(new T.PlaneGeometry(BEACH_W, HALF * 2 - CELL), sandM);
  east.rotation.x = -Math.PI / 2; east.position.set(HALF - BEACH_W / 2, .04, CELL / 2 + (HALF - CELL) / 2 + CELL / 2); scene.add(east);
  east.position.z = (-HALF + CELL + HALF) / 2; east.receiveShadow = true;
  // the sea itself: two big animated sheets beyond the edge, wet where they kiss the sand
  const wc = document.createElement('canvas'); wc.width = wc.height = 128; const wg = wc.getContext('2d');
  wg.fillStyle = '#1e6f8a'; wg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 46; i++) { wg.strokeStyle = 'rgba(255,255,255,.16)'; wg.lineWidth = rand(1, 2.2);
    const y = rand(0, 128); wg.beginPath(); wg.moveTo(0, y); wg.bezierCurveTo(42, y + rand(-6, 6), 84, y + rand(-6, 6), 128, y); wg.stroke(); }
  const mkSea = (w, h) => { const tx = new T.CanvasTexture(wc); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(w / 22, h / 22);
    const m = new T.MeshStandardMaterial({ map: tx, roughness: .25, metalness: .15, transparent: true, opacity: .93 });
    seaMats.push(m); return new T.Mesh(new T.PlaneGeometry(w, h), m); };
  const seaS = mkSea(WORLD + 400, 200); seaS.rotation.x = -Math.PI / 2; seaS.position.set(0, -.12, HALF + 97); scene.add(seaS);
  const seaE = mkSea(200, HALF * 2 - CELL + 6); seaE.rotation.x = -Math.PI / 2; seaE.position.set(HALF + 97, -.12, (-HALF + CELL + HALF) / 2 + 3); scene.add(seaE);
  // foam line at the waterline
  const foamS = new T.Mesh(new T.PlaneGeometry(WORLD, 1.4), new T.MeshBasicMaterial({ color: '#e8f4f2', transparent: true, opacity: .55 }));
  foamS.rotation.x = -Math.PI / 2; foamS.position.set(0, .05, HALF - 2.2); scene.add(foamS);
  const foamE = new T.Mesh(new T.PlaneGeometry(1.4, HALF * 2 - CELL), new T.MeshBasicMaterial({ color: '#e8f4f2', transparent: true, opacity: .55 }));
  foamE.rotation.x = -Math.PI / 2; foamE.position.set(HALF - 2.2, .05, (-HALF + CELL + HALF) / 2); scene.add(foamE);
  // wooden fishing boats hauled up on the sand, nets and all
  for (let i = 0; i < 9; i++) {
    const onSouth = Math.random() < .6;
    const bx = onSouth ? rand(-HALF + 8, HALF - 8) : rand(HALF - BEACH_W + 3, HALF - 3);
    const bz = onSouth ? rand(HALF - BEACH_W + 3, HALF - 3) : rand(-HALF + CELL + 8, HALF - 8);
    const boat = new T.Group();
    const hull = new T.Mesh(new T.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI / 2), mat(pick(['#3a6b8a', '#8a4a3a', '#4a7a50', '#c9760b']), .8));
    hull.scale.set(.85, .7, 2.6); hull.rotation.x = Math.PI; hull.position.y = .62; boat.add(hull);
    const rim = new T.Mesh(new T.TorusGeometry(1, .09, 8, 20), mat('#6b4a2a', .85)); rim.rotation.x = Math.PI / 2; rim.scale.set(.85, 2.6, 1); rim.position.y = .62; boat.add(rim);
    for (const bzz of [-1.2, 0, 1.2]) { const bench = new T.Mesh(new T.BoxGeometry(1.5, .08, .3), mat('#8a6b3a', .9)); bench.position.set(0, .5, bzz); boat.add(bench); }
    boat.position.set(bx, 0, bz); boat.rotation.y = rand(0, TAU); boat.rotation.z = rand(-.05, .05);
    boat.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(boat);
    buildings.push({ x: bx, z: bz, hw: 1.1, hd: 2 });
  }
}
// Varanasi's riverfront: the Ganga flows along Kashi's western edge — stone ghats stepping down
// to the water, cremation pyres burning on Manikarnika-style platforms, bathers in the river.
const GHAT_X = -HALF + 16; // east limit of the ghat zone
const inGhats = (x, z) => x < GHAT_X && z > -HALF + CELL && z < -HALF + 2 * CELL;
// the river is WIDE — a real crossing, swum stroke by stroke, with a wild far shore
const RIVER_X0 = -HALF + 8.2;   // below the last step the bed drops away and you swim
const RIVER_X1 = -HALF - 52;    // waterline of the far shore
const FAR_X = -HALF - 76;       // western edge of the far bank's sand
const inRiverWater = (x, z) => x < RIVER_X0 && x > RIVER_X1 && z > -HALF + CELL && z < -HALF + 2 * CELL;
const onFarBank = (x, z) => x <= RIVER_X1 + 2 && x > FAR_X + 1.5 && z > -HALF + CELL && z < -HALF + 2 * CELL;
const bathers = [], pyres = [], ripples = [];
function buildGanga() {
  const z0 = -HALF + CELL, z1 = -HALF + 2 * CELL, zm = (z0 + z1) / 2, len = z1 - z0;
  // the river: wide green-brown water sheet off the west edge
  const rc = document.createElement('canvas'); rc.width = rc.height = 128; const rg = rc.getContext('2d');
  rg.fillStyle = '#5a7a5e'; rg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) { rg.strokeStyle = 'rgba(220,230,210,.14)'; rg.lineWidth = rand(1, 2);
    const y = rand(0, 128); rg.beginPath(); rg.moveTo(0, y); rg.bezierCurveTo(42, y + rand(-5, 5), 84, y + rand(-5, 5), 128, y); rg.stroke(); }
  const rt = new T.CanvasTexture(rc); rt.wrapS = rt.wrapT = T.RepeatWrapping; rt.repeat.set(6, 5);
  const river = new T.Mesh(new T.PlaneGeometry(70, len), new T.MeshStandardMaterial({ map: rt, color: '#b8c2ac', roughness: .5, metalness: .08, transparent: true, opacity: .96, side: T.DoubleSide })); // murky, not sun-bleached
  river.rotation.x = -Math.PI / 2; river.position.set(-HALF - 35 + 10, -.14, zm); scene.add(river);
  seaMats.push(river.material);
  // stone ghat steps, some painted in worship stripes
  const stepM = [mat('#c9b896', .95), mat('#b8a884', .95), mat('#d98a2b', .9), mat('#e8e0cc', .9)];
  for (let s2 = 0; s2 < 6; s2++) {
    const step = new T.Mesh(new T.BoxGeometry(1.4, .32, len), s2 % 4 === 2 ? stepM[2] : stepM[s2 % 2]);
    step.position.set(-HALF + 10 - s2 * 1.35 + 6, .16 - s2 * 0, zm);
    step.position.y = .9 - s2 * .16; step.position.x = -HALF + 15 - s2 * 1.4;
    step.receiveShadow = true; step.castShadow = true; scene.add(step);
  }
  // high platform edging the street side — painted in the red-and-white worship stripes of the real ghats
  const spc = document.createElement('canvas'); spc.width = 128; spc.height = 32; const spg = spc.getContext('2d');
  for (let s3 = 0; s3 < 16; s3++) { spg.fillStyle = s3 % 2 ? '#f2ece0' : '#b3402a'; spg.fillRect(s3 * 8, 0, 8, 32); }
  const spt = new T.CanvasTexture(spc); spt.wrapS = T.RepeatWrapping; spt.repeat.set(len / 14, 1);
  const prom = new T.Mesh(new T.BoxGeometry(2.2, 1.1, len), new T.MeshStandardMaterial({ map: spt, roughness: .9 }));
  prom.rotation.y = 0; prom.position.set(-HALF + 16.4, .55, zm); prom.receiveShadow = true; scene.add(prom);
  // cremation platforms: stacked log pyres, embers, mourners come with the crowd spawn
  for (const pz of [zm - 18, zm + 22]) {
    const plat = new T.Mesh(new T.BoxGeometry(5, .5, 6), mat('#9a8a70', .95)); plat.position.set(-HALF + 11.5, .25, pz); plat.receiveShadow = true; scene.add(plat);
    const g = new T.Group();
    for (let layer = 0; layer < 3; layer++) for (let li = 0; li < 3; li++) {
      const log = new T.Mesh(new T.CylinderGeometry(.09, .11, 1.6, 6), mat('#5c452e', .9));
      log.rotation.z = Math.PI / 2; log.rotation.y = layer % 2 ? Math.PI / 2 : 0;
      log.position.set((li - 1) * .3 * (layer % 2 ? 1 : 0), .55 + layer * .17, (li - 1) * .3 * (layer % 2 ? 0 : 1)); g.add(log); }
    // the shrouded body lies on the logs, burning in the open for all to see — this is Kashi
    const shroud = new T.Mesh(new T.CylinderGeometry(.16, .2, 1.5, 8), mat('#e8e0d0', .85));
    shroud.rotation.z = Math.PI / 2; shroud.position.set(0, 1.06, 0); g.add(shroud);
    for (let mg = 0; mg < 4; mg++) { const bead = new T.Mesh(new T.SphereGeometry(.045, 6, 5), mat(mg % 2 ? '#ff9800' : '#ffc107', .7));
      bead.position.set(-.5 + mg * .33, 1.24, 0); g.add(bead); }
    const fire = new T.Mesh(new T.ConeGeometry(.5, 1.25, 8), new T.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5500', emissiveIntensity: 2.2, transparent: true, opacity: .9 }));
    fire.position.y = 1.4; g.add(fire);
    const fire2 = new T.Mesh(new T.ConeGeometry(.26, .85, 8), new T.MeshStandardMaterial({ color: '#ffd24d', emissive: '#ffb300', emissiveIntensity: 2.6, transparent: true, opacity: .95 }));
    fire2.position.y = 1.35; g.add(fire2);
    const embers = new T.Mesh(new T.SphereGeometry(.42, 8, 6), new T.MeshStandardMaterial({ color: '#8a2408', emissive: '#e84400', emissiveIntensity: 1.4 }));
    embers.scale.y = .28; embers.position.y = .95; g.add(embers);
    const char2 = new T.Mesh(new T.CircleGeometry(1.1, 12), new T.MeshStandardMaterial({ color: '#191512', roughness: 1 }));
    char2.rotation.x = -Math.PI / 2; char2.position.y = .52; g.add(char2);
    const fglow = makeGlowSprite('#ff7722', 5); fglow.position.y = 1.5; fglow.visible = true; g.add(fglow);
    g.position.set(-HALF + 11.5, .25, pz); scene.add(g);
    pyres.push({ fire, t: rand(0, TAU), x: -HALF + 11.5, z: pz });
    steams.push({ x: -HALF + 11.5, y: 2.1, z: pz, r: .2 }); // smoke column
    buildings.push({ x: -HALF + 11.5, z: pz, hw: 1.2, hd: 1.2 });
  }
  // the holy river is also a working river: offerings, trash and scum ride the current
  for (let i = 0; i < 14; i++) { const scum = new T.Mesh(new T.CircleGeometry(rand(1, 2.6), 10),
    new T.MeshStandardMaterial({ color: pick(['#6b7a52', '#7a8258', '#5c6a48']), transparent: true, opacity: .38, roughness: 1, depthWrite: false }));
    scum.rotation.x = -Math.PI / 2; scum.position.set(rand(RIVER_X1 + 3, -HALF + 7), -.1, rand(z0 + 4, z1 - 4)); scene.add(scum); }
  for (let i = 0; i < 64; i++) { // floating: marigolds, diyas, garlands, plastic bags, husks
    const r = Math.random(); let m;
    if (r < .38) m = new T.Mesh(new T.SphereGeometry(rand(.05, .08), 6, 5), mat(pick(['#ff9800', '#ffc107', '#ff7722']), .7));
    else if (r < .55) { m = new T.Group(); const leaf = new T.Mesh(new T.CircleGeometry(.09, 8), new T.MeshStandardMaterial({ color: '#7a5c34', side: T.DoubleSide }));
      leaf.rotation.x = -Math.PI / 2; m.add(leaf);
      const fl = new T.Mesh(new T.ConeGeometry(.028, .07, 6), new T.MeshStandardMaterial({ color: '#ffcf5a', emissive: '#ff9a00', emissiveIntensity: 1.2 })); fl.position.y = .05; m.add(fl); }
    else if (r < .72) { m = new T.Group(); for (let b2 = 0; b2 < 4; b2++) { const bead = new T.Mesh(new T.SphereGeometry(.045, 6, 5), mat(b2 % 2 ? '#ff9800' : '#e8b93c', .8));
      bead.position.set(b2 * .09, 0, rand(-.02, .02)); m.add(bead); } }
    else if (r < .88) { m = new T.Mesh(new T.PlaneGeometry(rand(.18, .3), rand(.14, .24)),
      new T.MeshStandardMaterial({ color: pick(['#9fb8c9', '#c9d4e0', '#8a94a0']), side: T.DoubleSide, roughness: 1 }));
      m.rotation.x = -Math.PI / 2 + rand(-.3, .3); }
    else m = new T.Mesh(new T.SphereGeometry(rand(.07, .11), 7, 5), mat('#6d5426', .95));
    m.position.set(rand(RIVER_X1 + 3, -HALF + 7.5), -.08, rand(z0 + 3, z1 - 3));
    scene.add(m); ripples.push({ m, t: rand(0, TAU), drift: rand(.06, .22) });
  }
  // funeral biers drift on the current: bamboo rafts bearing shrouded bodies given to the river
  // (spawned here in buildGanga; the aghori figures who watch the far shore come with spawnBathers)
  for (let i = 0; i < 3; i++) {
    const raft = new T.Group();
    for (let b3 = 0; b3 < 4; b3++) { const bam = new T.Mesh(new T.CylinderGeometry(.045, .045, 2.1, 5), mat('#a08a5a', .9));
      bam.rotation.z = Math.PI / 2; bam.rotation.y = Math.PI / 2; bam.position.set((b3 - 1.5) * .17, 0, 0); raft.add(bam); }
    const body2 = new T.Mesh(new T.CylinderGeometry(.15, .19, 1.55, 8), mat('#efe8d8', .85));
    body2.rotation.x = Math.PI / 2; body2.position.y = .16; raft.add(body2);
    for (let mg = 0; mg < 5; mg++) { const bead = new T.Mesh(new T.SphereGeometry(.04, 6, 5), mat(mg % 2 ? '#ff9800' : '#c0392b', .7));
      bead.position.set(0, .3, -.55 + mg * .28); raft.add(bead); }
    raft.rotation.y = rand(-.4, .4);
    raft.position.set(rand(RIVER_X1 + 8, -HALF - 6), -.06, rand(z0 + 8, z1 - 8));
    scene.add(raft); ripples.push({ m: raft, t: rand(0, TAU), drift: rand(.1, .2) });
  }
  // offerings and litter strewn down the steps themselves
  for (let i = 0; i < 40; i++) { const sx = rand(-HALF + 8, -HALF + 15.8), sz = rand(z0 + 3, z1 - 3);
    const it = Math.random() < .6
      ? new T.Mesh(new T.SphereGeometry(rand(.04, .07), 6, 5), mat(pick(['#ff9800', '#ffc107', '#c94a10']), .8))
      : new T.Mesh(new T.PlaneGeometry(.2, .26), new T.MeshStandardMaterial({ color: pick(['#e8e2d0', '#c9b8a0']), side: T.DoubleSide, roughness: 1 }));
    if (it.geometry.type === 'PlaneGeometry') it.rotation.x = -Math.PI / 2 + rand(-.2, .2);
    it.position.set(sx, ghatHeightAt(sx, sz) + .05, sz); scene.add(it); }
  // temple umbrellas + tulsi pots along the promenade
  for (let i = 0; i < 6; i++) { const pz = z0 + 8 + i * (len - 16) / 5;
    const um = new T.Mesh(new T.ConeGeometry(1, .8, 8, 1, true), new T.MeshStandardMaterial({ color: pick(['#d98a2b', '#c0392b']), roughness: .9, side: T.DoubleSide }));
    um.position.set(-HALF + 14.2, 2.2, pz); um.castShadow = true; scene.add(um);
    const pole = new T.Mesh(new T.CylinderGeometry(.05, .05, 2.2, 6), mat('#8a6b3a')); pole.position.set(-HALF + 14.2, 1.1, pz); scene.add(pole); }
  // ---- the FAR BANK: wild sand across the wide water ----
  const bank = new T.Mesh(new T.PlaneGeometry(RIVER_X1 - FAR_X + 3, len), new T.MeshStandardMaterial({ color: '#c9b287', roughness: 1 }));
  bank.rotation.x = -Math.PI / 2; bank.position.set((RIVER_X1 + FAR_X) / 2 + 1.5, .02, zm); bank.receiveShadow = true; scene.add(bank); // runs a few metres into the water so you wade out onto sand
  for (let i = 0; i < 26; i++) { // reeds and river stones scattered along the shore
    const rx = rand(RIVER_X1 - 2, RIVER_X1 + 1), rz2 = rand(z0 + 3, z1 - 3);
    if (Math.random() < .55) { const reed = new T.Mesh(new T.CylinderGeometry(.02, .035, rand(.8, 1.6), 5), mat('#8a9a5a', .95));
      reed.position.set(rx, .6, rz2); reed.rotation.z = rand(-.2, .2); scene.add(reed); }
    else { const st = new T.Mesh(new T.SphereGeometry(rand(.12, .3), 7, 6), mat('#9a8f7c', .95));
      st.scale.y = .55; st.position.set(rx - rand(0, 3), .06, rz2); scene.add(st); } }
  const boat2 = new T.Mesh(new T.CylinderGeometry(.8, 1.1, 4.6, 8, 1, false), mat('#5c452e', .9));
  boat2.scale.set(.45, 1, 1); boat2.rotation.z = Math.PI / 2; boat2.rotation.y = .4; boat2.position.set(RIVER_X1 - 3, .35, zm + 8); scene.add(boat2);
  buildTajMahal((RIVER_X1 + FAR_X) / 2 - 1, z0 + len * .24);
  buildAghoriCamp((RIVER_X1 + FAR_X) / 2 + 2, z0 + len * .78);
}
// ---- the Taj Mahal on the far shore, seen shimmering from the ghats like across the Yamuna ----
function buildTajMahal(x, z) {
  const g = new T.Group();
  const marble = mat('#f0ece2', .55), marble2 = mat('#e6e0d2', .6);
  const dark = mat('#4a3a30', .9), gold = new T.MeshStandardMaterial({ color: '#d4af37', metalness: .65, roughness: .3 });
  // raised platform
  const plat = new T.Mesh(new T.BoxGeometry(26, 1.4, 26), marble2); plat.position.y = .7; g.add(plat);
  // main mass with the great iwan portal facing the river (east, +x after rotation)
  const mass = new T.Mesh(new T.BoxGeometry(11, 8.6, 11), marble); mass.position.y = 5.6; g.add(mass);
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { // one iwan per face + flanking arch niches
    const face = new T.Group();
    const frame = new T.Mesh(new T.BoxGeometry(4.6, 7.2, .5), marble2); frame.position.set(0, 5.3, 5.55); face.add(frame);
    const arch = new T.Mesh(new T.CylinderGeometry(1.7, 1.7, .56, 16, 1, false, 0, Math.PI), dark);
    arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2; arch.position.set(0, 6.4, 5.6); face.add(arch);
    const door = new T.Mesh(new T.BoxGeometry(3.4, 4.4, .56), dark); door.position.set(0, 4.2, 5.6); face.add(door);
    for (const sx of [-3.9, 3.9]) for (const yy of [3.2, 6.6]) {
      const nich = new T.Mesh(new T.BoxGeometry(1.5, 2.3, .4), dark); nich.position.set(sx, yy, 5.52); face.add(nich);
      const nArch = new T.Mesh(new T.CylinderGeometry(.75, .75, .4, 12, 1, false, 0, Math.PI), dark); // every niche closes in an arch, never a flat lintel
      nArch.rotation.z = Math.PI / 2; nArch.rotation.y = Math.PI / 2; nArch.position.set(sx, yy + 1.15, 5.52); face.add(nArch); }
    face.rotation.y = ry; g.add(face);
  }
  // drum + the great onion dome, lathe-profiled with the classic swell and point
  const drum = new T.Mesh(new T.CylinderGeometry(3.1, 3.3, 1.6, 18), marble); drum.position.y = 10.6; g.add(drum);
  const prof = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10;
    prof.push(new T.Vector2(Math.sin(Math.min(Math.PI, t * Math.PI * .82 + .35)) * 3.9 * (1 - t * .12), t * 5.6)); }
  prof.push(new T.Vector2(.06, 5.9));
  const dome = new T.Mesh(new T.LatheGeometry(prof, 20), marble); dome.position.y = 11.2; g.add(dome);
  const fin = new T.Mesh(new T.ConeGeometry(.14, 1.5, 8), gold); fin.position.y = 17.6; g.add(fin);
  const finB = new T.Mesh(new T.SphereGeometry(.22, 8, 6), gold); finB.position.y = 17.2; g.add(finB);
  // four chhatris shoulder the dome
  for (const [cx, cz] of [[-3.9, -3.9], [3.9, -3.9], [-3.9, 3.9], [3.9, 3.9]]) {
    const ch = new T.Group();
    for (let p2 = 0; p2 < 4; p2++) { const a = p2 / 4 * TAU; const col = new T.Mesh(new T.CylinderGeometry(.12, .12, 1.5, 6), marble2);
      col.position.set(Math.cos(a) * .8, .75, Math.sin(a) * .8); ch.add(col); }
    const cdome = new T.Mesh(new T.SphereGeometry(1.05, 10, 8, 0, TAU, 0, Math.PI / 2), marble); cdome.position.y = 1.5; ch.add(cdome);
    ch.position.set(cx, 9.9, cz); g.add(ch);
  }
  // four minarets at the platform corners, ringed balconies, capped with chhatris
  for (const [mx2, mz2] of [[-11.6, -11.6], [11.6, -11.6], [-11.6, 11.6], [11.6, 11.6]]) {
    const mn = new T.Group();
    const shaft = new T.Mesh(new T.CylinderGeometry(.62, .88, 11.5, 10), marble); shaft.position.y = 5.75; mn.add(shaft);
    for (const by of [3.8, 7.6]) { const ring = new T.Mesh(new T.TorusGeometry(.85, .14, 6, 14), marble2);
      ring.rotation.x = Math.PI / 2; ring.position.y = by; mn.add(ring); }
    const cap = new T.Mesh(new T.SphereGeometry(.72, 8, 6, 0, TAU, 0, Math.PI / 2), marble); cap.position.y = 11.9; mn.add(cap);
    mn.position.set(mx2, 1.4, mz2); g.add(mn);
  }
  g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; // great iwan faces the river — its terrace meets the water like the real Yamuna front
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
  buildings.push({ x, z, hw: 13.5, hd: 13.5 });
}
// ---- the aghori shamshan on the far shore: ash, bones, and the ones who keep the fire ----
const AGHORI = { x: 0, z: 0 };
function buildAghoriCamp(x, z) {
  AGHORI.x = x; AGHORI.z = z;
  for (const [ox, oz, rr, op] of [[0, 0, 7, 1], [3.2, 2.1, 4.4, .6], [-2.8, -2.6, 3.6, .55], [1.8, -3.4, 3, .5]]) {
    const ashG = new T.Mesh(new T.CircleGeometry(rr, 14), new T.MeshStandardMaterial({ color: '#4e4a44', roughness: 1, transparent: op < 1, opacity: op, depthWrite: op === 1 }));
    ashG.rotation.x = -Math.PI / 2; ashG.rotation.z = rand(0, TAU); ashG.position.set(x + ox, .06 + (op < 1 ? .005 : 0), z + oz); scene.add(ashG); } // ragged spill, not a perfect disc
  // the smoldering pyre they tend
  const embers = new T.Mesh(new T.SphereGeometry(.6, 8, 6), new T.MeshStandardMaterial({ color: '#6a2408', emissive: '#c43a00', emissiveIntensity: 1.1 }));
  embers.scale.y = .3; embers.position.set(x, .18, z); scene.add(embers);
  for (let i = 0; i < 4; i++) { const log = new T.Mesh(new T.CylinderGeometry(.07, .09, 1.3, 6), mat('#2e241a', .95));
    log.rotation.z = Math.PI / 2; log.rotation.y = rand(0, TAU); log.position.set(x + rand(-.6, .6), .14, z + rand(-.6, .6)); scene.add(log); }
  steams.push({ x, y: .8, z, r: .16 });
  // scattered bones and skulls the sect combs the ash for
  const boneM = mat('#ded8c8', .8);
  for (let i = 0; i < 14; i++) { const a = rand(0, TAU), r = rand(1.5, 6.4);
    const bone = new T.Mesh(new T.CylinderGeometry(.03, .03, rand(.25, .5), 5), boneM);
    bone.rotation.set(Math.PI / 2, 0, rand(0, TAU)); bone.position.set(x + Math.cos(a) * r, .1, z + Math.sin(a) * r); scene.add(bone); }
  for (let i = 0; i < 4; i++) { const a = rand(0, TAU), r = rand(2, 5.5);
    const skull = new T.Mesh(new T.SphereGeometry(.11, 8, 6), boneM); skull.scale.set(1, .85, 1.1);
    skull.position.set(x + Math.cos(a) * r, .11, z + Math.sin(a) * r); scene.add(skull); }
  // a planted trishul with a mala hung on it, and kapala bowls by the fire
  const tsh = new T.Group();
  const staff = new T.Mesh(new T.CylinderGeometry(.03, .04, 2.6, 6), mat('#4a3626', .9)); staff.position.y = 1.3; tsh.add(staff);
  for (const sx of [-.09, 0, .09]) { const pr = new T.Mesh(new T.CylinderGeometry(.014, .005, .5, 5), mat('#8a8f96', .4));
    pr.position.set(sx, 2.75, 0); if (sx) pr.rotation.z = -sx * 3; tsh.add(pr); }
  tsh.position.set(x + 2.2, 0, z - 1.4); scene.add(tsh);
  for (let i = 0; i < 3; i++) { const kap = new T.Mesh(new T.SphereGeometry(.13, 8, 6, 0, TAU, Math.PI / 2), mat('#5c4a3a', .8));
    kap.position.set(x + rand(-1.6, 1.6), .1, z + rand(1, 2.2)); scene.add(kap); }
}
function spawnBathers() { // in the Ganga at dawn: some bare-chested in a dhoti, others fully dressed, women in saris
  if (!HERO) return;
  // at each handpump, an uncle mid-bucket-bath — bare torso, lungi, lota pot raised over his head
  for (const spot of pumpsHand) {
    const skin = pick(SKINS);
    const g = makeHuman({ vary: true, skin, outfit: 'kurta', kurta: skin, dhoti: pick(['#7a8a99', '#d9c9a3']), beard: 'stubble', moustache: true, turban: false, hair: 'none', hairColor: '#3a3a3a' });
    g.position.set(spot.x + .9, 0, spot.z + .6); g.rotation.y = rand(0, TAU);
    const h = g.userData.human;
    if (h && h.rHand) { const ws = h.rHand.getWorldScale(new T.Vector3()).x || 1; // the lota in his hand
      const lota = new T.Mesh(new T.SphereGeometry(.07 / ws, 8, 6), new T.MeshStandardMaterial({ color: '#c9952a', metalness: .6, roughness: .35 }));
      h.rHand.add(lota); lota.position.set(0, .05 / ws, 0); }
    scene.add(g); bathers.push({ g, base: 0, t: rand(0, TAU), dip: 0, land: true, pour: true });
  }
  // sadhus hold the ghats: ash-grey and saffron figures in meditation along the promenade
  for (let i = 0; i < 4; i++) {
    const ash = i % 2 === 0;
    const o = ash
      ? { vary: true, naga: true, skin: '#8f8b81', outfit: 'kurta', kurta: '#8f8b81', dhoti: '#8f8b81', beard: 'long', hair: 'jata', hairColor: '#6a6156', turban: false, moustache: true, barefoot: true, mala: true, tilak: 'shaiva', trident: i === 0 }
      : { vary: true, skin: pick(SKINS), outfit: 'khadi', kurta: '#ff8c1a', dhoti: '#ff8c1a', beard: 'long', hair: 'long', turban: false, moustache: true, mala: true, tilak: 'vaishnav' };
    const g = makeHuman(o);
    const gz = -HALF + CELL + 14 + i * 22;
    g.position.set(-HALF + 14.2, 1.1, gz + rand(-3, 3)); g.rotation.y = -Math.PI / 2; // facing the river
    scene.add(g); bathers.push({ g, base: 1.1, t: rand(0, TAU), dip: 0, land: true });
  }
  // white-clad mourners stand at the cremation platforms — MEN ONLY, as at Manikarnika:
  // women stay away from the burning ghat; tears are said to bind the departing soul
  for (const p of pyres) for (let i = 0; i < 4; i++) {
    const o = { vary: true, skin: pick(SKINS), outfit: 'kurta', kurta: '#f2ede2', dhoti: '#f2ede2', beard: pick(['none', 'stubble']), moustache: Math.random() < .5, turban: false, hair: i === 0 ? 'none' : 'crop', hairColor: '#15100b' }; // the chief mourner's head is shaved
    const g = makeHuman(o); const a = rand(0, TAU);
    g.position.set(p.x + Math.cos(a) * 2.4, .5, p.z + Math.sin(a) * 2.4);
    g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z);
    scene.add(g); bathers.push({ g, base: .5, t: rand(0, TAU), dip: 0, land: true });
  }
  const z0 = -HALF + CELL + 10, z1 = -HALF + 2 * CELL - 10;
  // families and neighbours bathe TOGETHER — tight knots of people, not lone swimmers
  const clusters = [rand(z0 + 8, z0 + 30), (z0 + z1) / 2 + rand(-8, 8), rand(z1 - 30, z1 - 8)];
  const nB = GFX === 'low' ? 12 : 20;
  for (let i = 0; i < nB; i++) {
    const skin = pick(SKINS);
    const bare = Math.random() < .55;
    const o = bare
      ? { vary: true, skin, outfit: 'kurta', kurta: skin, dhoti: '#efe6d0', beard: pick(BEARDS), moustache: Math.random() < .7, turban: false, hair: pick(['crop', 'none', 'jura']), hairColor: pick(HAIRCOLS) } // skin-toned torso reads bare-chested
      : (Math.random() < .5
        ? { vary: true, female: true, skin, outfit: 'silk', kurta: pick(['#c2185b', '#00695c', '#e65100']), dhoti: '#f9a825', beard: 'none', moustache: false, turban: false, hair: 'bun' }
        : { vary: true, skin, outfit: 'kurta', kurta: pick(['#efe6d0', '#d9c9a3']), dhoti: '#d9c9a3', beard: pick(BEARDS), moustache: true, turban: false, hair: 'crop' });
    const g = makeHuman(o);
    const bx = rand(-HALF + 4.5, -HALF + 8.5), bz = clusters[i % clusters.length] + rand(-3.5, 3.5);
    g.position.set(bx, rand(-1.15, -.9), bz); g.rotation.y = rand(0, TAU); // waist-deep in the river
    const shower = bare && Math.random() < .4; // mid-snan: the lota raised and tipped over the head
    if (shower) { const h = g.userData.human;
      if (h && h.rHand) { const ws = h.rHand.getWorldScale(new T.Vector3()).x || 1;
        const lota = new T.Mesh(new T.SphereGeometry(.07 / ws, 8, 6), new T.MeshStandardMaterial({ color: '#c9952a', metalness: .6, roughness: .35 }));
        h.rHand.add(lota); lota.position.set(0, .05 / ws, 0); } }
    scene.add(g);
    bathers.push({ g, base: g.position.y, t: rand(0, TAU), dip: 0, pour: shower });
  }
  // and the steps themselves stay busy — drying off, gossiping, watching the river
  const nS = GFX === 'low' ? 5 : 9;
  for (let i = 0; i < nS; i++) {
    const sx = rand(-HALF + 9.5, -HALF + 15), sz = rand(z0 + 4, z1 - 4);
    const g = makeHuman(npcLook(3));
    g.position.set(sx, ghatHeightAt(sx, sz), sz); g.rotation.y = -Math.PI / 2 + rand(-.7, .7); // mostly facing the water
    scene.add(g); bathers.push({ g, base: g.position.y, t: rand(0, TAU), dip: 0, land: true });
  }
  // yoga at first light on the promenade — asanas held and flowing, facing the water
  for (let i = 0; i < 4; i++) {
    const o = npcLook(3); o.turban = false;
    const g = makeHuman(o);
    g.position.set(-HALF + 16.2, 1.1, z0 + 14 + i * 16 + rand(-2, 2)); g.rotation.y = -Math.PI / 2;
    scene.add(g); bathers.push({ g, base: 1.1, t: rand(0, TAU), dip: 0, land: true, yoga: i % 3 });
  }
  // across the water: the aghori comb their shamshan's ash for what the river gives back
  for (let i = 0; i < 5; i++) {
    const askin = pick(['#5f5b55', '#6a6660']);
    const o = { vary: true, naga: true, skin: askin, outfit: 'kurta', kurta: askin, dhoti: askin,
      beard: 'long', hair: 'jata', hairColor: '#3a352e', turban: false, moustache: true, barefoot: true, mala: true, tilak: 'shaiva', trident: i === 0 };
    const g = makeHuman(o); const a = i / 5 * TAU;
    g.position.set(AGHORI.x + Math.cos(a) * rand(2.2, 4.8), 0, AGHORI.z + Math.sin(a) * rand(2.2, 4.8));
    g.rotation.y = a + Math.PI; // ringed around their fire — half of them stooped, searching
    scene.add(g); bathers.push({ g, base: 0, t: rand(0, TAU), dip: 0, land: true, stoop: i % 2 === 1 });
  }
}
function updateBathers(dt) {
  const now = performance.now() / 1000;
  for (const b of bathers) {
    if (b.g.position.distanceToSquared(player.pos) > 70 * 70) continue;
    b.t += dt;
    animateChar(b.g, false, dt, 0);
    if (b.pour) { const h = b.g.userData.human; // pours the lota over his head, again and again
      if (h) { const ph = (Math.sin(b.t * 1.6) + 1) / 2;
        if (h.rArm) { h.rArm.rotation.x = -1.1 - ph * 1.1; h.rArm.rotation.z = -.5; }
        if (h.rFore) h.rFore.rotation.x = -.9 + ph * .3;
        if (h.spine) h.spine.rotation.x = .06;
        if (ph > .93 && Math.random() < .3 && steamPuffs.length < 60) {
          const m = new T.Mesh(new T.PlaneGeometry(.2, .34), new T.MeshBasicMaterial({ color: '#bcd4dc', transparent: true, opacity: .5, depthWrite: false }));
          m.position.set(b.g.position.x, b.g.position.y + 1.7, b.g.position.z); scene.add(m); steamPuffs.push({ m, life: .5 }); } }
      continue; }
    if (b.stoop) { const h = b.g.userData.human; // the aghori, bent double, combing the ash
      if (h) { if (h.spine) h.spine.rotation.x = .92 + Math.sin(b.t * .7) * .22;
        if (h.rArm) h.rArm.rotation.x = 1.05 + Math.sin(b.t * 1.3) * .35;
        if (h.lArm) h.lArm.rotation.x = .8; }
      b.g.rotation.y += Math.sin(b.t * .23) * .0035; continue; }
    if (b.yoga !== undefined) { const h = b.g.userData.human; // slow flow between asanas
      if (h) { const ph = (Math.sin(b.t * .45 + b.yoga * 2.1) + 1) / 2;
        if (b.yoga === 0) { if (h.rArm) h.rArm.rotation.x = -2.9 * ph; if (h.lArm) h.lArm.rotation.x = -2.9 * ph; if (h.spine) h.spine.rotation.x = -.14 * ph; } // arms to the sky
        else if (b.yoga === 1) { if (h.spine) h.spine.rotation.x = 1.15 * ph; if (h.rArm) h.rArm.rotation.x = 1.2 * ph; if (h.lArm) h.lArm.rotation.x = 1.2 * ph; } // forward fold
        else { if (h.rArm) h.rArm.rotation.z = -1.35 * ph; if (h.lArm) h.lArm.rotation.z = 1.35 * ph; } } // arms spread wide
      continue; }
    if (b.land) continue; // mourners just stand with the fire
    if (b.dip > 0) { b.dip -= dt; b.g.position.y = b.base - .5; } // full dunk under Ganga maiya
    else { b.g.position.y = b.base + Math.sin(b.t * 1.3) * .06;
      if (Math.random() < .002) { b.dip = rand(.8, 1.6);
        if (steamPuffs.length < 60) { const m = new T.Mesh(new T.PlaneGeometry(.5, .25), new T.MeshBasicMaterial({ color: '#dce8e4', transparent: true, opacity: .5, depthWrite: false }));
          m.position.set(b.g.position.x, .12, b.g.position.z); scene.add(m); steamPuffs.push({ m, life: .7 }); } } }
  }
  for (const p of pyres) { p.t += dt * 9; p.fire.scale.setScalar(1 + Math.sin(p.t) * .16); p.fire.rotation.y += dt * 2; }
  // the flotsam bobs and drifts downstream, looping back at the reach's end
  if (player.pos.x < -HALF + 90) for (const r of ripples) {
    r.t += dt; r.m.position.y = -.08 + Math.sin(r.t * 1.4) * .025;
    r.m.position.z += r.drift * dt; r.m.rotation.y += dt * .12;
    if (r.m.position.z > -HALF + 2 * CELL - 3) r.m.position.z = -HALF + CELL + 3;
  }
}
function buildCity() {
  buildRoadNetwork();                 // the streets must exist before anything is drawn on them
  const gt = makeGroundTexture(); if ('sRGBEncoding' in T) gt.encoding = T.sRGBEncoding;
  ground = new T.Mesh(new T.PlaneGeometry(WORLD, WORLD), new T.MeshStandardMaterial({ map: gt, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  buildSea(); buildGanga();
  winTexPools = {};
  for (const nf of [2, 3, 5, 8]) winTexPools[nf] = [makeFacadeTexture(0, nf), makeFacadeTexture(1, nf), makeFacadeTexture(2, nf), makeFacadeTexture(3, nf)];
  // Buildings no longer fill cells in a lattice — they LINE THE STREETS. Each one is set back a
  // little from the kerb it faces, turned square to its own street, so the built form follows the
  // crooked network instead of a grid. Frontages vary, setbacks vary, nothing lines up.
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  const plots = [], occ = new Map(), OQ = 8;
  const around = (x, z, r, fn) => { for (let gx = ((x - r + HALF) / OQ) | 0; gx <= ((x + r + HALF) / OQ) | 0; gx++)
    for (let gz = ((z - r + HALF) / OQ) | 0; gz <= ((z + r + HALF) / OQ) | 0; gz++) { if (fn(gx + ',' + gz)) return true; } return false; };
  const fits = (x, z, r) => !around(x, z, r, k => { const arr = occ.get(k);
    return arr && arr.some(o => (o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < (o.r + r) * (o.r + r)); });
  const claim = (x, z, r) => around(x, z, r, k => { let arr = occ.get(k); if (!arr) occ.set(k, arr = []); arr.push({ x, z, r }); return false; });
  const DENS = [.95, .85, .9, .95, .8, .55, .9, .85, .5];  // Goa and Kerala breathe; the old cities are packed
  for (const e of ROADS.edges) {
    if (e.kind === 'highway') continue;
    const di0 = districtAt((e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2), dens = DENS[di0];
    const gap = rand(9, 13);
    for (let s = gap * .6; s < e.len - 5; s += gap) for (const side of [-1, 1]) {
      if (Math.random() > dens) continue;
      const frontage = rand(7, 12), depth = rand(8, 15);
      const off = e.w / 2 + SIDEW + depth / 2 + rand(.2, 1.6);          // its own setback
      const x = e.a.x + e.ux * s - e.uz * side * off, z = e.a.z + e.uz * s + e.ux * side * off;
      const r = Math.max(frontage, depth) * .46;
      if (Math.abs(x) > HALF - 3 || Math.abs(z) > HALF - 3) continue;
      if (inBeach(x, z) || inGhats(x, z)) continue;
      const rr2 = nearRoad(x, z); if (rr2 && rr2.d < rr2.e.w / 2 + SIDEW * .9) continue;  // never on another street
      if (!farFromLandmarks(x, z, 15)) continue;
      if (!fits(x, z, r)) continue;
      claim(x, z, r);
      plots.push({ x, z, rot: Math.atan2(-e.uz * side, e.ux * side) + rand(-.05, .05), w: frontage, d: depth });
    }
  }
  for (const plot of plots) {
    {
      const px2 = plot.x, pz2 = plot.z, rot = plot.rot, cw = plot.w, cd = plot.d;
      const _from = scene.children.length;   // remember every mesh this building adds, to cull it as one
      if (inBeach(px2, pz2) || inGhats(px2, pz2)) continue; // sand and ghats stay open to the sky
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
      // slide each building's texture window sideways so neighbours never show the same clone columns
      const texB = texPick.clone(); texB.needsUpdate = true; texB.offset.x = pick([0, .25, .5, .75]);
      const bm = new T.MeshStandardMaterial({ color: new T.Color(baseCol), map: texB, roughness: .92, metalness: .02 });
      const m = new T.Mesh(boxGeo, bm); m.scale.set(w, h, d); m.position.set(px2, h / 2, pz2); m.rotation.y = rot; m.castShadow = true; m.receiveShadow = true; scene.add(m);
      if (lowRise) { // Kerala / Goa: steep clay-tile hipped roof
        const roofM = mat(pick(['#a24a30', '#94402a', '#b0563a']), .9);
        const rh = Math.max(1.4, h * .3);
        const pyr = new T.Mesh(new T.ConeGeometry(1, 1, 4), roofM);
        pyr.rotation.y = Math.PI / 4 + rot; pyr.scale.set(w * .58, rh, d * .58);
        pyr.position.set(px2, h + rh / 2 - .05, pz2); pyr.castShadow = true; scene.add(pyr);
        const eave = new T.Mesh(boxGeo, roofM); eave.scale.set(w + .5, .22, d + .5); eave.position.set(px2, h + .05, pz2); eave.rotation.y = rot; eave.castShadow = true; scene.add(eave);
      } else {
        const roof = new T.Mesh(boxGeo, mat('#2b2b32')); roof.scale.set(w + .25, .5, d + .25); roof.position.set(px2, h + .1, pz2); roof.rotation.y = rot; roof.castShadow = true; scene.add(roof);
      }
      decubeBuilding(px2, pz2, w, h, d, rot, boxGeo, lowRise);
      addDistrictArchitecture(di2, px2, pz2, w, h, d, boxGeo);
      // water tank + rooftop clutter
      if (Math.random() < .38) { const tk = new T.Mesh(new T.CylinderGeometry(.35, .35, .7, 10), mat('#3a3a3a')); tk.position.set(px2 + w * .2, h + .55, pz2 + d * .2); tk.castShadow = true; scene.add(tk); }
      if (Math.random() < .26) { const ac = new T.Mesh(boxGeo, mat('#c9c4b8')); ac.scale.set(.5, .35, .5); ac.position.set(px2 - w * .25, h + .35, pz2 - d * .2); ac.castShadow = true; scene.add(ac); }
      // ground-floor awning fixed to the wall base (no floating)
      if (Math.random() < .5) { const aw = new T.Mesh(boxGeo, mat(pick(['#c0392b', '#2980b9', '#e0b93c', '#16a085']))); aw.scale.set(w * .9, .16, .6); aw.position.set(px2, 1.7, pz2 + d / 2 + .25); aw.castShadow = true; scene.add(aw); }
      buildings.push({ x: px2, z: pz2, hw: w / 2 + .3, hd: d / 2 + .3 });
      cityChunks.push({ x: px2, z: pz2, parts: scene.children.slice(_from) });
    }
  }
  buildLandmarks();
  scatterProps();
  buildPetrolStations(); buildFilmSet(); buildGalis(); buildGaliMarkets(); buildHandpumps(); buildStreetShrines(); buildHighway();
  // real temples where they belong: by the Kashi ghats and in Purani Dilli's lanes
  buildShikharaTemple(-HALF + 26, -HALF + CELL * 1.35, 1);
  buildShikharaTemple(-HALF + CELL * .62, -HALF + CELL * .55, .8);
  buildShikharaTemple(CELL * .4, HALF - CELL * .45, .9); // Chennai side, north-style shrine near the sea
  buildOfferingStalls(); // and their mala-walas at every temple gate
  buildYantraPlaza(-HALF + 26, -HALF + CELL * 1.35); // Kashi is laid out as a mandala — the geometry made visible
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
    } else if (i === 2) { // ---- JAIPUR, the Pink City: Hawa Mahal, the Maharaja's City Palace, Galtaji ----
      // Hawa Mahal: the pink honeycomb facade — five tiers of jharokha windows built to let the palace women watch the street unseen
      const hc = document.createElement('canvas'); hc.width = 256; hc.height = 128; const hq = hc.getContext('2d');
      hq.fillStyle = '#eda096'; hq.fillRect(0, 0, 256, 128); // unmistakably PINK — no brick red anywhere near it
      hq.fillStyle = '#ffffff'; hq.fillRect(0, 0, 256, 5); hq.fillRect(0, 123, 256, 5);     // white string-courses top and bottom
      for (let r2 = 0; r2 < 4; r2++) for (let c2 = 0; c2 < 12; c2++) { const wx = 8 + c2 * 21, wy = 10 + r2 * 30;
        hq.fillStyle = '#ffffff'; hq.fillRect(wx - 3, wy - 3, 18, 27);                      // bold white chhajja frame
        hq.fillStyle = '#8e3b3b'; hq.beginPath(); hq.moveTo(wx, wy + 22); hq.lineTo(wx, wy + 8);
        hq.arc(wx + 6, wy + 8, 6, Math.PI, 0); hq.lineTo(wx + 12, wy + 22); hq.fill();       // the arched jharokha
        hq.fillStyle = '#ffe4d6'; hq.fillRect(wx - 3, wy + 22, 18, 4); }                     // sill
      const hawaT = new T.CanvasTexture(hc);
      const pinkM = new T.MeshStandardMaterial({ map: hawaT, roughness: .9 });
      for (let tier = 0; tier < 5; tier++) { const w = 16 - tier * 2.6, h2 = 2.6;
        const t2 = new T.Mesh(new T.BoxGeometry(w, h2, 2.2 + (4 - tier) * .35), pinkM);
        t2.position.set(0, 1.3 + tier * h2, 0); g.add(t2);
        const chj = new T.Mesh(new T.BoxGeometry(w + .7, .16, 2.9 + (4 - tier) * .35), mat('#ffffff', .8)); // white chhajja shading each tier
        chj.position.set(0, 2.62 + tier * h2, 0); g.add(chj);
        if (tier > 1) for (const sx of [-w / 2 + .6, w / 2 - .6]) { // domed kiosks stepping up the sides
          const k = new T.Mesh(new T.SphereGeometry(.55, 8, 6, 0, TAU, 0, Math.PI / 2), mat('#e8cfc0', .8));
          k.position.set(sx, 1.3 + tier * h2 + 1.35, 0); g.add(k); } }
      const crown = new T.Mesh(new T.SphereGeometry(.85, 10, 8, 0, TAU, 0, Math.PI / 2), mat('#e8cfc0', .8)); crown.position.y = 14.4; g.add(crown);
      buildings.push({ x: cx, z: cz, hw: 8.4, hd: 2.4 });
      // the City Palace: cream compound wall, the seven-tier Chandra Mahal where the Maharaja's family still lives
      const cp = new T.Group(); cp.position.set(-24, 0, 4); g.add(cp);
      const cream = mat('#f2dfc0', .9), pkTrim = mat('#d1766a', .85);
      for (let tier = 0; tier < 5; tier++) { const w = 9 - tier * 1.4;
        const t3 = new T.Mesh(new T.BoxGeometry(w, 2.2, w * .8), tier % 2 ? pkTrim : cream);
        t3.position.y = 1.1 + tier * 2.2; cp.add(t3);
        const cchj = new T.Mesh(new T.BoxGeometry(w + .6, .14, w * .8 + .6), mat('#ffffff', .8));
        cchj.position.y = 2.2 + tier * 2.2; cp.add(cchj); }
      const bangla = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 3.4, 12, 1, false, 0, Math.PI), cream);
      bangla.rotation.z = Math.PI / 2; bangla.position.y = 11.9; cp.add(bangla); // curved bangla roof
      const cpFlag = new T.Mesh(new T.ConeGeometry(.3, 1, 3), new T.MeshStandardMaterial({ color: '#e8483a', side: T.DoubleSide }));
      cpFlag.rotation.z = Math.PI / 2; cpFlag.position.set(.8, 13.6, 0); cp.add(cpFlag); // the Maharaja is in residence
      const cpPole = new T.Mesh(new T.CylinderGeometry(.04, .04, 2.4, 5), mat('#8a6b3a')); cpPole.position.set(0, 12.8, 0); cp.add(cpPole);
      // Pritam Niwas Chowk: the four seasons gates, each painted a different glory
      const wall = new T.Mesh(new T.BoxGeometry(13, 3.2, .7), cream); wall.position.set(0, 1.6, 5.4); cp.add(wall);
      const seasons = ['#2a7a8c', '#d15b7a', '#3f8c4a', '#e0a02c']; // peacock monsoon, lotus summer, green spring, saffron winter
      for (let s4 = 0; s4 < 4; s4++) { const gx = -4.9 + s4 * 3.25;
        const panel = new T.Mesh(new T.BoxGeometry(2.3, 2.7, .2), mat(seasons[s4], .7)); panel.position.set(gx, 1.55, 5.8); cp.add(panel);
        const arch2 = new T.Mesh(new T.CylinderGeometry(.9, .9, .24, 12, 1, false, 0, Math.PI), mat('#f2dfc0', .8));
        arch2.rotation.z = Math.PI / 2; arch2.rotation.y = Math.PI / 2; arch2.position.set(gx, 2.6, 5.82); cp.add(arch2);
        const dr = new T.Mesh(new T.BoxGeometry(1.1, 1.9, .26), mat('#4a2e1c', .9)); dr.position.set(gx, 1.15, 5.84); cp.add(dr); }
      buildings.push({ x: cx - 24, z: cz + 4, hw: 6.8, hd: 4.6 });
      // Galtaji, the monkey temple: out on a dirt track, pink shikhara over a green kund
      const gj = new T.Group(); gj.position.set(37, 0, 37); g.add(gj);
      const dirtPath = new T.Mesh(new T.PlaneGeometry(30, 3.6), new T.MeshStandardMaterial({ color: '#a8845a', roughness: 1 }));
      dirtPath.rotation.x = -Math.PI / 2; dirtPath.rotation.z = .8; dirtPath.position.set(-10, .03, -10); gj.add(dirtPath);
      const kund = new T.Mesh(new T.PlaneGeometry(7, 5), new T.MeshStandardMaterial({ color: '#4a7a5e', roughness: .3, metalness: .1 }));
      kund.rotation.x = -Math.PI / 2; kund.position.set(0, .05, 4); gj.add(kund); // the sacred green tank the monkeys dive into
      for (let st2 = 0; st2 < 3; st2++) { const step2 = new T.Mesh(new T.BoxGeometry(7.4, .25, .8), mat('#d8b090', .9));
        step2.position.set(0, .12 + st2 * .22, 1.2 - st2 * .7); gj.add(step2); }
      const gtemple = new T.Mesh(new T.BoxGeometry(4, 3, 3.2), mat('#e0a8a0', .9)); gtemple.position.set(0, 1.5, -2.5); gj.add(gtemple);
      const gprof = []; for (let p3 = 0; p3 <= 6; p3++) { const t4 = p3 / 6; gprof.push(new T.Vector2(1.2 * (1 - Math.pow(t4, 1.7)) + .1, t4 * 3)); }
      const gtower = new T.Mesh(new T.LatheGeometry(gprof, 4), mat('#d1766a', .85)); gtower.rotation.y = Math.PI / 4; gtower.position.set(0, 3, -2.5); gj.add(gtower);
      for (const rx of [[-4, 2], [4.5, 5], [3.8, -1.5]]) { const rock = new T.Mesh(new T.SphereGeometry(rand(.8, 1.4), 7, 6), mat('#b09878', .95));
        rock.scale.y = .6; rock.position.set(rx[0], .3, rx[1]); gj.add(rock); }
      buildings.push({ x: cx + 37, z: cz + 37 - 2.5, hw: 2.2, hd: 1.8 });
    } else if (i === 5) { // ---- the ADIYOGI: the great iron face of the first yogi, still and immense ----
      const iron = new T.MeshStandardMaterial({ color: '#5a6068', metalness: .62, roughness: .4 }); // light enough to catch the sun and read as a FACE, not a shadow
      const ad = new T.Group(); ad.position.set(0, 0, 0); g.add(ad);
      const plinth2 = new T.Mesh(new T.BoxGeometry(16, 1.2, 9), mat('#5a5148', .95)); plinth2.position.y = .6; ad.add(plinth2);
      const chest = new T.Mesh(new T.SphereGeometry(4.6, 16, 12), iron); chest.scale.set(1.5, .85, .62); chest.position.y = 3.4; ad.add(chest);
      const neck2 = new T.Mesh(new T.CylinderGeometry(1.7, 2.1, 1.8, 12), iron); neck2.position.y = 6.6; ad.add(neck2);
      const face2 = new T.Mesh(new T.SphereGeometry(2.6, 18, 14), iron); face2.scale.set(1, 1.22, .92); face2.position.y = 9.8; ad.add(face2);
      const nose2 = new T.Mesh(new T.BoxGeometry(.55, 1.3, .5), iron); nose2.position.set(0, 9.5, 2.25); ad.add(nose2);
      for (const sx of [-1, 1]) { // the long closed eyes of deep meditation — big enough to read from the street
        const eye = new T.Mesh(new T.BoxGeometry(1.4, .2, .24), mat('#ded6c2', .45)); eye.rotation.z = -.08 * sx;
        eye.position.set(1.05 * sx, 10.15, 2.32); ad.add(eye); }
      for (let st3 = 0; st3 < 3; st3++) { const strip = new T.Mesh(new T.BoxGeometry(3, .3, .2), mat('#f0ead8', .45));
        strip.position.set(0, 11.1 + st3 * .44, 2.16); ad.add(strip); } // the wide tripundra across the brow
      // matted jata swept back as ONE smooth crest, the coils only hinted at its base
      const crest = new T.Mesh(new T.SphereGeometry(2.2, 14, 10), iron);
      crest.scale.set(1.05, .78, 1.55); crest.position.set(0, 12.35, -1); ad.add(crest);
      for (let j2 = 0; j2 < 2; j2++) { const coil2 = new T.Mesh(new T.TorusGeometry(1.5 - j2 * .35, .32, 8, 14), iron);
        coil2.rotation.x = Math.PI / 2.2; coil2.position.set(0, 12.9 + j2 * .6, -1.2 - j2 * .3); ad.add(coil2); }
      const moon = new T.Mesh(new T.TorusGeometry(.65, .12, 6, 14, Math.PI * 1.2), new T.MeshStandardMaterial({ color: '#d4af37', metalness: .6, roughness: .3 }));
      moon.position.set(1.9, 12.9, .4); moon.rotation.z = .6; ad.add(moon);
      // the meditation ground: dark stone circle ringed with butter lamps
      const medi = new T.Mesh(new T.CircleGeometry(13, 20), new T.MeshStandardMaterial({ color: '#3a3630', roughness: 1 }));
      medi.rotation.x = -Math.PI / 2; medi.position.set(0, .02, 12); g.add(medi);
      for (let l2 = 0; l2 < 12; l2++) { const a2 = l2 / 12 * TAU;
        const lamp = new T.Mesh(new T.SphereGeometry(.12, 6, 5), new T.MeshStandardMaterial({ color: '#ffcf5a', emissive: '#ff9a00', emissiveIntensity: 1.4 }));
        lamp.position.set(Math.cos(a2) * 12.2, .18, 12 + Math.sin(a2) * 12.2); g.add(lamp); }
      buildings.push({ x: cx, z: cz, hw: 8.4, hd: 4.8 });
    } else { // generic tall monument tower per district
      const tower = new T.Mesh(new T.BoxGeometry(5, 14, 5), mat(col)); tower.position.y = 7; g.add(tower);
      const top = new T.Mesh(new T.ConeGeometry(3.4, 4, 4), mat('#f4c20d')); top.position.y = 16; top.rotation.y = Math.PI / 4; g.add(top);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
}
// Contact shadows. Without a dark smudge where a thing meets the ground, everything reads as
// floating — and on the light graphics tier there are no real shadows at all. One shared texture,
// one extra quad per body, and the whole street suddenly sits DOWN on the tarmac.
let _shTex = null;
function shadowTexture() {
  if (_shTex) return _shTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d');
  const gr = q.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(.55, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
  _shTex = new T.CanvasTexture(c); return _shTex;
}
const contactShadows = [];
function addContactShadow(g, rx, rz, op) {
  const m = new T.Mesh(new T.CircleGeometry(1, 14), new T.MeshBasicMaterial({
    map: shadowTexture(), transparent: true, opacity: op || .5, depthWrite: false }));
  m.name = 'contactShadow';
  m.rotation.x = -Math.PI / 2; m.position.y = .02; m.scale.set(rx, rz || rx, 1); m.renderOrder = -1;
  g.add(m); contactShadows.push({ m, host: g }); return m;
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
    // coconut palm: one smooth curved trunk — segments laid ALONG the curve so nothing zigzags
    const lean = rand(.04, .12), leanDir = rand(0, TAU), H = rand(5, 6.6), segs = 6;
    const bark = new T.MeshStandardMaterial({ color: '#9a7d52', map: makeBarkTexture(), roughness: .95 });
    const ptAt = t => new T.Vector3(Math.cos(leanDir) * lean * t * t * H, t * H, Math.sin(leanDir) * lean * t * t * H);
    let px = 0, pz = 0;
    for (let i = 0; i < segs; i++) {
      const a = ptAt(i / segs), b2 = ptAt((i + 1) / segs), dir = b2.clone().sub(a);
      const seg = new T.Mesh(new T.CylinderGeometry(.125 * (1 - (i + 1) / segs * .35), .15 * (1 - i / segs * .3), dir.length() + .06, 8), bark);
      seg.position.copy(a.clone().add(b2).multiplyScalar(.5));
      seg.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
      seg.castShadow = true; g.add(seg);
      px = b2.x; pz = b2.z; }
    const crownY = H + .05;
    const fM = new T.MeshStandardMaterial({ map: makeFrondTexture(), transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .9 });
    for (let k = 0; k < 13; k++) { const a = k / 13 * TAU + rand(-.12, .12);
      const geo = new T.PlaneGeometry(.72, 2.9, 1, 6); const pos = geo.attributes.position;
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
    if (inGhats(p.x, p.z)) continue; // the ghats keep their own furniture
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
    const gb = new T.Mesh(new T.SphereGeometry(rand(.3, .6), 7, 6), mat(pick(['#7a6f4a', '#8a5a3a', '#556b4a']))); gb.position.set(p.x, .2, p.z); gb.scale.y = .5; scene.add(gb); }
  // trees (solid trunks) — palms near coastal/southern districts; canopies keep clear of walls
  for (let i = 0; i < 150 * area; i++) { const p = sidewalkSpot(); if (!p) continue;
    if (!clearOf(p.x, p.z, 1.9) || inGhats(p.x, p.z)) continue;
    const di = districtAt(p.x, p.z); const palm = inBeach(p.x, p.z) ? true : [5, 7, 8].includes(di) ? Math.random() < .7 : Math.random() < .2;
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
      bag.scale.y = .7; bag.position.set(p.x + rand(-.8, .8), .2, p.z + rand(-.8, .8)); scene.add(bag); } }
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
    if (inGhats(p.x, p.z) || inBeach(p.x, p.z)) continue;
    const pole = new T.Mesh(new T.CylinderGeometry(.08, .1, 5, 6), mat('#444')); pole.position.set(p.x, 2.5, p.z); pole.castShadow = true; scene.add(pole);
    const arm = new T.Mesh(boxGeo, mat('#444')); arm.scale.set(.9, .1, .1); arm.position.set(p.x + .4, 4.8, p.z); scene.add(arm);
    const lamp = new T.Mesh(new T.SphereGeometry(.2, 10, 8), new T.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffca6a', emissiveIntensity: 1.6, roughness: .4 })); lamp.position.set(p.x + .8, 4.7, p.z); scene.add(lamp);
    const halo = makeGlowSprite('#ffca6a', 7); halo.position.set(p.x + .8, 4.4, p.z); scene.add(halo); nightGlows.push(halo);
    const pool = makeGlowSprite('#ffb84d', 5.5); pool.position.set(p.x + .8, .6, p.z); scene.add(pool); nightGlows.push(pool);
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
function roadSpot() { // somewhere on the carriageway of a real street
  for (let i = 0; i < 24; i++) {
    const e = ROADS.edges[randi(0, ROADS.edges.length - 1)];
    if (!e || e.kind === 'gali') continue;
    const t = rand(.1, .9), o = rand(-e.w * .3, e.w * .3);
    const x = e.a.x + e.ux * e.len * t - e.uz * o, z = e.a.z + e.uz * e.len * t + e.ux * o;
    if (!inGhats(x, z) && !inBeach(x, z) && Math.abs(x) < HALF - 2 && Math.abs(z) < HALF - 2) return { x, z, e };
  }
  return null;
}
function sidewalkSpot() { // the paving strip beside a street, clear of walls
  for (let i = 0; i < 40; i++) {
    const e = ROADS.edges[randi(0, ROADS.edges.length - 1)];
    if (!e) continue;
    const t = rand(.08, .92), side = Math.random() < .5 ? -1 : 1, o = side * (e.w / 2 + rand(.4, SIDEW - .3));
    const x = e.a.x + e.ux * e.len * t - e.uz * o, z = e.a.z + e.uz * e.len * t + e.ux * o;
    if (Math.abs(x) > HALF - 4 || Math.abs(z) > HALF - 4) continue;
    if (!blocked(x, z)) return { x, z };
  }
  return null;
}
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
    const o = npcLook(districtAt(p.x, p.z)); // men, women in saris, sadhus, sardars, kids — dressed like their district
    const g = makeCharacter(o); g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU); scene.add(g);
    if (o.kid) g.scale.multiplyScalar(rand(.56, .66)); // children, satchel-height
    npcs.push({ g, wealth: o.wealth || 0, female: !!o.female, dir: rand(0, TAU), speed: o.kid ? rand(1.4, 2.2) : rand(.7, 1.5), turn: 0, down: 0, t: rand(0, 10), pause: 0 });
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
    addContactShadow(g, 1.05, 1.75, .45);
    cows.push({ g, dir: rand(0, TAU), speed: rand(.25, .6), t: rand(0, 10) }); }
}

// ---------- the painted elephants of Jaipur: caparisoned, chalk-decorated, unhurried ----------
const elephants = [];
function spawnElephants(n) {
  for (let i = 0; i < n; i++) {
    // they walk the Marwar cell only (the NE district: Jaipur country)
    let p = null;
    for (let t = 0; t < 60; t++) { const x = rand(HALF - CELL + 10, HALF - 10), z = rand(-HALF + 10, -HALF + CELL - 10);
      if (onRoad(x, z) && !blocked(x, z)) { p = { x, z }; break; } }
    if (!p) continue;
    const g = new T.Group();
    const hide = mat('#8a8078', .95), hide2 = mat('#7a716a', .95);
    const deco = pick([['#d15b7a', '#e0b93c'], ['#2a7a8c', '#e0b93c'], ['#c0392b', '#f2e8dc']]); // Rajasthani paint pairs
    const dM = mat(deco[0], .8), dM2 = new T.MeshStandardMaterial({ color: deco[1], metalness: .35, roughness: .5 });
    // the great body, high-shouldered
    const body = new T.Mesh(new T.SphereGeometry(1.05, 16, 12), hide); body.scale.set(1.05, 1.02, 1.62); body.position.y = 1.95; g.add(body);
    const rump = new T.Mesh(new T.SphereGeometry(.82, 12, 10), hide2); rump.position.set(0, 2, -1.3); g.add(rump);
    const head = new T.Mesh(new T.SphereGeometry(.62, 14, 10), hide); head.scale.set(.95, 1.05, .9); head.position.set(0, 2.42, 1.62); g.add(head);
    // painted forehead: the chalked pattern plate between the eyes
    const brow = new T.Mesh(new T.SphereGeometry(.5, 12, 8, 0, TAU, 0, Math.PI / 2.4), dM);
    brow.rotation.x = Math.PI / 2.6; brow.position.set(0, 2.62, 1.86); g.add(brow);
    for (let d3 = 0; d3 < 5; d3++) { const dot = new T.Mesh(new T.SphereGeometry(.045, 6, 5), dM2);
      dot.position.set(-.24 + d3 * .12, 2.86, 2.02); g.add(dot); }
    // the trunk: one continuous chain of segments, each carrying on from the last, curling in
    let ta = .38, tpx = 0, tpy = 2.26, tpz = 2.02;
    for (let s5 = 0; s5 < 6; s5++) { const r5 = .17 - s5 * .021, ln = .34;
      const seg = new T.Mesh(new T.CylinderGeometry(r5, Math.max(.055, r5 - .019), ln + .06, 8), s5 % 2 ? dM : hide);
      const dy = -Math.cos(ta) * ln, dz = Math.sin(ta) * ln;
      seg.position.set(tpx, tpy + dy / 2, tpz + dz / 2); seg.rotation.x = ta;
      g.add(seg); tpy += dy; tpz += dz; ta -= .21; } // eases from forward-hang to a curled tip
    // white tusks curving up
    for (const sx of [-1, 1]) { const tusk = new T.Mesh(new T.ConeGeometry(.07, .85, 8), mat('#e8e2d2', .4));
      tusk.position.set(.3 * sx, 1.95, 2.05); tusk.rotation.x = -1.9; tusk.rotation.z = -.25 * sx; g.add(tusk); }
    // great ears fanning out from the head, angled like sails
    for (const sx of [-1, 1]) { const ear = new T.Mesh(new T.SphereGeometry(.55, 10, 8), hide2);
      ear.scale.set(.2, .95, .68); ear.position.set(.58 * sx, 2.5, 1.5); ear.rotation.z = .3 * sx; ear.rotation.y = .55 * sx;
      const earIn = new T.Mesh(new T.SphereGeometry(.42, 8, 6), dM); earIn.scale.set(.12, .85, .58); earIn.position.set(.56 * sx, 2.5, 1.52); earIn.rotation.z = .3 * sx; earIn.rotation.y = .55 * sx;
      g.add(ear); g.add(earIn); g.userData['ear' + (sx > 0 ? 'R' : 'L')] = ear; }
    // the caparison: fringed cloth settled INTO the back, gold-bordered
    const cloth = new T.Mesh(new T.BoxGeometry(1.9, .1, 2.5), dM); cloth.position.y = 2.86; g.add(cloth);
    const border = new T.Mesh(new T.BoxGeometry(2, .06, 2.6), dM2); border.position.y = 2.82; g.add(border);
    for (let f3 = 0; f3 < 6; f3++) for (const sx of [-1.02, 1.02]) { const tassel = new T.Mesh(new T.SphereGeometry(.05, 6, 5), dM2);
      tassel.position.set(sx, 2.78, -1 + f3 * .42); g.add(tassel); }
    // pillar legs with painted anklets, and toenails
    for (const [sx, sz] of [[-.5, .85], [.5, .85], [-.5, -.95], [.5, -.95]]) {
      const leg = new T.Mesh(new T.CylinderGeometry(.26, .3, 1.55, 10), hide); leg.position.set(sx, .78, sz); g.add(leg);
      if (sz > 0) { const ank = new T.Mesh(new T.TorusGeometry(.3, .05, 6, 12), dM2); ank.rotation.x = Math.PI / 2; ank.position.set(sx, .35, sz); g.add(ank); }
      for (let n2 = 0; n2 < 3; n2++) { const nail = new T.Mesh(new T.SphereGeometry(.055, 6, 5), mat('#e8e2d2', .5));
        nail.position.set(sx - .12 + n2 * .12, .06, sz + .26); g.add(nail); } }
    const tail2 = new T.Mesh(new T.CylinderGeometry(.045, .03, 1.3, 6), hide2); tail2.position.set(0, 1.85, -2.05); tail2.rotation.x = .3; g.add(tail2);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU); scene.add(g);
    addContactShadow(g, 1.5, 2.3, .5);
    elephants.push({ g, dir: rand(0, TAU), speed: rand(.35, .55), t: rand(0, 10) });
  }
}
function updateElephants(dt) {
  for (const e of elephants) {
    e.t += dt;
    if (e.g.position.distanceToSquared(player.pos) > 130 * 130) continue;
    if (Math.sin(e.t * .13) > .92) e.dir += rand(-.5, .5); // occasionally reconsiders its route
    const nx = e.g.position.x + Math.sin(e.dir) * e.speed * dt, nz = e.g.position.z + Math.cos(e.dir) * e.speed * dt;
    // an elephant stays in its own country and off the sand
    if (!blocked(nx, nz) && nx > HALF - CELL + 6 && nz < -HALF + CELL - 6 && !inBeach(nx, nz)) {
      e.g.position.x = nx; e.g.position.z = nz; e.g.rotation.y = lerp(e.g.rotation.y, e.dir, .04); }
    else e.dir += rand(1.2, 2.2);
    e.g.position.y = Math.sin(e.t * 1.7) * .03; // the slow roll of its walk
    e.g.rotation.z = Math.sin(e.t * .85) * .025;
    const eL = e.g.userData.earL, eR = e.g.userData.earR;
    if (eL) eL.rotation.y = Math.sin(e.t * 1.3) * .3;
    if (eR) eR.rotation.y = -Math.sin(e.t * 1.3 + 1) * .3;
  }
}
// ---------- street animals: monkeys (monkey cities) + stray dogs ----------
const monkeys = [], dogs = [];
function spawnMonkeys(n) {
  for (let i = 0; i < n; i++) {
    // monkeys live where they really do: Old Delhi, Marwar, Kashi
    const cell = pick([0, 2, 3]); const mx = cell % 3, mz = (cell / 3) | 0;
    let p = null;
    if (i < 8) p = { x: CELL + 37 + rand(-6, 6), z: -CELL + 37 + rand(-4, 7) }; // the Galtaji troop holds its kund
    else for (let t = 0; t < 40; t++) { const x = rand((mx - 1) * CELL - CELL * .42, (mx - 1) * CELL + CELL * .42), z = rand((mz - 1) * CELL - CELL * .42, (mz - 1) * CELL + CELL * .42);
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
// ---------- galis: the old quarters' lanes are too narrow for cars — two- and three-wheelers only ----------
function inGali(x, z) { // the thinnest lanes of the old quarters: no car fits down them
  const r = nearRoad(x, z);
  return !!r && r.e.kind === 'gali' && r.d < r.e.w / 2 + .4;
}
// North-Indian temple, studied from the real thing: raised plinth, sanctum, CURVILINEAR shikhara
// tower (not a cone!), ribbed amalaka disc at the crown, gold kalasha pot finial, saffron flag.
function buildShikharaTemple(x, z, sc) {
  const g = new T.Group();
  const stone = mat('#e0cfa8', .9), red = mat('#b3402a', .85);
  const plinth = new T.Mesh(new T.BoxGeometry(7, 1, 7), stone); plinth.position.y = .5; g.add(plinth);
  const sanctum = new T.Mesh(new T.BoxGeometry(4.2, 3, 4.2), stone); sanctum.position.y = 2.5; g.add(sanctum);
  const door = new T.Mesh(new T.BoxGeometry(1.3, 2.1, .2), mat('#3a2415', .8)); door.position.set(0, 2, 2.15); g.add(door);
  for (const sx of [-1.1, 1.1]) { const col = new T.Mesh(new T.CylinderGeometry(.16, .18, 2.4, 8), red); col.position.set(sx, 2.2, 2.9); g.add(col); }
  const porch = new T.Mesh(new T.BoxGeometry(3.2, .3, 1.8), red); porch.position.set(0, 3.4, 2.9); g.add(porch);
  // the shikhara: lathe profile with the classic inward curve
  const prof = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8;
    prof.push(new T.Vector2(2.05 * (1 - Math.pow(t, 1.7)) + .12, t * 5.2)); }
  const tower = new T.Mesh(new T.LatheGeometry(prof, 4), stone);
  tower.rotation.y = Math.PI / 4; tower.position.y = 4; g.add(tower);
  // ribbed corner turrets echo the main curve
  for (const [tx, tz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
    const mini = new T.Mesh(new T.LatheGeometry(prof.map(p => new T.Vector2(p.x * .32, p.y * .42)), 4), stone);
    mini.rotation.y = Math.PI / 4; mini.position.set(tx, 4, tz); g.add(mini); }
  const amalaka = new T.Mesh(new T.TorusGeometry(.55, .22, 8, 18), stone); amalaka.rotation.x = Math.PI / 2; amalaka.position.y = 9.35; g.add(amalaka);
  const kalash = new T.Mesh(new T.SphereGeometry(.26, 10, 8), mat('#ffd700', .25)); kalash.position.y = 9.85; g.add(kalash);
  const tip = new T.Mesh(new T.ConeGeometry(.1, .5, 8), mat('#ffd700', .25)); tip.position.y = 10.25; g.add(tip);
  const pole = new T.Mesh(new T.CylinderGeometry(.03, .03, 2, 6), mat('#8a6b3a')); pole.position.set(.5, 10.6, 0); g.add(pole);
  const flag = new T.Mesh(new T.ConeGeometry(.3, .9, 3), new T.MeshStandardMaterial({ color: '#ff7722', emissive: '#c84400', emissiveIntensity: .3, side: T.DoubleSide }));
  flag.rotation.z = Math.PI / 2; flag.position.set(1.05, 11.3, 0); g.add(flag);
  g.scale.setScalar(sc || 1); g.position.set(x, 0, z);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
  buildings.push({ x, z, hw: 3.6 * (sc || 1), hd: 3.6 * (sc || 1) });
  TEMPLES.push({ x, z, sc: sc || 1 });
}
// outside every mandir, the same little economy: mala-walas with marigold garlands,
// baskets of loose flowers, diyas, agarbatti and coconuts for the puja thali
const TEMPLES = [];
function buildOfferingStalls() {
  for (const tp of TEMPLES) for (let s = 0; s < 2; s++) {
    const side = s ? 1 : -1;
    const x = tp.x + side * (3.6 * tp.sc + 2), z = tp.z + 2.6 * tp.sc + 1.4;
    if (onRoad(x, z)) continue;
    const g = new T.Group();
    const wood = mat('#6b4a2a', .9);
    const top = new T.Mesh(new T.BoxGeometry(1.8, .1, .9), mat('#8a6b3a', .9)); top.position.y = .74; g.add(top);
    for (const [lx, lz] of [[-.8, -.35], [.8, -.35], [-.8, .35], [.8, .35]]) {
      const leg = new T.Mesh(new T.CylinderGeometry(.035, .035, .72, 6), wood); leg.position.set(lx, .36, lz); g.add(leg); }
    // two posts and a bar, and the garlands hang from it like a curtain
    for (const px of [-.85, .85]) { const post = new T.Mesh(new T.CylinderGeometry(.03, .035, 1.9, 6), wood); post.position.set(px, .95, -.35); g.add(post); }
    const bar = new T.Mesh(new T.CylinderGeometry(.022, .022, 1.75, 6), wood); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.86, -.35); g.add(bar);
    for (let gi = 0; gi < 7; gi++) { const gx = -.75 + gi * .25;
      const rose = gi % 3 === 2; // every third string is red roses, the rest genda phool
      for (let b2 = 0; b2 < 6; b2++) { const bead = new T.Mesh(new T.SphereGeometry(.038, 6, 5),
        mat(rose ? (b2 % 2 ? '#c0392b' : '#8e2438') : (b2 % 2 ? '#ff9800' : '#ffc107'), .7));
        bead.position.set(gx, 1.78 - b2 * .085, -.35); g.add(bead); } }
    // on the table: baskets of loose flowers, a stack of diyas, agarbatti, coconuts
    for (const [bx2, bcol] of [[-.55, '#ff9800'], [.05, '#c0392b']]) {
      const rim = new T.Mesh(new T.CylinderGeometry(.2, .16, .12, 10, 1, true), mat('#a3814a', .95)); rim.material.side = T.DoubleSide; rim.position.set(bx2, .85, .1); g.add(rim);
      for (let f2 = 0; f2 < 6; f2++) { const fl = new T.Mesh(new T.SphereGeometry(.045, 6, 5), mat(f2 % 2 ? bcol : '#ffc107', .7));
        fl.position.set(bx2 + Math.cos(f2) * .09, .92, .1 + Math.sin(f2 * 2) * .07); g.add(fl); } }
    for (let d2 = 0; d2 < 3; d2++) { const diya = new T.Mesh(new T.SphereGeometry(.05, 6, 5), new T.MeshStandardMaterial({ color: '#c9673a', roughness: .9 }));
      diya.scale.y = .5; diya.position.set(.55, .82 + d2 * .05, .05); g.add(diya); }
    const pot = new T.Mesh(new T.CylinderGeometry(.05, .04, .12, 8), mat('#b3402a', .9)); pot.position.set(.72, .86, .28); g.add(pot);
    for (let a2 = 0; a2 < 4; a2++) { const stick = new T.Mesh(new T.CylinderGeometry(.006, .006, .34, 4), mat('#5c452e', .9));
      stick.rotation.z = rand(-.18, .18); stick.rotation.x = rand(-.14, .14); stick.position.set(.72, 1.04, .28); g.add(stick); }
    for (let c2 = 0; c2 < 3; c2++) { const coco = new T.Mesh(new T.SphereGeometry(.09, 8, 6), mat('#6d4a26', .95));
      coco.position.set(-.15 + c2 * .17, .84, .32); g.add(coco); }
    g.position.set(x, 0, z); g.rotation.y = -side * Math.PI / 2; // the garland curtain faces the temple path
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
    buildings.push({ x, z, hw: 1, hd: 1, parts: [g] });
    vendorSpots.push({ x: x - Math.sin(-side * Math.PI / 2) * .95, z: z - Math.cos(-side * Math.PI / 2) * .95, yaw: -side * Math.PI / 2, kind: 'phool' });
  }
}
// Kashi's sacred geometry: the old city is described as a cosmic mandala centred on its great
// temple — concentric pilgrim circuits, radial lanes, the whole map a yantra. Painted underfoot here.
function buildYantraPlaza(x, z) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const q = c.getContext('2d');
  q.fillStyle = '#c9b896'; q.fillRect(0, 0, 512, 512); // worn stone
  const cx2 = 256, cy2 = 256;
  q.strokeStyle = '#8e3b2a'; q.fillStyle = '#8e3b2a';
  for (const r6 of [244, 210, 118]) { q.lineWidth = r6 === 210 ? 3 : 7; q.beginPath(); q.arc(cx2, cy2, r6, 0, TAU); q.stroke(); } // the circuits
  q.lineWidth = 4;
  for (let p4 = 0; p4 < 12; p4++) { const a3 = p4 / 12 * TAU; // twelve lotus petals between the rings
    const px2 = cx2 + Math.cos(a3) * 164, py2 = cy2 + Math.sin(a3) * 164;
    q.beginPath(); q.ellipse(px2, py2, 44, 18, a3 + Math.PI / 2, 0, TAU); q.stroke(); }
  q.lineWidth = 5; // interlocking triangles at the heart — the yantra
  for (const up of [1, -1]) { q.beginPath();
    for (let v3 = 0; v3 < 3; v3++) { const a4 = up * Math.PI / 2 + v3 / 3 * TAU;
      const vx = cx2 + Math.cos(a4) * 96, vy = cy2 + Math.sin(a4) * 96;
      if (v3 === 0) q.moveTo(vx, vy); else q.lineTo(vx, vy); }
    q.closePath(); q.stroke(); }
  q.beginPath(); q.arc(cx2, cy2, 9, 0, TAU); q.fill(); // the bindu at the centre of everything
  for (let sp = 0; sp < 8; sp++) { const a5 = sp / 8 * TAU + Math.PI / 8; // radial lanes running out of the circle
    q.lineWidth = 3; q.beginPath(); q.moveTo(cx2 + Math.cos(a5) * 214, cy2 + Math.sin(a5) * 214);
    q.lineTo(cx2 + Math.cos(a5) * 250, cy2 + Math.sin(a5) * 250); q.stroke(); }
  const yt = new T.CanvasTexture(c);
  const plaza = new T.Mesh(new T.CircleGeometry(11, 28), new T.MeshStandardMaterial({ map: yt, roughness: .95, transparent: true, opacity: .85 }));
  plaza.rotation.x = -Math.PI / 2; plaza.rotation.z = rand(0, TAU); plaza.position.set(x, .03, z); plaza.receiveShadow = true; scene.add(plaza);
  for (let i = 0; i < 8; i++) { const a6 = i / 8 * TAU; // small shrine stones stand the circuit like the yatra stations
    const st4 = new T.Mesh(new T.BoxGeometry(.5, .7, .5), mat(i % 2 ? '#e07020' : '#c9b896', .9));
    st4.position.set(x + Math.cos(a6) * 10.3, .35, z + Math.sin(a6) * 10.3); st4.castShadow = true; scene.add(st4);
    const stTop = new T.Mesh(new T.SphereGeometry(.22, 8, 6, 0, TAU, 0, Math.PI / 2), mat('#e07020', .8));
    stTop.position.set(x + Math.cos(a6) * 10.3, .7, z + Math.sin(a6) * 10.3); scene.add(stTop); }
}
// streetside shrines: a tiny saffron mandir absorbed into the pavement, marigold and diyas
const shrines = [];
function buildStreetShrines() {
  const area = (WORLD / 180) ** 2;
  for (let i = 0; i < 22 * area; i++) { const p = sidewalkSpot(); if (!p || !clearOf(p.x, p.z, 1.4)) continue;
    if (inBeach(p.x, p.z) || inGhats(p.x, p.z)) continue;
    const g = new T.Group();
    const base = new T.Mesh(new T.BoxGeometry(.9, .8, .8), mat(pick(['#e07020', '#e8e0cc', '#c0392b']), .85)); base.position.y = .4; g.add(base);
    const niche = new T.Mesh(new T.BoxGeometry(.5, .45, .1), mat('#2a1a10', .9)); niche.position.set(0, .5, .38); g.add(niche);
    const idol = new T.Mesh(new T.SphereGeometry(.13, 10, 8), new T.MeshStandardMaterial({ color: '#ff7722', emissive: '#a33c00', emissiveIntensity: .35, roughness: .5 })); idol.position.set(0, .5, .36); g.add(idol);
    const dome = new T.Mesh(new T.SphereGeometry(.42, 10, 8, 0, TAU, 0, Math.PI / 2), mat('#e07020', .8)); dome.position.y = .8; g.add(dome);
    const fin = new T.Mesh(new T.ConeGeometry(.09, .3, 8), mat('#ffd700', .3)); fin.position.y = 1.28; g.add(fin);
    // marigold garland: little orange-yellow beads draped over the front
    for (let m2 = 0; m2 < 9; m2++) { const a = m2 / 8 * Math.PI; // sags between the dome's shoulders
      const bead = new T.Mesh(new T.SphereGeometry(.035, 6, 5), mat(m2 % 2 ? '#ff9800' : '#ffc107', .7));
      bead.position.set(Math.cos(a) * .42, .95 - Math.sin(a) * .3, .42); g.add(bead); }
    const flagP = new T.Mesh(new T.CylinderGeometry(.02, .02, 1.6, 5), mat('#8a6b3a')); flagP.position.set(.5, .8, -.2); g.add(flagP);
    const fl = new T.Mesh(new T.ConeGeometry(.16, .5, 3), new T.MeshStandardMaterial({ color: '#ff7722', side: T.DoubleSide })); fl.rotation.z = Math.PI / 2; fl.position.set(.82, 1.5, -.2); g.add(fl);
    const diya = new T.Mesh(new T.SphereGeometry(.05, 6, 5), new T.MeshStandardMaterial({ color: '#ffcf5a', emissive: '#ff9a00', emissiveIntensity: 1.6 })); diya.position.set(-.3, .82, .3); g.add(diya);
    g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
    shrines.push({ x: p.x, z: p.z });
    buildings.push({ x: p.x, z: p.z, hw: .55, hd: .5 });
  }
}
// municipal handpumps where the street bathes: an old uncle soaping up with his lota pot
const pumpsHand = [];
function buildHandpumps() {
  const spots = [];
  for (let t = 0; t < 200 && spots.length < 2; t++) { const p = sidewalkSpot();   // wherever the old quarters have pavement
    if (p && [0, 3].includes(districtAt(p.x, p.z)) && clearOf(p.x, p.z, 3)) spots.push(p); }
  for (const spot of spots) {
    const g = new T.Group();
    const base = new T.Mesh(new T.BoxGeometry(1.6, .12, 1.6), mat('#9a978f', .9)); base.position.y = .06; g.add(base);
    const body = new T.Mesh(new T.CylinderGeometry(.09, .12, 1.1, 8), mat('#2e7a3a', .6)); body.position.y = .6; g.add(body);
    const lever = new T.Mesh(new T.BoxGeometry(.06, .06, 1), mat('#2e7a3a', .6)); lever.position.set(0, 1.18, -.35); lever.rotation.x = .35; g.add(lever);
    const spout = new T.Mesh(new T.CylinderGeometry(.05, .05, .35, 8), mat('#2e7a3a', .6)); spout.rotation.x = Math.PI / 2; spout.position.set(0, .82, .3); g.add(spout);
    const wet = new T.Mesh(new T.CircleGeometry(1.1, 12), new T.MeshStandardMaterial({ color: '#6a7a80', roughness: .3 })); wet.rotation.x = -Math.PI / 2; wet.position.y = .01; g.add(wet);
    g.position.set(spot.x, 0, spot.z); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
    buildings.push({ x: spot.x, z: spot.z, hw: .5, hd: .5 });
    pumpsHand.push(spot);
  }
}
// The galis are no longer two hand-placed corridors: they are the thinnest edges the network grew,
// picked out of the old quarters and dressed — cobbles, bollards at the mouth, an arch overhead.
const GALI_EDGES = [];
function galiLocal(e, mx, mz) { return (lx, lz) => ({ x: mx + lx * e.uz + lz * e.ux, z: mz - lx * e.ux + lz * e.uz }); }
function buildGalis() {
  const stoneM = mat('#7a7468', .95), postM = mat('#8a8478', .9);
  const cands = ROADS.edges.filter(e => e.kind === 'gali' && e.len > 16 &&
    [0, 3, 2, 6].includes(districtAt((e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2)));
  cands.sort((a, b) => b.len - a.len);
  for (const e of cands.slice(0, 5)) {
    GALI_EDGES.push(e);
    const mx = (e.a.x + e.b.x) / 2, mz = (e.a.z + e.b.z) / 2, half = e.len / 2;
    const L = galiLocal(e, mx, mz);
    const grp = new T.Group(); grp.position.set(mx, 0, mz); grp.rotation.y = Math.atan2(e.ux, e.uz); scene.add(grp);
    const cob = document.createElement('canvas'); cob.width = 64; cob.height = 128; const cg = cob.getContext('2d');
    cg.fillStyle = '#6e6a60'; cg.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 120; i++) { cg.fillStyle = pick(['#7c786c', '#5f5b52', '#87816f']);
      cg.beginPath(); cg.ellipse(rand(0, 64), rand(0, 128), rand(3, 6), rand(2, 4), 0, 0, TAU); cg.fill(); }
    const ct = new T.CanvasTexture(cob); ct.wrapS = ct.wrapT = T.RepeatWrapping; ct.repeat.set(1, e.len / 6);
    const strip = new T.Mesh(new T.PlaneGeometry(3.4, e.len), new T.MeshStandardMaterial({ map: ct, roughness: 1 }));
    strip.rotation.x = -Math.PI / 2; strip.position.y = .03; strip.receiveShadow = true; grp.add(strip);
    for (const lz of [-half + .6, 0, half - .6]) {   // bollards: a scooter slips through, a car cannot
      for (const lx of [-1.15, 0, 1.15]) { const post = new T.Mesh(new T.CylinderGeometry(.14, .17, .85, 8), postM);
        post.position.set(lx, .42, lz); post.castShadow = true; grp.add(post); } }
    for (const lz of [-half + .5, half - .5]) {      // an old arch at each mouth
      for (const lx of [-2.6, 2.6]) { const pil = new T.Mesh(new T.BoxGeometry(.7, 4.4, .7), stoneM);
        pil.position.set(lx, 2.2, lz); pil.castShadow = true; grp.add(pil);
        const w2 = L(lx, lz); buildings.push({ x: w2.x, z: w2.z, hw: .4, hd: .4 }); }
      const lin = new T.Mesh(new T.BoxGeometry(6.4, .7, .9), stoneM); lin.position.set(0, 4.6, lz); lin.castShadow = true; grp.add(lin);
    }
  }
}
// the gali opens onto a surprise: a whole bazaar of carts and produce spread on ground tarps
function buildGaliMarkets() {
  for (const e of GALI_EDGES) {
    const mx = (e.a.x + e.b.x) / 2, mz = (e.a.z + e.b.z) / 2, half = e.len / 2;
    const L = galiLocal(e, mx, mz);
    for (let i = 0; i < 3; i++) {                    // thela carts pushed against the walls
      const p = L(pick([-2.6, 2.6]), rand(-half + 4, half - 4));
      const cart = new T.Group();
      const bed = new T.Mesh(new T.BoxGeometry(1.6, .14, 1), mat('#1e6a5a', .9)); bed.position.y = .8; cart.add(bed);
      for (const sx of [-.6, .6]) { const wl = new T.Mesh(new T.TorusGeometry(.32, .05, 8, 16), mat('#3a2f24', .8));
        wl.rotation.y = Math.PI / 2; wl.position.set(sx, .34, 0); cart.add(wl); }
      const fruit = pick(['#e67e22', '#c0392b', '#e0b93c', '#4f9e2b', '#8e44ad']);
      for (let ring = 0; ring < 3; ring++) { const n = 5 - ring;
        for (let q = 0; q < n * n; q++) { const fx = (q % n - (n - 1) / 2) * .18, fz = ((q / n | 0) - (n - 1) / 2) * .18;
          const fr = new T.Mesh(new T.SphereGeometry(.085, 8, 7), mat(fruit, .55)); fr.position.set(fx, .95 + ring * .14, fz); cart.add(fr); } }
      cart.position.set(p.x, 0, p.z); cart.rotation.y = rand(0, TAU);
      cart.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(cart);
      buildings.push({ x: p.x, z: p.z, hw: 1, hd: .8, parts: [cart] });
    }
    for (let i = 0; i < 4; i++) {                    // produce heaped straight on tarps at ground level
      const p = L(pick([-2.9, 2.9]) + rand(-.4, .4), rand(-half + 3, half - 3));
      const tarp = new T.Mesh(new T.PlaneGeometry(1.7, 1.4), new T.MeshStandardMaterial({ color: pick(['#2a5ba8', '#a89468', '#7a8a5a']), roughness: 1 }));
      tarp.rotation.x = -Math.PI / 2; tarp.rotation.z = rand(0, TAU); tarp.position.set(p.x, .025, p.z); scene.add(tarp);
      const veg = pick(['#4f9e2b', '#c0392b', '#e0b93c', '#7a4a8a', '#e67e22', '#2e7a3a']);
      for (let v2 = 0; v2 < 10; v2++) { const it = new T.Mesh(new T.SphereGeometry(rand(.055, .1), 7, 6), mat(veg, .6));
        it.position.set(p.x + rand(-.55, .55), .1, p.z + rand(-.45, .45)); it.castShadow = true; scene.add(it); }
    }
    for (const fz of [-half * .5, half * .5]) {      // festoons of little flags strung across the lane
      for (let k = 0; k < 9; k++) { const t = k / 8, p = L(-3.2 + t * 6.4, fz);
        const fl = new T.Mesh(new T.ConeGeometry(.11, .3, 3), new T.MeshStandardMaterial({ color: pick(['#e91e63', '#ffc107', '#00bcd4', '#8bc34a', '#ff5722']), side: T.DoubleSide }));
        fl.rotation.x = Math.PI; fl.position.set(p.x, 3.4 - Math.sin(t * Math.PI) * .7, p.z); scene.add(fl); }
    }
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
  if (Math.random() < .11) { // school kids darting through the crowd
    o.kid = true; o.beard = 'none'; o.moustache = false; o.turban = false; o.hair = pick(['crop', 'crop', 'curly']);
    o.outfit = 'kurta'; o.kurta = pick(['#3a5a8a', '#e8e8e8', '#8a3a4a']); o.dhoti = pick(['#3a4a6a', '#5a4a3a']); // uniform-ish
    o.wealth = 1; return o;
  }
  if (Math.random() < .46) { // women — sari (regional weaves) or salwar-kameez
    o.female = true; o.beard = 'none'; o.moustache = false; o.turban = false;
    o.hair = pick(['bun', 'long', 'braid', 'bun']); o.outfit = 'silk';
    o.kurta = pick(['#c2185b', '#7b1fa2', '#00695c', '#e65100', '#1a237e', '#b71c1c', '#f9a825', '#00838f']);
    if (di === 5) { o.kurta = '#f2ecd9'; }                                              // Kerala kasavu: cream & gold
    else if (di === 6) { o.kurta = pick(['#f2ede2', '#efe6d8']); }                       // Bengal: white with red border
    else if (di === 7) { o.kurta = pick(['#b71c1c', '#4a148c', '#e65100', '#00695c']); } // Kanjeevaram silks
    else if (di === 2) { o.kurta = pick(['#e91e63', '#ff5722', '#ffc107', '#00bcd4']); } // Rajasthani ghagra brights
    else if (di === 4 && Math.random() < .6) { o.female = false; o.salwar = true; o.beard = 'none'; o.moustache = false; o.turban = false;
      o.hair = 'long'; o.outfit = 'kurta'; o.kurta = pick(['#c2185b', '#00838f', '#7b1fa2']); o.dhoti = '#ffffff'; } // Punjabi salwar-kameez
    return o;
  }
  // street truth: men wear LIGHT loose kurtas and shirts, not dark tailored jackets
  if (o.wealth < 2) o.kurta = pick(['#f2ede2', '#e8e0cc', '#ffffff', '#d9e8f2', '#e8d9c9', '#c9d9e8', '#e0d0b0', '#d9c9e0']);
  // and a big share of them wear the checked lungi — the definitive anti-suit
  const lungiOdds = [5, 7, 8].includes(di) ? .45 : [0, 3].includes(di) ? .3 : .15;
  if (o.wealth < 2 && Math.random() < lungiOdds) { o.lungi = pick([['#1e3a5c', '#3a6b8a'], ['#2e5d3a', '#5c8a4a'], ['#5c2430', '#8a4a3a'], ['#3a3a44', '#6a6a7a']]);
    o.outfit = 'kurta'; }
  if (di === 4) { o.turban = Math.random() < .75; } // Punjab: sardars everywhere
  else if (di === 3) { const r2 = Math.random(); // Kashi: the city of the spiritual
    if (r2 < .22) { // NAGA SADHU: body smeared in sacred ash, bare-chested, matted jata locks
      o.naga = true; o.skin = pick(['#8f8b81', '#84807a', '#9a968c']); o.outfit = 'kurta'; o.kurta = o.skin; o.dhoti = o.skin;
      o.lungi = null; o.beard = 'long'; o.hair = 'jata'; o.hairColor = '#6a6156'; o.turban = false; o.barefoot = true;
      o.mala = true; o.tilak = 'shaiva'; o.trident = Math.random() < .4; }
    else if (r2 < .55) { // saffron sadhu with rudraksha mala and tilak
      o.outfit = 'khadi'; o.kurta = '#ff8c1a'; o.dhoti = '#ff8c1a'; o.beard = 'long'; o.hair = 'long'; o.turban = false; o.lungi = null;
      o.barefoot = true; o.mala = true; o.tilak = pick(['shaiva', 'vaishnav']); }
    else if (r2 < .7 && !o.female) { o.tilak = 'vaishnav'; o.mala = Math.random() < .4; } } // even lay pilgrims wear the mark
  else if (di === 2) { o.turban = Math.random() < .6; o.turbanColor = pick(['#e91e63', '#ff5722', '#ffc107', '#d81b60', '#ff9933']); } // Marwar: blazing pagris
  else if (di === 5 && Math.random() < .5 && !o.lungi) { o.outfit = 'kurta'; o.kurta = '#ffffff'; o.dhoti = '#ffffff'; o.turban = false; } // Kerala: white mundu
  else if (di === 8 && Math.random() < .4) { o.outfit = 'kurta'; o.kurta = pick(['#f4e6c8', '#e8e8e8', '#b3d9e8']); o.shades = Math.random() < .5; o.turban = false; } // Goa: susegad
  return o;
}
// ---------- Hinglish street talk ----------
const LINES = {
  hail: ['“Kahan jaana hai, bhaiya?”', '“Arre, meter kharab hai — fixed price only!”', '“Baitho baitho! Best price for you, boss.”', '“Traffic bahut hai aaj… thoda extra, haan?”'],
  ok: ['“Theek hai theek hai, chalo!”', '“Arre okay okay — sit, sit.”', '“Bas aapke liye, boss. Chalo.”'],
  no: ['“Nahi nahi! Not possible!”', '“Kya?! Petrol bhi nahi milta itne mein!”', '“Arre boss, joking or what?”'],
};
// around the Adiyogi, the talk is only ever of the inner dimension
const SPIRIT = [
  '“You are not the body. You are not even the mind. Sit with that.”',
  '“Shi-va means: that which is not. Emptiness, full of everything.”',
  '“Do not seek, my friend. Simply become willing. The rest happens.”',
  '“One breath in, one breath out — the whole cosmos passes between.”',
  '“The mind is a mirror, beta. Dust it every single day.”',
  '“Anger is you drinking poison and waiting for the other to die.”',
  '“First engineer the inner. The outer will follow, always.”',
  '“The first yogi taught: stillness is not absence. It is totality.”',
];
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
const patrons = [];
function spawnVendors() {
  if (!HERO) return;
  // a POOL of walas that follows the trade: far-off vendors quietly re-man the stalls around the
  // player (see recycleLife), so every stall you walk past is staffed — without 176 live humans
  const nV = Math.min(GFX === 'low' ? 18 : 34, vendorSpots.length), nP = GFX === 'low' ? 8 : 18;
  for (let i = 0; i < nV; i++) {
    const s = vendorSpots[i];
    const g = makeHuman(npcLook(districtAt(s.x, s.z))); g.position.set(s.x, 0, s.z); g.rotation.y = s.yaw;
    scene.add(g); s.staffed = true;
    vendors.push({ g, kind: s.kind, spot: s, phase: rand(0, TAU), h: g.userData.human, called: 0 });
  }
  for (let c = 0; c < nP; c++) { // customers wait across the counter — sipping chai, arguing the price
    const v = vendors[c % vendors.length]; if (!v) break;
    const s = v.spot, fs2 = Math.sin(s.yaw), fc2 = Math.cos(s.yaw);
    const cg = makeHuman(npcLook(districtAt(s.x, s.z)));
    cg.position.set(s.x + fs2 * 2.2 + fc2 * rand(-.7, .7), 0, s.z + fc2 * 2.2 - fs2 * rand(-.7, .7));
    cg.rotation.y = s.yaw + Math.PI + rand(-.35, .35);
    const sip = Math.random() < .55, h2 = cg.userData.human;
    if (sip && h2 && h2.rHand) { const ws2 = h2.rHand.getWorldScale(new T.Vector3()).x || 1; // the little chai glass
      const glass = new T.Mesh(new T.CylinderGeometry(.028 / ws2, .022 / ws2, .07 / ws2, 8),
        new T.MeshStandardMaterial({ color: '#d9b98a', roughness: .3, transparent: true, opacity: .85 }));
      h2.rHand.add(glass); glass.position.set(0, .04 / ws2, 0); }
    scene.add(cg); patrons.push({ g: cg, h: h2, t: rand(0, TAU), sip });
  }
}
function updatePatrons(dt) {
  for (const c of patrons) { if (c.g.position.distanceToSquared(player.pos) > 45 * 45) continue;
    c.t += dt; animateChar(c.g, false, dt, 0);
    const h = c.h; if (!h) continue;
    if (c.sip) { const ph = (Math.sin(c.t * .9) + 1) / 2; // the glass rises, the glass falls
      if (h.rArm) { h.rArm.rotation.x = -.4 - ph * 1.1; h.rArm.rotation.z = -.18; }
      if (h.rFore) h.rFore.rotation.x = -.5 - ph * .55; }
    else if (h.rArm) h.rArm.rotation.x = -.3 + Math.sin(c.t * 1.5) * .22; // haggling hands
    if (h.spine) h.spine.rotation.y = Math.sin(c.t * .4) * .1;
  }
}
const VENDOR_CRIES = { chai: '“Chaaai chai chai! Garam chai!”', fry: '“Garam jalebi! Samosa le lo!”', panipuri: '“Pani puri, ekdum fresh!”', phool: '“Mala le lo! Phool, prasad, nariyal — sab taaza!”' };
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
    if (d2 < 8 * 8 && v.called <= 0) { v.called = rand(9, 18); const cry = VENDOR_CRIES[v.kind] || VENDOR_CRIES.chai; hint(cry); speak(cry, 1.15); }
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
    if (HEROINE && i === 2) { // Michelle — the real mocap dancer, front and centre
      const g = makeMichelle();
      if (g) { g.position.set(FILM.x, 0, FILM.z + .7); g.rotation.y = Math.PI;
        scene.add(g); FILM.dancers.push(g); continue; } }
    const o = npcLook(1); o.turban = false; o.outfit = 'silk';
    o.kurta = pick(['#e91e63', '#ffc107', '#00bcd4', '#8bc34a', '#ff5722']);
    const g = makeHuman(o); g.position.set(FILM.x + (i - 2) * 1.3, 0, FILM.z + rand(-.1, .1)); g.rotation.y = Math.PI;
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
    if (g.userData.mMixer) { g.userData.mMixer.update(dt); continue; } // Michelle dances her own mocap number
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
// ---------- missions: culture-soaked jobs that pay in rupees AND in dharma ----------
const MISSIONS = [
  { id: 'ganpati', icon: '🐘', name: 'Ganpati Visarjan',
    brief: 'Porte l’idole de Ganpati jusqu’à la mer pour l’immersion!',
    carry: 'idol', cash: 250, dh: 6,
    doneLine: '🐘 “Ganpati Bappa Morya!” — l’idole rejoint la mer' },
  { id: 'dabba', icon: '🥡', name: 'Dabbawala Run',
    brief: 'Livre les tiffins encore chauds — 3 bureaux de Bambai, dans l’ordre!',
    carry: 'tiffin', cash: 180, dh: 4,
    doneLine: '🥡 Tous les repas livrés à l’heure — respect, dabbawala!' },
  { id: 'langar', icon: '🍲', name: 'Langar Seva',
    brief: 'Porte la marmite du langar aux affamés — Kashi puis Purani Dilli. Seva, pas de paiement.',
    carry: 'pot', cash: 0, dh: 14,
    doneLine: '🍲 “Sab barabar.” Le langar a nourri tout le monde · seva accomplie' },
];
function buildMissions() {
  // every point sits ON a road band (roads at x,z = k·20 … k·20+7) so nothing hides inside a block
  MISSIONS[0].giver = { x: 3.5, z: -96.5 };
  MISSIONS[0].stages = [{ x: -24, z: HALF - 6, label: 'la mer (visarjan)' }];
  MISSIONS[1].giver = { x: -16.5, z: -116.5 };
  MISSIONS[1].stages = [
    { x: 23.5, z: -136.5, label: 'bureau 1' },
    { x: -36.5, z: -96.5, label: 'bureau 2' },
    { x: 3.5, z: -76.5, label: 'bureau 3' }];
  MISSIONS[2].giver = { x: 3.5, z: 12 };
  MISSIONS[2].stages = [
    { x: -146, z: -13, label: 'les sadhus des ghats' },
    { x: -116.5, z: -136.5, label: 'les ouvriers de Dilli' }];
  // rotating gold markers over each giver
  for (const M of MISSIONS) {
    const mk = new T.Group();
    const ring = new T.Mesh(new T.TorusGeometry(.7, .08, 8, 22), new T.MeshStandardMaterial({ color: '#ffd700', emissive: '#a88400', emissiveIntensity: .8 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 2.6; mk.add(ring);
    const cone = new T.Mesh(new T.ConeGeometry(.28, .55, 4), ring.material); cone.rotation.x = Math.PI; cone.position.y = 2.15; mk.add(cone);
    mk.position.set(M.giver.x, 0, M.giver.z); scene.add(mk); M.marker = mk; M.cool = 0;
  }
  // one shared beacon for the active objective
  const bc = new T.Mesh(new T.CylinderGeometry(.9, .9, 26, 12, 1, true),
    new T.MeshBasicMaterial({ color: '#ffd700', transparent: true, opacity: .22, side: T.DoubleSide, depthWrite: false }));
  bc.position.y = 13; bc.visible = false; scene.add(bc); buildMissions.beacon = bc;
}
function buildCarry(kind) {
  const g = new T.Group();
  if (kind === 'idol') { const bm = new T.MeshStandardMaterial({ color: '#ff8a2a', roughness: .5 });
    const plate = new T.Mesh(new T.CylinderGeometry(.16, .18, .03, 12), mat('#c9a020', .4)); g.add(plate);
    const body = new T.Mesh(new T.SphereGeometry(.11, 10, 8), bm); body.position.y = .12; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(.075, 10, 8), bm); head.position.y = .27; g.add(head);
    const trunk = new T.Mesh(new T.TorusGeometry(.045, .016, 6, 10, Math.PI * 1.3), bm); trunk.position.set(0, .25, .06); trunk.rotation.x = .4; g.add(trunk);
    const crown = new T.Mesh(new T.ConeGeometry(.055, .09, 8), mat('#ffd700', .3)); crown.position.y = .35; g.add(crown);
    for (const sx of [-1, 1]) { const ear = new T.Mesh(new T.CircleGeometry(.045, 8), new T.MeshStandardMaterial({ color: '#ff8a2a', side: T.DoubleSide })); ear.position.set(.085 * sx, .28, 0); g.add(ear); } }
  else if (kind === 'tiffin') { const steel = new T.MeshStandardMaterial({ color: '#b9bec4', roughness: .3, metalness: .7 });
    for (let i = 0; i < 3; i++) { const tin = new T.Mesh(new T.CylinderGeometry(.09, .09, .07, 12), steel); tin.position.y = .05 + i * .075; g.add(tin); }
    const handle = new T.Mesh(new T.TorusGeometry(.055, .012, 6, 12, Math.PI), steel); handle.position.y = .3; g.add(handle); }
  else { const brass = new T.MeshStandardMaterial({ color: '#c9952a', roughness: .35, metalness: .6 });
    const pot = new T.Mesh(new T.SphereGeometry(.16, 12, 9), brass); pot.scale.y = .8; pot.position.y = .14; g.add(pot);
    const rim = new T.Mesh(new T.TorusGeometry(.1, .022, 8, 14), brass); rim.rotation.x = Math.PI / 2; rim.position.y = .28; g.add(rim);
    const lid = new T.Mesh(new T.CircleGeometry(.1, 12), mat('#8a6b3a', .8)); lid.rotation.x = -Math.PI / 2; lid.position.y = .285; g.add(lid); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
let carryMesh = null;
function attachCarry(kind) {
  const h = player.g.userData.human; if (!h || !h.head) return;
  const ws = h.head.getWorldScale(new T.Vector3()).x || 1;
  carryMesh = buildCarry(kind);
  carryMesh.scale.setScalar(1 / ws); carryMesh.position.set(0, .16 / ws, 0); // carried on the head, desi style
  h.head.add(carryMesh);
}
function removeCarry() { if (carryMesh && carryMesh.parent) carryMesh.parent.remove(carryMesh); carryMesh = null; }
function missionInteract() { // E near a giver or an objective
  if (player.mission) return false; // objectives auto-complete on arrival
  for (const M of MISSIONS) { if (M.cool > 0) continue;
    if ((M.giver.x - player.pos.x) ** 2 + (M.giver.z - player.pos.z) ** 2 < 3.2 * 3.2) {
      player.mission = { M, stage: 0 };
      attachCarry(M.carry);
      toast(M.icon + ' ' + M.brief, '#ffd24d');
      return true; } }
  return false;
}
function updateMissions(dt) {
  const bc = buildMissions.beacon; if (!bc) return;
  for (const M of MISSIONS) { if (M.cool > 0) M.cool -= dt;
    M.marker.visible = M.cool <= 0 && (!player.mission || player.mission.M !== M);
    if (M.marker.visible && M.marker.position.distanceToSquared(player.pos) < 90 * 90) M.marker.rotation.y += dt * 2; }
  const ms = player.mission;
  if (!ms) { bc.visible = false;
    for (const M of MISSIONS) { if (M.cool <= 0 && (M.giver.x - player.pos.x) ** 2 + (M.giver.z - player.pos.z) ** 2 < 3.2 * 3.2) {
      hint(M.icon + ' E — Mission: ' + M.name + (M.cash ? ' (₹' + M.cash + ')' : ' (seva)')); break; } }
    return; }
  const st = ms.M.stages[ms.stage];
  bc.visible = true; bc.position.x = st.x; bc.position.z = st.z; bc.rotation.y += dt;
  const d2 = (st.x - player.pos.x) ** 2 + (st.z - player.pos.z) ** 2;
  if (!player.inVehicle && !player.riding) hint(ms.M.icon + ' ' + st.label + ' — ' + Math.round(Math.sqrt(d2)) + 'm');
  if (d2 < 4 * 4) {
    ms.stage++;
    if (ms.stage >= ms.M.stages.length) {
      removeCarry(); player.cash += ms.M.cash; karma(ms.M.dh); if (ms.M.cash) cashSnd();
      toast(ms.M.doneLine + (ms.M.cash ? '  +₹' + ms.M.cash : '') + ' · +dharma', '#8ef58e');
      ms.M.cool = 150; player.mission = null;
    } else toast(ms.M.icon + ' ' + ms.M.stages[ms.stage - 1].label + ' ✓ — suivant: ' + ms.M.stages[ms.stage].label, '#8ef58e');
  }
}
// ---------- petrol: pumps in the city + the pricier jerrican man on call ----------
const PUMPS = [];
let petrolWala = null;
function buildPetrolStations() {
  let placed = 0;
  for (let t = 0; t < 600 && placed < 5; t++) {
    const p = sidewalkSpot(); if (!p || !clearOf(p.x, p.z, 3.4) || inGhats(p.x, p.z) || inBeach(p.x, p.z)) continue;
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
  // A Bajaj auto-rickshaw is not a box on wheels: it is an EGG. A bulbous front cowl carrying one
  // small wheel and a round headlamp, a curved windscreen, a narrow open cabin, and a canvas canopy
  // that swells over the passengers and drops away at the back. Two-tone, always — a painted lower
  // body under a canopy in another colour: green-and-yellow in Delhi, black-and-yellow in Bombay.
  const g = new T.Group();
  const canopy = color === '#f4c20d' ? '#207a4a' : '#f4c20d';
  const bodyM = mat(color, .45), canM = mat(canopy, .8), blackM = mat('#1c1c20', .75);
  const trimM = mat(shadeHex(color, -34), .6), chrome = mat('#b9bec4', .3);

  // --- the bulbous nose: an egg-shaped cowl over the single front wheel ---
  const cowl = new T.Mesh(new T.SphereGeometry(.5, 16, 12), bodyM);
  cowl.scale.set(.92, 1.15, 1.25); cowl.position.set(0, .72, .76); g.add(cowl);
  const nose = new T.Mesh(new T.SphereGeometry(.3, 12, 10), bodyM);
  nose.scale.set(.9, .8, 1); nose.position.set(0, .5, 1.02); g.add(nose);
  const guard = new T.Mesh(new T.TorusGeometry(.34, .07, 8, 16, Math.PI), trimM);   // front mudguard
  guard.rotation.y = Math.PI / 2; guard.position.set(0, .34, .95); g.add(guard);
  const lamp = new T.Mesh(new T.SphereGeometry(.11, 12, 10), chromeLight(true));
  lamp.name = 'headlight'; lamp.position.set(0, .88, 1.06); g.add(lamp);
  const lampRim = new T.Mesh(new T.TorusGeometry(.12, .022, 6, 14), chrome);
  lampRim.position.set(0, .88, 1.05); g.add(lampRim);

  // --- windscreen: a curved pane, not a flat sheet ---
  const wsh = new T.Mesh(new T.CylinderGeometry(.62, .62, .52, 14, 1, true, -.8, 1.6), glassMat());
  wsh.position.set(0, 1.24, .58); g.add(wsh);
  const wshTop = new T.Mesh(new T.CylinderGeometry(.63, .63, .07, 14, 1, true, -.8, 1.6), trimM);
  wshTop.position.set(0, 1.52, .58); g.add(wshTop);

  // --- floor pan and the narrow lower body ---
  const floor = new T.Mesh(new T.BoxGeometry(1.06, .12, 2.1), blackM); floor.position.set(0, .36, -.15); g.add(floor);
  const skirt = new T.Mesh(new T.SphereGeometry(.6, 14, 10), bodyM);
  skirt.scale.set(.86, .72, 1.5); skirt.position.set(0, .66, -.35); g.add(skirt);
  const rear = new T.Mesh(new T.SphereGeometry(.56, 14, 12), bodyM);                 // the rounded tail
  rear.scale.set(.9, 1.18, .78); rear.position.set(0, 1.0, -1.0); g.add(rear);
  const rearWin = new T.Mesh(new T.CylinderGeometry(.4, .4, .3, 12, 1, true, -.7, 1.4), glassMat());
  rearWin.rotation.y = Math.PI; rearWin.position.set(0, 1.22, -1.02); g.add(rearWin);

  // --- the canopy: a swollen canvas roof that drops away behind ---
  const hood = new T.Mesh(new T.SphereGeometry(.78, 16, 12, 0, TAU, 0, Math.PI * .55), canM);
  hood.scale.set(.78, .52, 1.18); hood.position.set(0, 1.46, -.25); g.add(hood);
  const brow = new T.Mesh(new T.TorusGeometry(.62, .045, 6, 18, Math.PI), canM);     // the fringe over the driver
  brow.rotation.set(Math.PI / 2, 0, 0); brow.position.set(0, 1.62, .3); g.add(brow);
  for (const sx of [-.6, .6]) {                                                      // side flaps rolled up
    const flap = new T.Mesh(new T.CylinderGeometry(.07, .07, 1.2, 8), canM);
    flap.position.set(sx, 1.56, -.3); g.add(flap); }
  for (const [sx, sz] of [[-.56, .42], [.56, .42], [-.56, -.86], [.56, -.86]]) {     // corner pillars
    const pil = new T.Mesh(new T.CylinderGeometry(.028, .028, 1.1, 6), trimM);
    pil.position.set(sx, 1.1, sz); g.add(pil); }
  for (const sx of [-.58, .58]) {                                                    // the grab rail passengers hold
    const rail = new T.Mesh(new T.CylinderGeometry(.022, .022, 1.25, 6), chrome);
    rail.rotation.x = Math.PI / 2; rail.position.set(sx, .95, -.22); g.add(rail); }

  // --- driver's saddle, handlebars, meter, and the passenger bench ---
  const saddle = new T.Mesh(new T.SphereGeometry(.24, 10, 8), blackM);
  saddle.scale.set(.9, .4, 1.1); saddle.position.set(0, .78, .1); g.add(saddle);
  const bar = new T.Mesh(new T.CylinderGeometry(.026, .026, .62, 8), chrome);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.02, .52); g.add(bar);
  for (const sx of [-.29, .29]) { const grip = new T.Mesh(new T.CylinderGeometry(.038, .038, .13, 8), blackM);
    grip.rotation.z = Math.PI / 2; grip.position.set(sx, 1.02, .52); g.add(grip); }
  const meter = new T.Mesh(new T.BoxGeometry(.14, .12, .1), blackM); meter.position.set(.3, 1.14, .46); g.add(meter);
  const bench = new T.Mesh(new T.BoxGeometry(1.0, .16, .62), blackM); bench.position.set(0, .74, -.72); g.add(bench);
  const backRest = new T.Mesh(new T.BoxGeometry(1.0, .42, .12), blackM); backRest.position.set(0, .98, -.99); g.add(backRest);

  // --- wheels: small, fat, and three of them ---
  const fw = wheel(.3, .16); fw.position.set(0, .3, .95); g.add(fw);
  for (const sx of [-.56, .56]) { const w = wheel(.3, .17); w.position.set(sx, .3, -.72); g.add(w); }
  const spare = new T.Mesh(new T.TorusGeometry(.22, .08, 8, 14), blackM);
  spare.position.set(0, .78, -1.3); g.add(spare);
  const spareHub = new T.Mesh(new T.CylinderGeometry(.07, .07, .07, 8), chrome);
  spareHub.rotation.x = Math.PI / 2; spareHub.position.set(0, .78, -1.3); g.add(spareHub);

  g.userData.seat = { x: 0, y: .04, z: .1 };   // low on the saddle — head stays under the canopy
  g.userData.dim = { w: .8, l: 1.5 }; g.userData.maxSpd = 13; g.userData.acc = 10;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// ---------- the Indian commuter motorcycle (a Hero Splendor, near enough) ----------
// Small, upright, indestructible: a teardrop tank, a long flat seat two people share, a round
// chrome headlamp, a chrome exhaust down the right flank, and a rear rack for whatever must ride.
function buildMoto() {
  const g = new T.Group();
  const col = pick(['#a8201a', '#1a3a6b', '#17181c', '#2e6b4a', '#5c2a52', '#7a4a1e']);
  const bodyM = mat(col, .38), blackM = mat('#1c1c20', .8), chrome = mat('#b9bec4', .26, .8);
  const engineM = mat('#5f646b', .45, .6);
  const fw = wheel(.32, .1); fw.position.set(0, .32, .66); g.add(fw);
  const rw = wheel(.32, .13); rw.position.set(0, .32, -.62); g.add(rw);
  for (const sx of [-.1, .1]) {                                   // telescopic forks
    const fork = new T.Mesh(new T.CylinderGeometry(.028, .028, .78, 6), chrome);
    fork.rotation.x = .3; fork.position.set(sx, .7, .56); g.add(fork); }
  const fend = new T.Mesh(new T.TorusGeometry(.37, .05, 6, 14, Math.PI * .55), bodyM);
  fend.rotation.set(0, Math.PI / 2, -.55); fend.position.set(0, .4, .66); g.add(fend);
  const rfend = new T.Mesh(new T.TorusGeometry(.38, .055, 6, 14, Math.PI * .5), bodyM);
  rfend.rotation.set(0, Math.PI / 2, 2.5); rfend.position.set(0, .42, -.62); g.add(rfend);
  const lamp = new T.Mesh(new T.SphereGeometry(.125, 12, 10), chromeLight(true));
  lamp.name = 'headlight'; lamp.scale.z = .7; lamp.position.set(0, .95, .64); g.add(lamp);
  const lampCase = new T.Mesh(new T.CylinderGeometry(.14, .12, .12, 12), chrome);
  lampCase.rotation.x = Math.PI / 2; lampCase.position.set(0, .95, .58); g.add(lampCase);
  const bar = new T.Mesh(new T.CylinderGeometry(.018, .018, .68, 8), chrome);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.08, .5); g.add(bar);
  for (const sx of [-1, 1]) {
    const grip = new T.Mesh(new T.CylinderGeometry(.032, .032, .13, 8), blackM);
    grip.rotation.z = Math.PI / 2; grip.position.set(sx * .3, 1.08, .5); g.add(grip);
    const stem = new T.Mesh(new T.CylinderGeometry(.011, .011, .17, 5), chrome);
    stem.position.set(sx * .3, 1.18, .48); g.add(stem);
    const mir = new T.Mesh(new T.CircleGeometry(.055, 10), chrome);
    mir.rotation.y = sx * .5; mir.position.set(sx * .33, 1.27, .47); g.add(mir);
    const ind = new T.Mesh(new T.SphereGeometry(.028, 6, 5), mat('#e08a1e', .4, 0, '#c96a00'));
    ind.position.set(sx * .26, .92, .58); g.add(ind); }
  const tank = new T.Mesh(new T.SphereGeometry(.25, 14, 10), bodyM);   // teardrop tank
  tank.scale.set(.82, .74, 1.3); tank.position.set(0, .84, .16); g.add(tank);
  const stripe = new T.Mesh(new T.BoxGeometry(.02, .07, .5), mat('#efe6d2', .5));
  stripe.position.set(.2, .86, .16); g.add(stripe);
  const stripe2 = stripe.clone(); stripe2.position.x = -.2; g.add(stripe2);
  const seat = new T.Mesh(new T.BoxGeometry(.29, .11, .82), blackM);   // the long shared seat
  seat.position.set(0, .82, -.3); g.add(seat);
  const seatNose = new T.Mesh(new T.SphereGeometry(.16, 10, 8), blackM);
  seatNose.scale.set(.9, .35, .8); seatNose.position.set(0, .84, .04); g.add(seatNose);
  const eng = new T.Mesh(new T.BoxGeometry(.3, .28, .34), engineM); eng.position.set(0, .5, .02); g.add(eng);
  for (let f2 = 0; f2 < 4; f2++) { const fin = new T.Mesh(new T.BoxGeometry(.34, .02, .3), engineM);
    fin.position.set(0, .42 + f2 * .06, .02); g.add(fin); }                       // cylinder fins
  const exh = new T.Mesh(new T.CylinderGeometry(.045, .06, 1.0, 8), chrome);
  exh.rotation.set(Math.PI / 2 - .05, 0, 0); exh.position.set(.17, .4, -.3); g.add(exh);
  const guard = new T.Mesh(new T.BoxGeometry(.03, .16, .5), bodyM); guard.position.set(-.16, .46, -.28); g.add(guard);
  const rack = new T.Mesh(new T.BoxGeometry(.28, .03, .34), chrome); rack.position.set(0, .88, -.78); g.add(rack);
  const tail = new T.Mesh(new T.BoxGeometry(.12, .08, .05), mat('#a02020', .4, 0, '#901515'));
  tail.position.set(0, .8, -.9); g.add(tail);
  const plate = new T.Mesh(new T.BoxGeometry(.22, .12, .02), new T.MeshStandardMaterial({ map: makePlateTexture(), roughness: .6 }));
  plate.position.set(0, .66, -.92); g.add(plate);
  const stand = new T.Mesh(new T.CylinderGeometry(.018, .018, .34, 5), blackM);
  stand.rotation.z = .5; stand.position.set(-.2, .18, -.3); g.add(stand);
  g.userData.seat = { x: 0, y: -.16, z: .02 };
  g.userData.dim = { w: .42, l: 1.0 }; g.userData.maxSpd = 20; g.userData.acc = 15;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// ---------- the red city bus: barred windows, roof rack, and a destination board ----------
function buildBus() {
  const g = new T.Group();
  const col = pick(['#b5342b', '#1f6b8a', '#2e7a45']);
  const bodyM = mat(col, .5), cream = mat('#efe6d2', .6), blackM = mat('#1c1c20', .8), chrome = mat('#b9bec4', .3, .7);
  const L = 9.4, W = 2.5, H = 2.5, floorY = .95;
  const body = new T.Mesh(new T.BoxGeometry(W, H, L), bodyM); body.position.y = floorY + H / 2; g.add(body);
  const roof = new T.Mesh(new T.CylinderGeometry(W / 2, W / 2, L, 16, 1, false, 0, Math.PI), bodyM);
  roof.rotation.set(0, 0, Math.PI / 2); roof.scale.y = .34; roof.position.y = floorY + H; g.add(roof);
  const band = new T.Mesh(new T.BoxGeometry(W + .04, .34, L + .02), cream);        // the cream waistband
  band.position.y = floorY + H * .52; g.add(band);
  const skirt = new T.Mesh(new T.BoxGeometry(W + .02, .5, L), mat(shadeHex(col, -40), .7));
  skirt.position.y = floorY - .1; g.add(skirt);
  // windows, and the horizontal bars across them that every Indian bus has
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) {
    const z = -L / 2 + 1.1 + i * 1.16;
    const win = new T.Mesh(new T.BoxGeometry(.04, .9, .96), glassMat());
    win.position.set(sx * (W / 2), floorY + H * .68, z); g.add(win);
    for (let b2 = 0; b2 < 3; b2++) { const rod = new T.Mesh(new T.CylinderGeometry(.016, .016, .96, 5), chrome);
      rod.rotation.x = Math.PI / 2; rod.position.set(sx * (W / 2 + .03), floorY + H * .52 + b2 * .2, z); g.add(rod); }
  }
  const wsh = new T.Mesh(new T.BoxGeometry(W - .18, 1.05, .05), glassMat());
  wsh.position.set(0, floorY + H * .66, L / 2); g.add(wsh);
  const rearWin = new T.Mesh(new T.BoxGeometry(W - .3, .8, .05), glassMat());
  rearWin.position.set(0, floorY + H * .66, -L / 2); g.add(rearWin);
  const board = new T.Mesh(new T.BoxGeometry(W - .5, .3, .06), mat('#1a1a1e', .8));   // destination board
  board.position.set(0, floorY + H * 1.02, L / 2 - .04); g.add(board);
  for (let i = 0; i < 5; i++) { const gl = new T.Mesh(new T.BoxGeometry(.16, .1, .02), mat('#f2d24a', .5, 0, '#c9a02b'));
    gl.position.set(-.6 + i * .3, floorY + H * 1.02, L / 2 - .005); g.add(gl); }
  const door = new T.Mesh(new T.BoxGeometry(.06, 1.6, 1.0), mat('#12131a', .9));      // open doorway
  door.position.set(-(W / 2), floorY + .7, L / 2 - 1.7); g.add(door);
  const rack = new T.Mesh(new T.BoxGeometry(W - .5, .08, L - 2.4), chrome);           // roof rack + luggage
  rack.position.y = floorY + H + .5; g.add(rack);
  for (let i = 0; i < 5; i++) { const bag = new T.Mesh(new T.BoxGeometry(rand(.4, .7), rand(.3, .5), rand(.5, .9)),
      mat(pick(['#8a5a3a', '#4a6b8a', '#a89468', '#c0392b']), .9));
    bag.position.set(rand(-.6, .6), floorY + H + .75, rand(-L / 2 + 2, L / 2 - 2)); g.add(bag); }
  for (const sx of [-1, 1]) { const hl = new T.Mesh(new T.SphereGeometry(.13, 10, 8), chromeLight(true));
    hl.name = 'headlight'; hl.position.set(sx * .85, floorY - .05, L / 2); g.add(hl);
    const tl = new T.Mesh(new T.BoxGeometry(.2, .12, .05), mat('#a02020', .4, 0, '#901515'));
    tl.position.set(sx * .85, floorY - .05, -L / 2); g.add(tl); }
  for (const [sx, sz] of [[-1, L / 2 - 1.5], [1, L / 2 - 1.5], [-1, -L / 2 + 2.2], [1, -L / 2 + 2.2], [-1, -L / 2 + 3.4], [1, -L / 2 + 3.4]]) {
    const w = wheel(.55, .3); w.position.set(sx * (W / 2 - .18), .55, sz); g.add(w); }
  const bumper = new T.Mesh(new T.BoxGeometry(W + .1, .22, .2), chrome);
  bumper.position.set(0, floorY - .3, L / 2); g.add(bumper);
  g.userData.seat = { x: .4, y: .5, z: 3.4 }; g.userData.dim = { w: 1.3, l: 4.7 };
  g.userData.maxSpd = 14; g.userData.acc = 9; g.userData.roofH = floorY + H + .5;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// ---------- the Tata lorry: high cab, wooden body, painted everywhere, HORN OK PLEASE ----------
function buildTruck() {
  const g = new T.Group();
  const col = pick(['#1f7ab0', '#c93a2a', '#2e8a52', '#e0891e', '#8a3a8a']);
  const trim = pick(['#f2d24a', '#efe6d2', '#c93a2a', '#1f7ab0']);
  const bodyM = mat(col, .5), trimM = mat(trim, .55), woodM = mat('#8a6b3a', .9);
  const blackM = mat('#1c1c20', .8), chrome = mat('#b9bec4', .3, .7);
  const L = 6.4, W = 2.3;
  const chassis = new T.Mesh(new T.BoxGeometry(W - .3, .3, L), blackM); chassis.position.y = .78; g.add(chassis);
  // cab: tall, upright, sitting over the front axle
  const cab = new T.Mesh(new T.BoxGeometry(W, 1.75, 2.0), bodyM); cab.position.set(0, 1.85, L / 2 - 1.0); g.add(cab);
  const bonnet = new T.Mesh(new T.BoxGeometry(W - .25, .7, .9), bodyM); bonnet.position.set(0, 1.3, L / 2 + .35); g.add(bonnet);
  const grille = new T.Mesh(new T.BoxGeometry(W - .45, .5, .08), chrome); grille.position.set(0, 1.3, L / 2 + .8); g.add(grille);
  const wsh = new T.Mesh(new T.BoxGeometry(W - .3, .75, .06), glassMat()); wsh.position.set(0, 2.15, L / 2 - .02); g.add(wsh);
  const visor = new T.Mesh(new T.BoxGeometry(W + .12, .1, .45), trimM);            // the sun visor over the screen
  visor.rotation.x = -.16; visor.position.set(0, 2.6, L / 2 + .08); g.add(visor);
  for (let i = 0; i < 9; i++) { const tas = new T.Mesh(new T.ConeGeometry(.04, .16, 4), mat(pick(['#c0392b', '#f2d24a', '#2e8a52', '#efe6d2']), .8));
    tas.rotation.x = Math.PI; tas.position.set(-W / 2 + .18 + i * (W - .36) / 8, 2.46, L / 2 + .26); g.add(tas); }  // the fringe
  for (const sx of [-1, 1]) { const sw = new T.Mesh(new T.BoxGeometry(.06, .6, .8), glassMat());
    sw.position.set(sx * (W / 2), 2.1, L / 2 - 1.2); g.add(sw);
    const hl = new T.Mesh(new T.SphereGeometry(.14, 10, 8), chromeLight(true));
    hl.name = 'headlight'; hl.position.set(sx * .72, 1.28, L / 2 + .82); g.add(hl); }
  // cargo body: planked wooden sides on a painted frame
  const bed = new T.Mesh(new T.BoxGeometry(W, .2, 3.5), woodM); bed.position.set(0, 1.2, -L / 2 + 1.9); g.add(bed);
  for (const sx of [-1, 1]) { for (let p2 = 0; p2 < 7; p2++) {
      const plank = new T.Mesh(new T.BoxGeometry(.08, 1.1, .46), p2 % 2 ? woodM : trimM);
      plank.position.set(sx * (W / 2), 1.85, -L / 2 + .4 + p2 * .5); g.add(plank); } }
  const head = new T.Mesh(new T.BoxGeometry(W, 1.5, .12), trimM); head.position.set(0, 2.05, -L / 2 + 3.6); g.add(head);
  const tailgate = new T.Mesh(new T.BoxGeometry(W, 1.1, .12), bodyM); tailgate.position.set(0, 1.85, -L / 2 + .18); g.add(tailgate);
  const okBoard = new T.Mesh(new T.PlaneGeometry(1.9, .85), new T.MeshStandardMaterial({ map: makeHornOkTexture(), roughness: .9 }));
  okBoard.position.set(0, 1.7, -L / 2 + .1); okBoard.rotation.y = Math.PI; g.add(okBoard);
  for (const sx of [-1, 1]) { const flap = new T.Mesh(new T.BoxGeometry(.02, .5, .5), blackM);
    flap.position.set(sx * (W / 2 - .1), .5, -L / 2 + .3); g.add(flap); }
  const bumper = new T.Mesh(new T.BoxGeometry(W + .14, .26, .22), chrome); bumper.position.set(0, .85, L / 2 + .85); g.add(bumper);
  const exh = new T.Mesh(new T.CylinderGeometry(.07, .07, 2.2, 8), chrome); exh.position.set(-(W / 2 + .1), 2.0, L / 2 - 1.9); g.add(exh);
  for (const [sx, sz] of [[-1, L / 2 - 1.1], [1, L / 2 - 1.1], [-1, -L / 2 + 1.5], [1, -L / 2 + 1.5], [-1, -L / 2 + 2.6], [1, -L / 2 + 2.6]]) {
    const w = wheel(.58, .32); w.position.set(sx * (W / 2 - .16), .58, sz); g.add(w); }
  g.userData.seat = { x: .35, y: 1.0, z: L / 2 - 1.1 }; g.userData.dim = { w: 1.2, l: 3.3 };
  g.userData.maxSpd = 15; g.userData.acc = 10; g.userData.roofH = 2.7;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// rounded passenger car: hatch / sedan / taxi / cop
function buildCar(kind, color) {
  const g = new T.Group();
  const col = kind === 'taxi' ? '#141416' : kind === 'cop' ? '#22334e' : color || pick(['#9aa3ad', '#8a2f28', '#25406e', '#c9302c', '#2e6b4a', '#7d3b52', '#d9760b']);
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
  moto:   { len: 2.2, spd: 20, acc: 15, open: true, seat: { x: 0, y: -.16, z: -.1 } },
  bus:    { len: 9.5, spd: 14, acc: 9,  seat: { x: .4, y: .5, z: 3.4 } },
};
// street-plausible Indian paint jobs, light enough to keep the kits' texture detail
// What actually rolls down an Indian street: Maruti hatchbacks in silver and deep red, white cars
// that are really warm ivory, kaali-peeli taxis (black body, yellow roof) in Bombay and all-yellow
// Ambassadors in Kolkata, green-and-yellow CNG autos, red city buses, and lorries hand-painted in
// colours no factory ever offered. Trim panels take a darker shade of the body — never bare grey.
const VEH_PAINTS = {
  sedan: ['#efe9dc', '#9aa3ad', '#7a1f2a', '#25406e', '#3c4a52', '#b8ac96', '#5a7ab0'],
  hatch: ['#c9302c', '#efe9dc', '#2f6ba8', '#9aa3ad', '#d9760b', '#2e6b4a', '#6a2f5c'],
  suv:   ['#2a2f36', '#5f6a72', '#7a1f24', '#e8e2d2', '#26523a', '#334a6b'],
  van:   ['#d8d2c2', '#4a7a9a', '#c9a030', '#8a9098', '#7a3a30'],
  truck: ['#1f7ab0', '#c93a2a', '#2e8a52', '#e0891e', '#8a3a8a'],   // hand-painted Tata lorries
  bus:   ['#c0392b', '#1f6b8a', '#2e7a45', '#d98a30'],
};
const VEH_TRIM = { taxi: '#f2c010', police: '#12326b', bus: '#efe6d2', truck: '#f2d24a' };
function vehLivery(k) {
  if (k === 'taxi') return Math.random() < .5
    ? { body: '#141416', trim: '#f2c010' }        // Bombay kaali-peeli
    : { body: '#f2c010', trim: '#141416' };       // Kolkata's yellow Ambassador
  if (k === 'police') return { body: '#eceadf', trim: '#12326b' };
  const body = (VEH_PAINTS[k] && pick(VEH_PAINTS[k])) || '#b8564a';
  return { body, trim: VEH_TRIM[k] || shadeHex(body, -46) };
}
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
          minY: box.min.y, seat, roofH: size.y * scale,
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
  const liv = vehLivery(k);
  // Painting by mesh NAME failed on half the kit — a van whose body mesh isn't called "body" stayed
  // factory white. So the bodywork is found by SIZE instead: the biggest panels are the car.
  const parts = [];
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone();
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox;
    parts.push({ o, vol: (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z) }); } });
  const big = parts.reduce((a, p2) => Math.max(a, p2.vol), 0);
  // Repaint the BODY only. Overriding every panel turned a lorry into one flat yellow mass — the
  // kit's own materials already give the windows, wheels and lamps their look, so they are left
  // alone. The only thing forced is this: no panel may stay white, ever.
  for (const { o, vol } of parts) {
    const n = (o.name || '') + ((o.material && o.material.name) || '');
    const isBody = /body|chassis|hull|cabin|bonnet|boot/i.test(n) || vol > big * .55;
    if (isBody) { o.material.color = new T.Color(liv.body); o.material.roughness = .45; o.material.metalness = .16; continue; }
    if (/glass|window|windscreen/i.test(n)) { o.material.color = new T.Color('#2b3239'); o.material.roughness = .16; o.material.metalness = .25; continue; }
    if (/wheel|tyre|tire|rim/i.test(n)) { o.material.color = new T.Color('#1b1b1e'); continue; }
    const c = o.material.color, lum = (c.r + c.g + c.b) / 3, sat = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    if (lum > .78 && sat < .1) o.material.color = new T.Color(liv.trim);   // a blank white panel is an unpainted one
  }
  g.add(m);
  g.userData.seat = M.seat; g.userData.dim = M.dim;
  g.userData.maxSpd = M.spd; g.userData.acc = M.acc;
  if (k === 'police') { const bar = new T.Mesh(new T.BoxGeometry(.9, .12, .3), mat('#ff3b3b')); bar.position.set(0, 1.75, 0); g.add(bar); g.userData.bar = bar; }
  if (k !== 'moto') { // Indian number plates front and back (white, black rim)
    for (const zs of [1, -1]) { const plate = new T.Mesh(new T.BoxGeometry(.42, .13, .03), new T.MeshStandardMaterial({ map: makePlateTexture(), roughness: .5 }));
      plate.position.set(0, .34, zs * (M.dim.l - .1)); plate.rotation.y = zs > 0 ? 0 : Math.PI; g.add(plate); } }
  if (k === 'taxi') { const sign = new T.Mesh(new T.BoxGeometry(.46, .15, .22), new T.MeshStandardMaterial({ color: '#ffd21e', emissive: '#8a6a00', emissiveIntensity: .4, roughness: .5 }));
    sign.position.set(0, M.roofH + .07, 0); g.add(sign); }
  if (k === 'truck' || k === 'bus') { // the hand-painted rear board every Indian lorry carries
    const board = new T.Mesh(new T.PlaneGeometry(k === 'bus' ? 2.2 : 1.9, .85), new T.MeshStandardMaterial({ map: makeHornOkTexture(), roughness: .9 }));
    board.position.set(0, k === 'bus' ? 1.7 : 1.45, -(M.dim.l - .08)); board.rotation.y = Math.PI; g.add(board);
  }
  return g;
}
let plateTex = null, hornOkTex = null;
function makePlateTexture() {
  if (plateTex) return plateTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 40; const g = c.getContext('2d');
  g.fillStyle = '#f2f2ec'; g.fillRect(0, 0, 128, 40); g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(2, 2, 124, 36);
  g.fillStyle = '#111'; g.font = '900 22px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MH 12 K 4207', 64, 22);
  plateTex = new T.CanvasTexture(c); return plateTex;
}
function makeHornOkTexture() {
  if (hornOkTex) return hornOkTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 116; const g = c.getContext('2d');
  g.fillStyle = '#d9a521'; g.fillRect(0, 0, 256, 116);
  g.strokeStyle = '#b03020'; g.lineWidth = 8; g.strokeRect(6, 6, 244, 104);
  g.fillStyle = '#b03020'; g.font = '900 34px sans-serif'; g.textAlign = 'center';
  g.fillText('HORN', 128, 44); g.fillStyle = '#1e5c8a'; g.fillText('OK', 128, 76);
  g.fillStyle = '#b03020'; g.font = '900 26px sans-serif'; g.fillText('PLEASE', 128, 104);
  for (const fx of [24, 232]) { g.fillStyle = '#2e7a3a'; g.beginPath(); g.arc(fx, 58, 12, 0, TAU); g.fill();
    g.fillStyle = '#e8e2d2'; g.beginPath(); g.arc(fx, 58, 5, 0, TAU); g.fill(); }
  hornOkTex = new T.CanvasTexture(c); return hornOkTex;
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
  g.userData.seat = { x: 0, y: -.12, z: -.28 };  // hips land ON the saddle, not above it
  g.userData.dim = { w: .45, l: 1.15 }; g.userData.maxSpd = 19; g.userData.acc = 14;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// old Indian roadster bicycle (Hero/Atlas style) — rideable
function buildBicycle() {
  // the Indian roadster is usually black, but the rest of the rack is painted: bottle green,
  // maroon, post-office red, the blue of a school cycle
  const g = new T.Group();
  const frameCol = Math.random() < .55 ? '#1c1c20'
    : pick(['#1e5c3a', '#6b1f28', '#1f3f6b', '#7a4a1e', '#5c2a5c', '#2a6b6b']);
  const black = mat(frameCol, .55);
  const chrome = new T.MeshStandardMaterial({ color: '#c2c7cd', roughness: .3, metalness: .8 });
  const tube = (a, b, r) => { const d = b.clone().sub(a), l = d.length();
    const m = new T.Mesh(new T.CylinderGeometry(r, r, l, 8), black);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    m.position.copy(a.clone().add(b).multiplyScalar(.5)); g.add(m); return m; };
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  // spoked wheels — kept in userData so they actually TURN when ridden
  g.userData.wheels = [];
  for (const sz of [.62, -.62]) {
    const wg = new T.Group();
    const tyre = new T.Mesh(new T.TorusGeometry(.42, .03, 10, 24), mat('#141416', .95)); wg.add(tyre);
    const rim = new T.Mesh(new T.TorusGeometry(.395, .01, 6, 24), chrome); wg.add(rim);
    for (let i = 0; i < 8; i++) { const sp = new T.Mesh(new T.CylinderGeometry(.006, .006, .76, 4), chrome);
      sp.rotation.z = i / 8 * Math.PI; wg.add(sp); }
    const hub = new T.Mesh(new T.CylinderGeometry(.03, .03, .07, 8), chrome); hub.rotation.x = Math.PI / 2; wg.add(hub);
    wg.rotation.y = Math.PI / 2; wg.position.set(0, .42, sz); g.add(wg);
    g.userData.wheels.push(wg);
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
  // a real crankset: arms opposed at 180°, revolving around the bottom bracket when pedalled
  const crank = new T.Group(); crank.position.set(0, .46, .05);
  for (const sx of [-.095, .095]) {
    const arm = new T.Mesh(new T.BoxGeometry(.02, .19, .035), mat('#2a2c32', .6));
    arm.position.set(sx, sx > 0 ? .09 : -.09, 0); crank.add(arm);
    const ped = new T.Mesh(new T.BoxGeometry(.1, .022, .11), mat('#3a3a40', .8));
    ped.position.set(sx * 1.7, sx > 0 ? .18 : -.18, 0); crank.add(ped);
  }
  g.add(crank); g.userData.crank = crank;
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
  g.userData.seat = { x: 0, y: .02, z: -.3 };   // hips land ON the saddle, not above it
  g.userData.dim = { w: .35, l: 1.0 }; g.userData.maxSpd = 7.5; g.userData.acc = 5.5;
  return g;
}
// stunt ramps (tremplins) on paved roads — drive up, fly off
// ---------- the flyover: an elevated highway crossing the city east-west, GTA bridge style ----------
const HW_Z = CELL / 2, HW_H = 7, HW_W = 9, HW_SLOPE = 42;
function highwayHeightAt(x, z) {
  if (Math.abs(z - HW_Z) > HW_W / 2) return 0;
  if (x < -HALF + 2 || x > HALF - 2) return 0;
  if (x < -HALF + 2 + HW_SLOPE) return HW_H * (x - (-HALF + 2)) / HW_SLOPE;
  if (x > HALF - 2 - HW_SLOPE) return HW_H * ((HALF - 2) - x) / HW_SLOPE;
  return HW_H;
}
function buildHighway() {
  const deckM = mat('#3a3a40', .95), railM = mat('#c9ccd2', .6), pillM = mat('#8a8a86', .9);
  const segs = 24, x0 = -HALF + 2, x1 = HALF - 2, segL = (x1 - x0) / segs;
  for (let i = 0; i < segs; i++) {
    const xa = x0 + i * segL, xb = xa + segL, xm = (xa + xb) / 2;
    const ya = highwayHeightAt(xa, HW_Z), yb = highwayHeightAt(xb, HW_Z), ym = (ya + yb) / 2;
    const deck = new T.Mesh(new T.BoxGeometry(Math.hypot(segL, yb - ya) + .3, .5, HW_W), deckM);
    deck.position.set(xm, ym - .25 + .25, HW_Z); deck.rotation.z = -Math.atan2(yb - ya, segL);
    deck.castShadow = true; deck.receiveShadow = true; scene.add(deck);
    for (const zs of [-1, 1]) { const rail = new T.Mesh(new T.BoxGeometry(Math.hypot(segL, yb - ya) + .3, .5, .16), railM);
      rail.position.set(xm, ym + .5, HW_Z + zs * (HW_W / 2 - .1)); rail.rotation.z = deck.rotation.z; scene.add(rail); }
    if (i % 2 === 0 && ym > 1.2) { const pil = new T.Mesh(new T.CylinderGeometry(.6, .7, ym, 10), pillM);
      pil.position.set(xm, ym / 2 - .2, HW_Z); pil.castShadow = true; scene.add(pil);
      buildings.push({ x: xm, z: HW_Z, hw: .8, hd: .8 }); }
  }
}
const ramps = [];
function buildRamps() {
  const rM = mat('#7a5a34', .95), sM = mat('#5c4326', .95); // weathered wood planks
  let placed = 0;
  for (let tries = 0; tries < 500 && placed < 4; tries++) {
    const p = roadSpot(); if (!p || !p.e) continue;
    if (!p.e.dirt || p.e.len < 14) continue;      // stunt ramps hide down the dirt lanes, Vice-City style
    const yaw = Math.atan2(p.e.ux, p.e.uz);       // laid along whichever way the lane runs
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
function ghatHeightAt(x, z) { // the stone steps down to the Ganga
  if (!inGhats(x, z)) return 0;
  if (x > -HALF + 17.5) return 0;
  if (x > -HALF + 15.2) return 1.1;                       // promenade top
  return clamp((x + HALF - 7.7) / 6.8, 0, 1) * .95;       // steps easing into the water
}
function rampHeightAt(x, z) {
  const hw = highwayHeightAt(x, z); if (hw > 0) return hw;
  const gh = ghatHeightAt(x, z); if (gh > 0) return gh;
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
// the impossible loads of the subcontinent: milk cans, gas cylinders, mattresses, sacks, ladders
let wtfHumans = 0;
function addWtfLoad(g, kind) {
  const r = Math.random();
  if (kind === 'cycle' && r < .45) {
    if (r < .18) { for (const sx of [-1, 1]) for (const zz of [-.5, -.72]) { // dented aluminium milk cans
      const can = new T.Mesh(new T.CylinderGeometry(.11, .13, .34, 8), new T.MeshStandardMaterial({ color: '#b9bec4', roughness: .35, metalness: .7 }));
      can.position.set(sx * .26, .62, zz); g.add(can);
      const lid = new T.Mesh(new T.SphereGeometry(.08, 8, 6), can.material); lid.position.set(sx * .26, .82, zz); g.add(lid); } }
    else if (r < .3) { for (const sx of [-.16, .16]) { // LPG cylinders roped on
      const cyl = new T.Mesh(new T.CylinderGeometry(.14, .14, .44, 10), mat('#b32418', .55)); cyl.position.set(sx, .68, -.6); g.add(cyl); } }
    else { const sack = new T.Mesh(new T.SphereGeometry(.34, 9, 7), mat(pick(['#a89468', '#8a7a5a']), .95)); // monster jute sack
      sack.scale.set(1.2, .9, 1.4); sack.position.set(0, .82, -.6); g.add(sack); }
  }
  else if ((kind === 'moto' || kind === 'enfield') && r < .35 && HERO && wtfHumans < 8) {
    // the whole family on one scooter: pillion riding side-saddle + a kid up front
    const seat = g.userData.seat || { x: 0, y: .5, z: -.1 };
    const po = npcLook(4); po.turban = false;
    const pass = makeHuman(Math.random() < .6 ? { ...po, female: true, beard: 'none', moustache: false, hair: 'bun', outfit: 'silk' } : po);
    const side = Math.random() < .55;                       // women ride side-saddle, in a sari
    g.add(pass); pass.position.set(seat.x + (side ? .1 : 0), seat.y, seat.z - .62);
    pass.rotation.y = side ? 1.35 : 0;
    if (pass.userData.human) { pass.userData.human.seated = true;
      pass.userData.human.bike = !side; pass.userData.human.sideSaddle = side;
      animateChar(pass, false, .03, 0); }
    wtfHumans++;
    if (Math.random() < .5 && wtfHumans < 8) { const kid = makeHuman({ vary: false, skin: pick(SKINS), outfit: 'kurta', kurta: pick(KURTAS), dhoti: pick(DHOTIS), beard: 'none', moustache: false, turban: false, hair: 'crop' });
      kid.scale.multiplyScalar(.55); g.add(kid); kid.position.set(seat.x, seat.y + .3, seat.z + .52);  // standing on the footboard, in front of papa
      if (kid.userData.human) { kid.userData.human.seated = true; kid.userData.human.bike = true; animateChar(kid, false, .03, 0); } wtfHumans++; }
  }
  else if (kind === 'auto' && r < .4) {
    if (r < .18) { const mat2 = new T.Mesh(new T.CylinderGeometry(.34, .34, 1.9, 10), mat(pick(['#c0392b', '#5577bb', '#8a7a5a']), .95)); // rolled mattress across the roof
      mat2.rotation.z = Math.PI / 2; mat2.position.set(0, 1.85, 0); g.add(mat2); }
    else if (r < .3) { const lad = new T.Mesh(new T.BoxGeometry(.5, .08, 4.2), mat('#8a6b3a', .9)); // ladder way too long
      lad.position.set(0, 1.8, -.4); g.add(lad);
      const rag = new T.Mesh(new T.PlaneGeometry(.25, .3), new T.MeshStandardMaterial({ color: '#c0392b', side: T.DoubleSide })); rag.position.set(0, 1.7, -2.4); g.add(rag); }
    else for (let i2 = 0; i2 < 4; i2++) { const sk = new T.Mesh(new T.SphereGeometry(rand(.2, .28), 8, 6), mat(pick(['#a89468', '#c9760b', '#8a7a5a']), .95));
      sk.scale.y = .7; sk.position.set(rand(-.3, .3), 1.78, rand(-.5, .3)); g.add(sk); }
  }
  else if (kind === 'truck' && r < .6) { for (let i2 = 0; i2 < 7; i2++) { // grain sacks piled high
    const sk = new T.Mesh(new T.SphereGeometry(rand(.3, .42), 8, 6), mat(pick(['#a89468', '#bfa87a', '#8a7a5a']), .95));
    sk.scale.y = .72; sk.position.set(rand(-.6, .6), 1.7 + (i2 > 3 ? .5 : 0), rand(-1.8, .2)); g.add(sk); } }
  else if (kind === 'bus' && r < .5) { // roof rack: trunks, bundles and someone's bicycle
    const rack = new T.Mesh(new T.BoxGeometry(2, .08, 5.5), mat('#5a5f66', .6)); rack.position.set(0, 3.05, 0); g.add(rack);
    for (let i2 = 0; i2 < 5; i2++) { const bx = new T.Mesh(new T.BoxGeometry(rand(.5, .9), rand(.3, .5), rand(.6, 1)), mat(pick(['#8a5a3a', '#4a6b8a', '#a89468', '#c0392b']), .9));
      bx.position.set(rand(-.6, .6), 3.3, rand(-2.2, 2.2)); bx.rotation.y = rand(-.2, .2); g.add(bx); } }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
}
const vehicles = [];
function spawnVehicles(n) {
  for (let i = 0; i < n; i++) { const p = roadSpot(); if (!p) continue;
    const r = Math.random();
    let g = null, kind = '';
    if (VEHM.sedan) { // real models: Kenney kit + bus + our Bajaj / Enfield / roadster cycle
      // Indian traffic is two- and three-wheelers first, cars second
      kind = r < .32 ? 'auto' : r < .5 ? 'moto' : r < .57 ? 'taxi' : r < .62 ? 'sedan' : r < .66 ? 'hatch' :
             r < .69 ? 'suv' : r < .72 ? 'van' : r < .76 ? 'truck' : r < .8 ? 'bus' : r < .92 ? 'cycle' : 'enfield';
      g = kind === 'auto' ? buildAuto(pick(['#f4c20d', '#f4c20d', '#207a4a', '#1a1a1e'])) :
          kind === 'enfield' ? buildEnfield() : kind === 'cycle' ? buildBicycle() : kind === 'moto' ? buildMoto() : kind === 'bus' ? buildBus() : kind === 'truck' ? buildTruck() : buildVehModel(kind);
    }
    if (!g) { kind = r < .34 ? 'auto' : r < .5 ? 'hatch' : r < .68 ? 'sedan' : r < .82 ? 'taxi' : r < .92 ? 'cycle' : 'enfield';
      g = kind === 'auto' ? buildAuto(pick(['#f4c20d', '#f4c20d', '#207a4a', '#1a1a1e'])) :
          kind === 'enfield' ? buildEnfield() : kind === 'cycle' ? buildBicycle() : buildCar(kind); }
    g.position.set(p.x, 0, p.z); g.rotation.y = rand(0, TAU);
    scene.add(g);
    const dim = g.userData.dim || { w: .95, l: 2.2 };
    addContactShadow(g, (dim.w || 1) * 1.45, (dim.l || 2) * 1.02, .45);
    const v = { g, kind, yaw: g.rotation.y, speed: 0, ai: true, aiDir: rand(0, TAU), aiTimer: 0,
      hw: dim.w, hl: dim.l,
      horn: kind === 'cycle' ? 4 : (kind === 'truck' || kind === 'bus') ? 2 :
            Math.random() < .22 ? 3 : (kind === 'moto' || kind === 'auto') ? 1 : 0 };
    if (kind === 'cycle') { v.cruise = rand(2, 3.5); }
    v.smoke = kind === 'auto' || kind === 'truck' || kind === 'bus' || Math.random() < .18; // old engines cough
    const head = makeGlowSprite('#ffe9b8', 2.6); head.position.set(0, .7, (dim.l || 1.5) + .4); g.add(head); nightGlows.push(head); // headlight at night
    addWtfLoad(g, kind); // India carries EVERYTHING on two wheels
    // riders are always visible on two-wheelers; autos often carry a hireable driver
    const isBike = kind === 'moto' || kind === 'enfield' || kind === 'cycle';
    if (HERO && isBike) {
      const o = { skin: pick(SKINS), turban: Math.random() < .3, turbanColor: pick(TURBANS),
        kurta: pick(KURTAS), dhoti: pick(DHOTIS), beard: pick(BEARDS), moustache: true,
        outfit: pick(['kurta', 'kurta', 'khadi', 'silk']), hair: pick(['crop', 'crop', 'part', 'curly']) };
      const d = makeHuman(o); const seat = g.userData.seat;
      g.add(d); d.position.set(seat.x, seat.y, seat.z);
      if (d.userData.human) { d.userData.human.seated = true;
        if (kind === 'moto' || kind === 'enfield') d.userData.human.bike = true;
        animateChar(d, false, .03, 0); }
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
  if (k === 'j') { if (player.swim) { if (performance.now() - (player.diveT || 0) > 500) { player.diveT = performance.now(); player.dive = !player.dive; } } else punch(); }
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
  bind('tPunch', () => { if (player.swim) { player.diveT = performance.now(); player.dive = !player.dive; } else punch(); }); // in water the fist button dives
  bind('tSpit', spit);
  bind('tRadio', () => { if (player.inVehicle) { const st = Radio.switch(); toast('\ud83d\udcfb ' + st.name, '#8ef58e'); } });
  bind('tPhone', callPetrolWala);
  bind('tE', () => { if (player.nego) haggle(); else tryVisit(); });
  bind('tSnd', () => { const p = $('sndPanel'); if (p) p.classList.toggle('on'); });
  for (const key of ['horns', 'amb', 'sfx', 'voice']) { const el = $('snd_' + key); if (!el) continue;
    const paint = () => { el.classList.toggle('on', !!sndCfg[key]); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); sndCfg[key] = !sndCfg[key]; saveSnd(); paint(); }); paint(); }
  const gfxEl = $('snd_gfx');
  if (gfxEl) { const paintG = () => { gfxEl.textContent = '🎛 Graphismes: ' + (GFX === 'low' ? 'Léger ⚡' : 'Beau ✨'); };
    gfxEl.addEventListener('pointerdown', e => { e.preventDefault();
      try { localStorage.setItem('sk_gfx', GFX === 'low' ? 'high' : 'low'); } catch (e2) {}
      location.reload(); }); paintG(); }
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
    const u = player.g.userData; if (u.human) { u.human.seated = false; u.human.pedal = undefined; u.human.bike = false; }
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
  const u = player.g.userData;
  if (u.human) { u.human.seated = true;
    u.human.bike = (v.kind === 'moto' || v.kind === 'enfield');   // straddle, don't sit like in a car
    if (v.kind !== 'cycle') u.human.pedal = undefined; }
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
    const okL = pick(LINES.ok); toast(okL + ' \u20b9' + n.fare, '#8ef58e'); speak(okL, .9);
  } else {
    const noL = pick(LINES.no); toast(noL + ' \u2014 il red\u00e9marre', '#ff9f43'); speak(noL, .9);
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
    const u = player.g.userData;
    if (u.human) { u.human.seated = true;
      u.human.bike = (v.kind === 'moto' || v.kind === 'enfield');  // straddle a motorbike
      u.human.pedal = v.kind === 'cycle' ? 0 : undefined; }        // and pedal a cycle from the first frame
    // closed cabins have opaque glass: GTA-style, the car becomes your avatar (open vehicles keep you visible)
    const open = ['auto', 'moto', 'enfield', 'cycle'].includes(v.kind);
    player.g.visible = open;
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
// ---------- Voices: Indian-English speech through the browser's own TTS ----------
// picks an en-IN voice (Chrome ships one on most devices; iOS has Rishi), falls back to hi-IN then any English
let _voiceIN = null, _voicesTried = false;
function pickVoice() {
  if (_voicesTried && _voiceIN) return _voiceIN;
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices(); if (!vs.length) return null;
  _voicesTried = true;
  _voiceIN = vs.find(v => /en[-_]IN/i.test(v.lang)) || vs.find(v => /hi[-_]IN/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  return _voiceIN;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { _voicesTried = false; pickVoice(); };
function speak(text, pitch) {
  if (!sndCfg.voice || !('speechSynthesis' in window)) return;
  const clean = String(text).replace(/[“”"«»]/g, '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
  if (!clean || speechSynthesis.speaking) return; // never talk over an ongoing line
  const u = new SpeechSynthesisUtterance(clean);
  const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-IN';
  u.rate = .92; u.pitch = clamp(pitch ?? rand(.78, 1.02), .5, 2); u.volume = .85;
  speechSynthesis.speak(u);
}
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
  { name: 'Hawa Mahal & City Palace', facts: [
    'Hawa Mahal (1799) has 953 jharokha windows \u2014 built so royal women could watch the street unseen, cooled by the breeze.',
    'The City Palace is still home to the Maharaja of Jaipur\u2019s family; its Pritam Niwas Chowk has four gates, one for each season.',
    'Out past the dirt track lies Galtaji, the monkey temple \u2014 spring-fed tanks where hundreds of macaques bathe.'] },
  { name: 'The Ghats of Kashi', facts: [
    'Varanasi\u2019s riverfront strings together some 88 ghats along the Ganga.',
    'Every dusk, priests perform the Ganga Aarti with fire lamps at Dashashwamedh Ghat.',
    'Kashi is counted among the oldest continuously inhabited cities on Earth.'] },
  { name: 'Harmandir Sahib', facts: [
    'The Golden Temple was completed in 1604 under Guru Arjan, the fifth Sikh Guru.',
    'Maharaja Ranjit Singh gilded the shrine with gold in the early 1800s.',
    'Its langar kitchen serves free meals to as many as 100,000 visitors a day, all seated as equals.'] },
  { name: 'Adiyogi', facts: [
    'The Adiyogi bust stands 34 metres tall \u2014 certified the largest bust sculpture in the world.',
    'It honours Shiva as the FIRST yogi, who gave yoga to humanity long before any religion took shape.',
    'Around it, seekers sit for hours: the teaching is simple \u2014 stillness first, everything else after.'] },
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
  if (missionInteract()) return;
  // a quick prayer at a street shrine steadies the soul
  for (const sh of shrines) { if ((sh.x - player.pos.x) ** 2 + (sh.z - player.pos.z) ** 2 < 2.4 * 2.4) {
    if (!tryVisit._prayT || performance.now() > tryVisit._prayT) { tryVisit._prayT = performance.now() + 25000;
      karma(1.5); toast('🙏 Om! · +dharma', '#8ef58e'); } else toast('🙏', '#8ef58e');
    return; } }
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
    // within the Adiyogi's gaze, every conversation turns to the inner world
    const nearAdiyogi = (player.pos.x - CELL) ** 2 + player.pos.z ** 2 < 30 * 30;
    const line = nearAdiyogi ? pick(SPIRIT)
      : (player.dharma < 25 && Math.random() < .4) ? '\u201cSharam karo! (Aie honte!)\u201d \ud83d\ude20' : pick(CHAT[di] || CHAT[0]);
    toast(line, '#ffe9b8'); speak(line);
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
    { name: 'Hungama Hindi', url: 'https://stream.zeno.fm/0r0xa792kwzuv' },
    { name: 'Suno 1024 Bollywood', url: 'https://stream.zeno.fm/8wv4dpv9dm0uv' },
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
    this.on = true; this.play();                 // always wake the set back up, even after a dead stream
    return this.stations[this.idx]; },
  tick() {}
};
// ---------- UI helpers ----------
function toast(text, color) { const b = $('toastBig'); b.textContent = text; b.style.color = color || '#fff'; b.style.opacity = 1; b.style.transform = 'translateY(-10px) scale(1.05)'; clearTimeout(toast._t); toast._t = setTimeout(() => { b.style.opacity = 0; b.style.transform = 'translateY(0) scale(1)'; }, 1100); }
function showBanner(title, fact) { const el = $('banner'); $('bTitle').textContent = title; $('bFact').textContent = fact; el.classList.add('show'); clearTimeout(showBanner._t); showBanner._t = setTimeout(() => el.classList.remove('show'), 4200); }
let hintT = 0; function hint(t) { const el = $('hint'); el.textContent = t; el.style.opacity = 1; hintT = .12; }

// ---------- collision ----------
function blocked(x, z) {
  if (Math.abs(z) > HALF - 1 || x > HALF - 1) return true;
  // the west edge opens onto the Ganga in the Kashi cell — swim it to the far bank
  if (x < -HALF + 1 && !(z > -HALF + CELL + 1.5 && z < -HALF + 2 * CELL - 1.5 && x > FAR_X + 1.5)) return true;
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
// ---------- day & night: a full cycle every ~7 minutes — and the city stays just as busy after dark ----------
let dayT = .25, dayHemi = null, nightSkyTex = null, daySkyTex = null;
let isNight = false;
const nightGlows = []; // streetlamp halos, switched on at dusk
function updateDayNight(dt) {
  dayT = (dayT + dt / 420) % 1; // 0=midnight .25=morning .5=noon .75=evening
  const sunUp = Math.sin(dayT * TAU - Math.PI / 2) * .5 + .5;   // 0 at midnight, 1 at noon
  const day = clamp((sunUp - .18) / .5, 0, 1);
  if (sun) { sun.intensity = .14 + day * 1.56;
    sun.color.setHSL(.08, .75, .5 + day * .22); }
  if (dayHemi) dayHemi.intensity = .16 + day * .28;
  if (renderer) renderer.toneMappingExposure = .52 + day * .48;
  const night = day < .32;
  if (night !== isNight) { isNight = night;
    if (scene && nightSkyTex && daySkyTex) scene.background = night ? nightSkyTex : daySkyTex;
    if (scene && scene.fog) scene.fog.color.set(night ? '#131320' : '#ecc9a0');
    for (const gl2 of nightGlows) gl2.visible = night; }
}
let glowTex = null;
function makeGlowSprite(color, size) { // soft radial billboard for lamp pools and headlights
  if (!glowTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d');
    const gr = q.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.4, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64); glowTex = new T.CanvasTexture(c); }
  const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); s.visible = false; return s;
}
function makeNightSky() {
  const S = 512, c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#060810'); gr.addColorStop(.7, '#141225'); gr.addColorStop(1, '#2a1e30');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 240; i++) { g.fillStyle = `rgba(255,255,${randi(210, 255)},${rand(.25, .9)})`;
    g.fillRect(rand(0, S), rand(0, S * .75), rand(.7, 1.8), rand(.7, 1.8)); }
  g.fillStyle = '#e8e4d8'; g.beginPath(); g.arc(S * .72, S * .2, 26, 0, TAU); g.fill();
  g.fillStyle = '#141225'; g.beginPath(); g.arc(S * .69, S * .185, 22, 0, TAU); g.fill(); // crescent
  const t = new T.CanvasTexture(c); if ('sRGBEncoding' in T) t.encoding = T.sRGBEncoding; return t;
}
function update(dt) {
  updateDayNight(dt);
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
    else { const first = !n.line; hint('\ud83d\udefa ' + (n.line || (n.line = pick(LINES.hail))) + ' \u20b9' + n.fare + ' \u2014 E hop in \u00b7 N haggle'); if (first) speak(n.line, .92); }
  }
  updateTour(dt, performance.now());

  if (scandal) { scandal.t -= dt; if (scandal.t <= 0) scandal = null; }
  updateNPCs(dt); updateCows(dt); updateElephants(dt); updateVehicles(dt); updateCops(dt); updateMonkeys(dt); updateDogs(dt); recycleLife(dt);
  updateVendors(dt); updatePatrons(dt); updateFilmSet(dt); updatePetrolWala(dt); updateMissions(dt); updateBathers(dt);
  for (const m of seaMats) if (m.map) { m.map.offset.y += dt * .012; m.map.offset.x += dt * .004; } // the water breathes
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
let _breathEl = null, _uwEl = null;
function breathUI(show, pct) {
  if (!_breathEl) { _breathEl = document.createElement('div');
    _breathEl.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);width:180px;height:10px;border-radius:6px;background:rgba(10,14,20,.55);border:1px solid rgba(255,255,255,.25);z-index:40;display:none';
    const fill = document.createElement('div'); fill.style.cssText = 'height:100%;border-radius:6px;background:#4fc3f7;width:100%';
    _breathEl.appendChild(fill); document.body.appendChild(_breathEl); }
  _breathEl.style.display = show ? 'block' : 'none';
  if (show) _breathEl.firstChild.style.width = Math.max(0, pct) + '%';
}
function underwaterFx(on) {
  if (!_uwEl) { _uwEl = document.createElement('div');
    _uwEl.style.cssText = 'position:fixed;inset:0;background:radial-gradient(ellipse at 50% 55%, rgba(24,86,92,.34), rgba(8,40,52,.62));pointer-events:none;z-index:30;display:none';
    document.body.appendChild(_uwEl); }
  _uwEl.style.display = on ? 'block' : 'none';
}
function updateFoot(dt, f, s) {
  player.g.visible = true;
  const mag = Math.min(1, Math.hypot(f, s));
  let dx = 0, dz = 0;
  if (mag > .12) { const ang = cam.yaw; dx = Math.sin(ang) * f - Math.cos(ang) * s; dz = Math.cos(ang) * f + Math.sin(ang) * s;
    const l = Math.hypot(dx, dz); dx /= l; dz /= l; }
  const sprint = (keys['shift'] ? 1.7 : 1) * (player.swim ? .78 : 1), spd = (player.swim ? (player.dive ? 2.1 : 2.7) : 3.4) * sprint * mag;
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
  for (const e of elephants) { const dx = player.pos.x - e.g.position.x, dz = player.pos.z - e.g.position.z, d2 = dx * dx + dz * dz;
    if (d2 < 2.1 * 2.1 && d2 > 1e-6) { const d = Math.sqrt(d2); player.pos.x = e.g.position.x + dx / d * 2.1; player.pos.z = e.g.position.z + dz / d * 2.1; } }
  for (const n of npcs) { if (n.down > 0) continue; const dx = n.g.position.x - player.pos.x, dz = n.g.position.z - player.pos.z, d2 = dx * dx + dz * dz;
    if (d2 < .8 * .8 && d2 > 1e-6) { const d = Math.sqrt(d2); // shoulder through the crowd — they give way
      const nx2 = player.pos.x + dx / d * .8, nz2 = player.pos.z + dz / d * .8;
      if (!blocked(nx2, nz2)) { n.g.position.x = nx2; n.g.position.z = nz2; } } }
  player.pos.y = rampHeightAt(player.pos.x, player.pos.z); // ghat steps and the flyover are walkable
  // ---- swimming, GTA-style: past the last step the bed drops away ----
  const nowMs = performance.now();
  const deepWater = inRiverWater(player.pos.x, player.pos.z) && player.pos.x < RIVER_X0 - 2.2 && player.pos.x > RIVER_X1 + 2.4; // you WADE OUT near either shore — no crawling up the sand
  if (deepWater && !player.swim) { player.swim = true; player.dive = false; player.breath = 100;
    toast('🏊 Ganga mein! 👊/J — plonger · l\'autre rive est loin…', '#7ec3e8'); }
  if (!deepWater && player.swim) { player.swim = false; player.dive = false;
    player.g.rotation.x = 0; player.g.rotation.z = 0; player.g.rotation.order = 'XYZ'; underwaterFx(false); }
  if (player.swim) {
    if (keys['c'] && nowMs - (player.diveT || 0) > 500) { player.diveT = nowMs; player.dive = !player.dive; }
    if (player.dive) { player.breath -= dt * 7;
      if (player.breath <= 0) { player.breath = 0; player.dive = false; toast('😮‍💨 Plus de souffle — remonte!', '#ff9f43'); } }
    else player.breath = Math.min(100, (player.breath ?? 100) + dt * 34);
    const ts = nowMs / 1000;
    player.pos.y = player.dive ? -2.35 : -.52 + Math.sin(ts * 2.1) * .07;
    // ROTATION ORDER matters here: with the default order the prone pitch is taken about the WORLD
    // x-axis, so swimming east or west rolled him onto his side — a floating corpse. In 'YXZ' the
    // heading is applied first and the pitch after, about his own axis, so he always lies face-down.
    player.g.rotation.order = 'YXZ';
    const swimT = ts * (player.moving ? 3.4 : 1.15);
    player.g.rotation.x = player.dive ? -1.05 : (player.moving ? -1.30 : -.72);  // treading water sits upright
    player.g.rotation.z = player.moving ? Math.sin(swimT) * .26 : Math.sin(ts * 1.1) * .05;  // the body rolls with each stroke
    if (player.moving && !player.dive && Math.random() < dt * 5 && steamPuffs.length < 60) {
      const m = new T.Mesh(new T.PlaneGeometry(.5, .3), new T.MeshBasicMaterial({ color: '#cfe4de', transparent: true, opacity: .5, depthWrite: false }));
      m.position.set(player.pos.x, -.1, player.pos.z); m.rotation.x = -Math.PI / 2; scene.add(m); steamPuffs.push({ m, life: .5 }); }
  }
  breathUI(player.swim && (player.dive || player.breath < 100), player.breath ?? 100);
  underwaterFx(!!player.dive);
  if (player.dive && !player._uwFog) { player._uwFog = scene.fog || 'none'; scene.fog = new T.Fog('#1e4c48', 2, 30); } // the Ganga closes over you, murky green
  else if (!player.dive && player._uwFog) { scene.fog = player._uwFog === 'none' ? null : player._uwFog; player._uwFog = null; }
  // the far shore has its own keepers — and its own warnings
  if (onFarBank(player.pos.x, player.pos.z) && nowMs > (updateFoot._farT || 0)) {
    updateFoot._farT = nowMs + 9000;
    const dA = Math.hypot(player.pos.x - AGHORI.x, player.pos.z - AGHORI.z);
    if (dA < 16) toast('☠️ Aghori shamshan — “Jo sab chhod dete hain, wahi yahan rehte hain…”', '#c9b8a0');
    else if (player.pos.z < -HALF + CELL + CELL * .45) toast('🕌 Taj Mahal — le marbre de l\'amour éternel, au bord de l\'eau', '#f2ecd9');
  }
  player.g.position.copy(player.pos); player.g.rotation.y = player.yaw;
  animateChar(player.g, player.moving, dt, player.swim ? 2.7 : 3.4 * sprint);
  if (player.swim) {   // a real front crawl: one arm pulls while the other recovers with a bent elbow,
    const h = player.g.userData.human;                      // the legs flutter twice per arm cycle,
    const tk = nowMs / 1000 * (player.moving ? 3.4 : 1.15); // and the head stays lifted out of the water
    if (h) {
      const A = Math.sin(tk), B = Math.sin(tk + Math.PI), K = Math.sin(tk * 2.1);
      if (h.rArm) { h.rArm.rotation.x = -1.15 + A * 1.55; h.rArm.rotation.z = -.26 - Math.max(0, A) * .32; }
      if (h.lArm) { h.lArm.rotation.x = -1.15 + B * 1.55; h.lArm.rotation.z = .26 + Math.max(0, B) * .32; }
      if (h.rFore) h.rFore.rotation.x = -.3 - Math.max(0, -A) * .8;
      if (h.lFore) h.lFore.rotation.x = -.3 - Math.max(0, -B) * .8;
      if (h.rLeg) { h.rLeg.rotation.x = -.1 + K * .36; h.rLeg.rotation.z = -.06; }
      if (h.lLeg) { h.lLeg.rotation.x = -.1 - K * .36; h.lLeg.rotation.z = .06; }
      if (h.rCalf) h.rCalf.rotation.x = .26 + Math.max(0, K) * .34;
      if (h.lCalf) h.lCalf.rotation.x = .26 + Math.max(0, -K) * .34;
      if (h.spine) h.spine.rotation.x = .14;
      if (h.head) h.head.rotation.x = player.dive ? .1 : .62;   // face out of the water to breathe
      if (h.neck) h.neck.rotation.x = player.dive ? 0 : .2;
    } }
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
  if (inRiverWater(nx, nz)) { v.speed *= -.3; // no vehicle swims the Ganga
    if (!updateDrive._rivT || performance.now() > updateDrive._rivT) { updateDrive._rivT = performance.now() + 2500;
      toast('🌊 Gaadi paani mein nahi chalegi!', '#7ec3e8'); } }
  // the old-quarter galis: too narrow for anything wider than an auto
  else if ((v.hw || .95) > .7 && inGali(nx, nz) && !inGali(v.g.position.x, v.g.position.z)) {
    v.speed *= -.3; if (!updateDrive._galiT || performance.now() > updateDrive._galiT) { updateDrive._galiT = performance.now() + 2500;
      toast('🛵 Gali trop étroite! Tuktuk, moto ou vélo seulement', '#ffd24d'); }
  }
  else { if (!blocked(nx, v.g.position.z)) v.g.position.x = nx; else v.speed *= -.3;
  if (!blocked(v.g.position.x, nz)) v.g.position.z = nz; else v.speed *= -.3; }
  if (v.kind === 'cycle') { // the wheels turn, the cranks revolve, the legs pedal — all geared to real speed
    const ud = v.g.userData, u2 = player.g.userData;
    ud.spin = (ud.spin || 0) + v.speed * dt / .42;
    if (ud.wheels) for (const wj of ud.wheels) wj.rotation.z = ud.spin;
    if (ud.crank) ud.crank.rotation.x = ud.spin * .48;
    if (u2.human) u2.human.pedal = ud.spin * .48;
  }
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
  // body roll: cars lean out of a corner, two-wheelers lean INTO it
  const isTwo = (v.g.userData.dim || {}).w < .55;
  v.lean = lerp(v.lean || 0, (isTwo ? 1 : -1) * -s * Math.sign(v.speed || 1) * clamp(Math.abs(v.speed) / mx, 0, 1) * (isTwo ? .2 : .06), Math.min(1, dt * 6));
  v.g.rotation.z = v.lean;
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
    if (inGhats(x, z) || inBeach(x, z)) continue; // the road grid's modulo bands run on into the river — never recycle life there
    if (wantSidewalk ? (onSidewalk(x, z) && !blocked(x, z)) : onRoad(x, z)) return { x, z };
  }
  return null;
}
// The city is built from thousands of hand-placed details — single fruits on a cart, marigolds on
// the steps, bones in the ash. Each one is its own draw call, and a laptop chokes long before the
// GPU does. None of them is legible past a few metres, so they switch off once you walk away.
// Streets full of buildings line up to the horizon now, and every ledge and chhatri is its own
// draw call. Past the fog line they are invisible anyway, so a whole building switches off at once.
const cityChunks = [];
const tinyProps = [];
function registerTinyProps() {
  const TMP = new T.Vector3();
  const inCharacter = o => { let p = o; while (p) { if (p.userData && (p.userData.human || p.userData.seat || p.userData.dyn)) return true; p = p.parent; } return false; };
  scene.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry || inCharacter(o)) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere; if (!bs) return;
    const s = Math.max(Math.abs(o.scale.x), Math.abs(o.scale.y), Math.abs(o.scale.z));
    if (bs.radius * s < .5) { o.getWorldPosition(TMP); tinyProps.push({ o, x: TMP.x, z: TMP.z }); }
  });
}
let recycleT = 0;
function recycleLife(dt) {
  recycleT -= dt; if (recycleT > 0) return; recycleT = .4;
  // hard distance culling: skinned humans beyond the fog cost frames for nothing
  // fog swallows everything past ~150m anyway, so animating skinned crowds out there is pure waste
  const R2 = GFX === 'low' ? 105 * 105 : 140 * 140;
  for (const n of npcs) n.g.visible = n.g.position.distanceToSquared(player.pos) < R2;
  for (const v of vehicles) v.g.visible = v.g.position.distanceToSquared(player.pos) < R2;
  for (const vd of vendors) vd.g.visible = vd.g.position.distanceToSquared(player.pos) < R2;
  for (const pt of patrons) pt.g.visible = pt.g.position.distanceToSquared(player.pos) < R2;
  for (const bt of bathers) bt.g.visible = bt.g.position.distanceToSquared(player.pos) < R2;
  for (const d of dogs) d.g.visible = d.g.position.distanceToSquared(player.pos) < R2;
  for (const c of cows) c.g.visible = c.g.position.distanceToSquared(player.pos) < R2;
  for (const m of monkeys) m.g.visible = m.g.position.distanceToSquared(player.pos) < R2;
  for (const e of elephants) e.g.visible = e.g.position.distanceToSquared(player.pos) < R2;
  const CR2 = GFX === 'low' ? 82 * 82 : 130 * 130;   // fog swallows them well before this
  for (const ch of cityChunks) { const dx = ch.x - player.pos.x, dz = ch.z - player.pos.z;
    const vis = dx * dx + dz * dz < CR2;
    if (ch.vis !== vis) { ch.vis = vis; for (const m of ch.parts) m.visible = vis; } }
  const SR2 = GFX === 'low' ? 42 * 42 : 66 * 66;   // a smudge on the ground reads only from close
  for (const c of contactShadows) c.m.visible = c.host.position.distanceToSquared(player.pos) < SR2;
  const TR2 = GFX === 'low' ? 34 * 34 : 52 * 52;   // the little details: legible close up, noise beyond
  for (const t of tinyProps) { const dx = t.x - player.pos.x, dz = t.z - player.pos.z;
    t.o.visible = dx * dx + dz * dz < TR2; }
  for (const n of npcs) { if (n.down > 0) continue;
    if (n.g.position.distanceToSquared(player.pos) > 130 * 130) { const p = nearPlayerSpot(35, 75, true);
      if (p) { n.g.position.set(p.x, 0, p.z); n.pause = 0; } } }
  for (const v of vehicles) { if (v === player.inVehicle || v === player.riding || v.hired || !v.ai) continue;
    if (v.g.position.distanceToSquared(player.pos) > 170 * 170) { const p = nearPlayerSpot(55, 110, false);
      if (p) { v.g.position.set(p.x, 0, p.z); } } }
  for (const d of dogs) { if (d.g.position.distanceToSquared(player.pos) > 140 * 140) { const p = nearPlayerSpot(30, 70, true); if (p) d.g.position.set(p.x, 0, p.z); } }
  // The walas follow the TRADE, not a distance rule: any stall standing empty near the player pulls
  // in whichever wala is furthest away and out of sight. Walk down a lane and it fills ahead of you.
  { let moved = 0;
    for (const sp of vendorSpots) {
      if (sp.staffed || moved >= 3) continue;
      const dx = sp.x - player.pos.x, dz = sp.z - player.pos.z;
      if (dx * dx + dz * dz > 62 * 62) continue;                 // only stalls you might actually reach
      let far = null, fd = 78 * 78;
      for (const v of vendors) { const vd = v.g.position.distanceToSquared(player.pos); if (vd > fd) { fd = vd; far = v; } }
      if (!far) break;
      if (far.spot) far.spot.staffed = false;
      far.spot = sp; sp.staffed = true; far.kind = sp.kind;
      far.g.position.set(sp.x, 0, sp.z); far.g.rotation.y = sp.yaw;
      moved++;
    }
  }
  // customers drift to whichever stalls are manned near the player
  for (const c of patrons) {
    if (c.g.position.distanceToSquared(player.pos) < 55 * 55) continue;
    const near = vendors.filter(v => v.spot && v.g.position.distanceToSquared(player.pos) < 48 * 48);
    if (!near.length) continue;
    const sp = near[randi(0, near.length - 1)].spot, fs2 = Math.sin(sp.yaw), fc2 = Math.cos(sp.yaw);
    c.g.position.set(sp.x + fs2 * 2.2 + fc2 * rand(-.7, .7), 0, sp.z + fc2 * 2.2 - fs2 * rand(-.7, .7));
    c.g.rotation.y = sp.yaw + Math.PI + rand(-.35, .35);
  }
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
    // drivers no longer guess at right angles on a lattice: they aim for the next junction and
    // pick their turn there, the way you actually drive through a city
    if (!v.node) { const r0 = nearRoad(v.g.position.x, v.g.position.z);
      if (r0) { v.node = Math.random() < .5 ? r0.e.a : r0.e.b; v.from = r0.e; } }
    if (v.node) {
      const dxn = v.node.x - v.g.position.x, dzn = v.node.z - v.g.position.z;
      if (dxn * dxn + dzn * dzn < 36) {                       // arrived: choose the next street
        const opts = v.node.e.filter(e => !((v.hw || .95) > .7 && e.kind === 'gali'));
        const pool = opts.length > 1 ? opts.filter(e => e !== v.from) : opts;
        const e2 = pool.length ? pool[randi(0, pool.length - 1)] : null;
        if (e2) { v.from = e2; v.node = e2.a === v.node ? e2.b : e2.a; }
      }
      v.aiDir = Math.atan2(v.node.x - v.g.position.x, v.node.z - v.g.position.z);
    }
    v.aiTimer -= dt;
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
    // desi driving: nobody waits politely in line — squeeze past, nose through, keep rolling
    if (blockAhead) { v.swerveT = (v.swerveT || 0) - dt;
      if (v.swerveT <= 0 && Math.random() < .45) { v.aiDir += pick([-.5, .5]); v.swerveT = rand(.8, 1.6); }
      v.speed = lerp(v.speed, 1.3, .18); }
    else v.speed = lerp(v.speed, v.cruise || (v.cruise = rand(4, 7.5)), .04);
    // exhaust: a visible cough of diesel smoke off the old engines near you
    if (v.smoke && Math.abs(v.speed) > 1 && steamPuffs.length < 60 && Math.random() < .05 && v.g.position.distanceToSquared(player.pos) < 40 * 40) {
      const m = new T.Mesh(new T.PlaneGeometry(.3, .3), new T.MeshBasicMaterial({ color: '#4a4a4e', transparent: true, opacity: .3, depthWrite: false }));
      m.position.set(v.g.position.x - Math.sin(v.yaw) * (v.hl || 1.5) * .95, .35, v.g.position.z - Math.cos(v.yaw) * (v.hl || 1.5) * .95);
      scene.add(m); steamPuffs.push({ m, life: 1.1 });
    }
    const nx = v.g.position.x + Math.sin(v.aiDir) * v.speed * dt, nz = v.g.position.z + Math.cos(v.aiDir) * v.speed * dt;
    // traffic stays ON the road (not on sidewalks) and off obstacles
    if (onRoad(nx, nz) && !blocked(nx, nz) && !inGhats(nx, nz) && !((v.hw || .95) > .7 && inGali(nx, nz)) && Math.abs(nx) < HALF - 1 && Math.abs(nz) < HALF - 1) { v.g.position.x = nx; v.g.position.z = nz; v.yaw = lerp(v.yaw, v.aiDir, .1); v.g.rotation.y = v.yaw; }
    else { v.node = null; v.from = null; v.aiDir += (Math.random() < .5 ? 1 : -1) * rand(.8, 1.9); v.aiTimer = rand(1, 2.5); }
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
function damage(n) {                       // taking a hit: crashes, punches, falls
  player.health = clamp(player.health - n, 0, 100);
  const el = $('hpFill'); if (el) el.style.width = player.health + '%';
  if (player.health <= 0) wasted();
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
  else { if (started) { update(dt); adaptQuality(); } if (composer) composer.render(); else renderer.render(scene, camera); } }

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
  chipRow('chGender', [{ t: '👳 Raja (homme)', v: false }, { t: '👰 Rani (femme)', v: true }], () => !!opts.female, v => {
    opts.female = v;
    if (v) { opts.beard = 'none'; opts.moustache = false; opts.turban = false;
      opts.kurta = '#c2185b'; opts.dhoti = '#f9a825'; // deep pink sari, gold choli — harmonised defaults
      if (!['bun', 'long', 'braid', 'curly'].includes(opts.hair)) opts.hair = 'bun'; }
    else { opts.beard = 'full'; opts.moustache = true; opts.turban = true; if (opts.hair === 'bun' || opts.hair === 'braid') opts.hair = 'crop'; }
    const fem = v;
    const set = (id, txt) => { const el = document.querySelector('#' + id); if (el) el.textContent = txt; };
    set('lblKurta', fem ? 'Sari' : 'Kurta'); set('lblDhoti', fem ? 'Corsage (choli)' : 'Dhoti / Pyjama');
    for (const id of ['rowTurban', 'rowBeard', 'rowMoustache']) { const el = $(id); if (el) el.style.display = fem ? 'none' : ''; }
    rebuildHairRow();
  });
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
  function rebuildHairRow() {
    const el = $('chHair'); if (el) el.innerHTML = '';
    chipRow('chHair', (opts.female ? HAIRS_F : HAIRS).map(([v, t]) => ({ t, v })), () => opts.hair, v => { opts.hair = v; if (!opts.female) opts.turban = false; });
  }
  rebuildHairRow();
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
  const N = GFX === 'low' ? .5 : 1.2; // dense on the pretty tier; the light tier thins the crowd, the fog hides it
  spawnNPCs(Math.round(44 * N)); spawnCows(Math.round(9 * N)); spawnVehicles(Math.round(46 * N)); spawnMonkeys(Math.round(12 * N) + 8); spawnDogs(Math.round(13 * N)); spawnElephants(GFX === 'low' ? 2 : 3);
  spawnVendors(); spawnDancers(); spawnBathers(); // the rigged human is loaded by now — staff the stalls, roll camera, fill the river
  for (const r of ripples) r.m.userData.dyn = true; // flotsam drifts downstream: never cull it on a stale position
  registerTinyProps();
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
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const e of ROADS.edges) {                       // the map is the network, drawn as it really runs
    g.strokeStyle = e.kind === 'gali' ? '#4a4b52' : '#3f4046';
    g.lineWidth = Math.max(1.5, u(e.w + 1.5));
    g.beginPath(); g.moveTo(px(e.a.x), px(e.a.z)); g.lineTo(px(e.b.x), px(e.b.z)); g.stroke();
  }
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
  // the river and the far bank live beyond the city map's edge — paint them so the minimap never goes black
  const u2m = v => (v + HALF) / WORLD * 1024, mzTop = u2m(-HALF + CELL), mzH = CELL / WORLD * 1024;
  g.fillStyle = '#5a7a5e'; g.fillRect(u2m(RIVER_X1) - 4, mzTop, u2m(RIVER_X0) - u2m(RIVER_X1) + 4, mzH);
  g.fillStyle = '#c9b287'; g.fillRect(u2m(FAR_X), mzTop, u2m(RIVER_X1) - u2m(FAR_X), mzH);
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
  // gold: mission givers, and the active objective pulsing
  g.fillStyle = '#ffd700';
  for (const M of MISSIONS) { if (M.cool > 0 || (player.mission && player.mission.M === M)) continue;
    const gx = (M.giver.x + HALF) / WORLD * 1024, gz = (M.giver.z + HALF) / WORLD * 1024;
    g.beginPath(); g.arc(gx, gz, 3, 0, TAU); g.fill(); }
  if (player.mission) { const st = player.mission.M.stages[player.mission.stage];
    const tx2 = (st.x + HALF) / WORLD * 1024, tz2 = (st.z + HALF) / WORLD * 1024;
    g.beginPath(); g.arc(tx2, tz2, 3.4 + Math.sin(performance.now() / 180) * 1.4, 0, TAU); g.fill(); }
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
  initThree(); buildCity(); buildMissions(); initPreview(); wireCreator(); applyHand();
  $('loading').classList.add('hide');
  const BUILD = 'build 41'; if ($('buildTag')) $('buildTag').textContent = BUILD;
  Radio.init(); // fetch tonight's real Indian stations (works online; harmless offline)
  // load the rigged human; the creator shows the procedural fallback until ready
  const btn = $('enterBtn'); btn.disabled = true; btn.textContent = 'Loading your Raja…';
  const enable = () => { btn.disabled = false; btn.textContent = '▶ Enter the City'; };
  const failsafe = setTimeout(enable, 12000);
  loadHero(h => { if (h) HERO = h; window.__heroOk = !!h;
    loadHeroine(hh => { HEROINE = hh; window.__heroineOk = !!hh;
      loadVehModels(() => { clearTimeout(failsafe); enable(); rebuildPreview(); }); }); });
  window.__tp = (x, z) => { player.pos.set(x, 0, z); if (player.inVehicle) { player.inVehicle.g.position.set(x, 0, z); } };
  window.__temples = () => TEMPLES;
  window.__swim = () => ({ swim: player.swim, dive: player.dive, breath: player.breath, x: player.pos.x, y: player.pos.y, z: player.pos.z });
  window.__ele = () => elephants.map(e => ({ x: +e.g.position.x.toFixed(1), z: +e.g.position.z.toFixed(1) }));
  window.__perf = () => { let meshes = 0, skinned = 0, tris = 0;
    scene.traverse(o => { if (o.isSkinnedMesh) skinned++; if (o.isMesh) { meshes++; const gg = o.geometry;
      if (gg && gg.index) tris += gg.index.count / 3; else if (gg && gg.attributes.position) tris += gg.attributes.position.count / 3; } });
    return { meshes, skinned, tris: Math.round(tris), calls: renderer.info.render.calls, buildings: buildings.length, npcs: npcs.length, vehicles: vehicles.length }; };
  window.__aa = () => ({ webgl2: !!(renderer.capabilities && renderer.capabilities.isWebGL2),
    canvasAA: renderer.getContext().getContextAttributes().antialias, composer: !!composer,
    samples: composer ? [composer.renderTarget1.samples, composer.renderTarget2.samples] : null,
    pixelRatio: renderer.getPixelRatio(), gfx: GFX });
  window.__adapt = () => ({ base: ADAPT.base, scale: +ADAPT.scale.toFixed(2), bloomOff: ADAPT.bloomOff, shadowsOff: ADAPT.shadowsOff, ratio: renderer.getPixelRatio() });
  // audit every panel of every vehicle in the world: anything still wearing the neutral fallback
  // grey, or anything near-white, is an unpainted vehicle and must not exist
  window.__greyParts = () => { const out = [];
    for (const v of vehicles) { let big = 0;
      v.g.traverse(o => { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox; big = Math.max(big, (bb.max.x-bb.min.x)*(bb.max.y-bb.min.y)*(bb.max.z-bb.min.z)); } });
      v.g.traverse(o => { if (!o.isMesh || !o.material || !o.material.color) return;
        const c = o.material.color, mx = Math.max(c.r,c.g,c.b), mn = Math.min(c.r,c.g,c.b);
        if (mx > 0 && (mx-mn)/mx < .08 && mx > .52) {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          const bb = o.geometry.boundingBox, vol = (bb.max.x-bb.min.x)*(bb.max.y-bb.min.y)*(bb.max.z-bb.min.z);
          if (vol > big * .12) out.push({ kind: v.kind, name: o.name || '(unnamed)', mat: (o.material.name||''), col: '#' + c.getHexString(), rel: +(vol/big).toFixed(2) }); } }); }
    const seen = new Set(); return out.filter(x => { const k = x.kind + x.name + x.col; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10); };
  // line one of every kind up in a row, so all of them can be judged in a single frame
  // freeze the game and frame one vehicle like a catalogue photo — the only reliable way to judge it
  window.__spawnAt = (kind) => {   // build one of a kind next to the player, for inspection
    const g = kind === 'bus' ? buildBus() : kind === 'truck' ? buildTruck() : kind === 'moto' ? buildMoto()
      : kind === 'auto' ? buildAuto('#207a4a') : kind === 'enfield' ? buildEnfield() : buildBicycle();
    g.position.set(player.pos.x + 6, 0, player.pos.z + 2); g.rotation.y = Math.PI * .8; scene.add(g);
    const d = g.userData.dim || { w: 1, l: 2 };
    vehicles.push({ g, kind, yaw: g.rotation.y, speed: 0, ai: false, hw: d.w, hl: d.l, horn: 2 });
    return kind;
  };
  window.__photo = (kind) => {
    const v = vehicles.find(x => x.kind === kind); if (!v) return 'none';
    started = false;
    v.g.visible = true; v.g.traverse(o => { o.visible = true; });   // it may have been culled before the freeze
    const box = new T.Box3().setFromObject(v.g), c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
    const d = Math.max(sz.x, sz.y, sz.z) * 1.9 + 2.2;
    camera.position.set(c.x + d * .78, c.y + d * .42, c.z + d * .68);
    camera.lookAt(c); camera.updateProjectionMatrix();
    return { kind, size: [+sz.x.toFixed(1), +sz.y.toFixed(1), +sz.z.toFixed(1)] };
  };
  window.__unfreeze = () => { started = true; };
  window.__showroom = () => {
    const kinds = ['sedan', 'hatch', 'suv', 'van', 'truck', 'bus', 'taxi', 'police', 'auto', 'moto', 'enfield', 'cycle'];
    const bx = player.pos.x, bz = player.pos.z, placed = [];
    let i = 0;
    for (const k of kinds) {
      const v = vehicles.find(v2 => v2.kind === k && !v2._show);
      if (!v) continue;
      v._show = true; v.ai = false; v.speed = 0; v.node = null;
      const col = i % 4, row = (i / 4) | 0;
      v.g.position.set(bx - 6 + col * 4, 0, bz - 11 - row * 6);
      v.yaw = Math.PI * .8; v.g.rotation.y = v.yaw;
      placed.push(k); i++;
    }
    return placed;
  };
  window.__paint = () => {
    const bad = [], byKind = {};
    for (const v of vehicles) {
      const k = v.kind; byKind[k] = byKind[k] || { n: 0, grey: 0 };
      byKind[k].n++;
      let greyPanels = 0, biggest = 0, bigCol = null, big0 = 0;
      v.g.traverse(o => { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox; big0 = Math.max(big0, (bb.max.x-bb.min.x)*(bb.max.y-bb.min.y)*(bb.max.z-bb.min.z)); } });
      v.g.traverse(o => { if (!o.isMesh || !o.material || !o.material.color) return;
        const n = (o.name || '') + ((o.material && o.material.name) || '');
        if (/wheel|tyre|tire|rim|glass|window|light|lamp|plate|shadow|Wolf3D|contactShadow/i.test(n)) return;  // fittings and the rider are not bodywork
        const c = o.material.color, mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
        const sat = mx > 0 ? (mx - mn) / mx : 0;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox, vol = (bb.max.x-bb.min.x)*(bb.max.y-bb.min.y)*(bb.max.z-bb.min.z);
        if (vol > biggest) { biggest = vol; bigCol = '#' + c.getHexString(); }
        if (sat < .07 && mx > .5 && vol > 0 && vol > 0) { if (vol > 0) greyPanels += (vol > 0 && vol >= 0 ? 0 : 0); }
        if (sat < .08 && mx > .52 && vol > big0 * .12) greyPanels++; });
      if (greyPanels) { byKind[k].grey++; bad.push({ kind: k, greyPanels, body: bigCol }); }
    }
    return { total: vehicles.length, unpainted: bad.length, byKind, sample: bad.slice(0, 6) };
  };
  window.__board = (k) => { const p = window.__tpkind(k); if (!p) return 'no ' + k; tryEnterExit(); return 'boarding'; };
  window.__ridestate = () => { const h = player.g.userData.human;
    return { inVehicle: player.inVehicle ? player.inVehicle.kind : null, transition: !!player.transition,
      seated: !!(h && h.seated), pedal: h && h.pedal !== undefined ? +h.pedal.toFixed(2) : null, bike: !!(h && h.bike),
      speed: player.inVehicle ? +player.inVehicle.speed.toFixed(1) : 0 }; };
  window.__rider = () => { for (const v of vehicles) { if ((v.kind === 'moto' || v.kind === 'enfield' || v.kind === 'cycle') && v.driver) {
    const bx = new T.Box3().setFromObject(v.driver.g);
    return { kind: v.kind, feetY: +bx.min.y.toFixed(2), headY: +bx.max.y.toFixed(2) }; } } return 'no rider'; };
  window.__net = () => ({ nodes: ROADS.nodes.length, edges: ROADS.edges.length,
    galis: ROADS.edges.filter(e => e.kind === 'gali').length, buildings: buildings.length,
    kinds: ROADS.edges.reduce((a, e) => (a[e.kind] = (a[e.kind] || 0) + 1, a), {}) });
  window.__probe = (w) => { const hits = []; scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && Math.abs((o.geometry.parameters.width || 0) - w) < .01) {
    const wp = o.getWorldPosition(new T.Vector3()); hits.push([+wp.x.toFixed(1), +wp.y.toFixed(1), +wp.z.toFixed(1)]); } }); return hits.slice(0, 8); };
  window.__vendNear = (r) => { r = r || 45; const rr = r * r; let near = 0, staffed = 0;
    for (const sp of vendorSpots) { const dx = sp.x - player.pos.x, dz = sp.z - player.pos.z;
      if (dx * dx + dz * dz < rr) { near++; if (sp.staffed) staffed++; } }
    let pn = 0; for (const c of patrons) if (c.g.position.distanceToSquared(player.pos) < rr) pn++;
    return { stallsNear: near, staffed, customersNear: pn }; };
  window.__vend = () => ({ vendors: vendors.length, patrons: patrons.length, spots: vendorSpots.length,
    first: vendors.slice(0, 4).map(v => ({ x: +v.g.position.x.toFixed(1), z: +v.g.position.z.toFixed(1), yaw: +v.g.rotation.y.toFixed(2) })) });
  window.__spots = () => ({ taj: { x: (RIVER_X1 + FAR_X) / 2 - 1, z: -HALF + CELL + (CELL) * .24 }, aghori: AGHORI, adiyogi: { x: CELL, z: 0 }, hawa: { x: CELL, z: -CELL }, galtaji: { x: CELL + 37, z: -CELL + 37 } });
  window.__tpwoman = () => { const n = npcs.find(n2 => n2.female); if (!n) return false;
    player.pos.set(n.g.position.x + 2.2, 0, n.g.position.z); player.g.position.copy(player.pos);
    cam.yaw = Math.atan2(n.g.position.x - player.pos.x, n.g.position.z - player.pos.z); return n.g.position.toArray(); };
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
  window.__pchar = () => pChar;
  window.__previewSadhu = (ash) => { previewSpin = false; if (pChar) pScene.remove(pChar);
    pChar = makeHuman(ash
      ? { naga: true, skin: '#8f8b81', outfit: 'kurta', kurta: '#8f8b81', dhoti: '#8f8b81', beard: 'long', hair: 'jata', hairColor: '#6a6156', turban: false, moustache: true, barefoot: true, mala: true, tilak: 'shaiva', trident: true }
      : { skin: '#8d5524', outfit: 'khadi', kurta: '#ff8c1a', dhoti: '#ff8c1a', beard: 'long', hair: 'long', turban: false, moustache: true, mala: true, tilak: 'vaishnav' });
    pChar.scale.setScalar(.62); pChar.rotation.y = 0; pScene.add(pChar); return true; };
  window.__film = () => FILM.x == null ? null : [FILM.x, FILM.z, FILM.dancers.length];
  window.__cam = (yaw) => { cam.yaw = yaw; cam.freeUntil = performance.now() + 60000; };
  window.__time = (t) => { dayT = t; };
  window.__previewFemale = () => { previewSpin = false; if (pChar) pScene.remove(pChar);
    pChar = makeHuman({ female: true, kurta: '#c2185b', dhoti: '#f9a825', skin: pick(SKINS), hair: 'bun' });
    pChar.scale.setScalar(.62); pChar.rotation.y = 0; pScene.add(pChar); return !!HEROINE; };
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
