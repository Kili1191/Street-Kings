import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}).catch(()=>chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}));
const p = await b.newPage({viewport:{width:1100,height:720}});
await p.goto('file://'+process.cwd()+'/index.html');
await p.waitForFunction(()=>!document.getElementById('enterBtn').disabled,{timeout:20000});
await p.click('#enterBtn'); await p.waitForTimeout(1200);
const before = await p.evaluate(()=>window.__dbg());
// push joystick to the RIGHT
const box = await p.$eval('#joystick', el=>{const r=el.getBoundingClientRect();return {cx:r.left+r.width/2, cy:r.top+r.height/2};});
await p.mouse.move(box.cx, box.cy); await p.mouse.down();
await p.mouse.move(box.cx+40, box.cy, {steps:3});
await p.waitForTimeout(900); await p.mouse.up();
const after = await p.evaluate(()=>window.__dbg());
// screen-right at cam.yaw is (-cos(yaw), sin(yaw))
const yaw = before.yaw;
const dx = after.player[0]-before.player[0], dz = after.player[2]-before.player[2];
const dot = dx*(-Math.cos(yaw)) + dz*(Math.sin(yaw));
console.log('moved dx,dz=',dx.toFixed(2),dz.toFixed(2),'| screen-right dot =',dot.toFixed(2), dot>0?'✓ RIGHT goes right':'✗ still inverted');
await b.close();
