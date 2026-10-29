import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { attackPhase, attackWarning, stageOf, type Actor, type Run, type BrawlerEvent } from '../game.ts';
import { circuitView } from '../presentation.ts';
import { createGait, fighterPose, type Point } from '../animation.ts';
import type { CircuitRenderer } from '../graphics.ts';

/** A fixed oblique orthographic projection preserves x/lane/elevation and combat readability. */
export function createDiorama(surface: HTMLElement, onFailure: () => void): CircuitRenderer & { canvas: HTMLCanvasElement } {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
  try {
  const canvas = renderer.domElement; canvas.className = 'circuit-canvas'; canvas.dataset.renderer = 'three';
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); scene.background = new T.Color('#111c30');
  const camera = new T.OrthographicCamera(-480, 480, 320, -240, 1, 4000);
  const world = new T.Group(), people = new T.Group(), effects = new T.Group(); scene.add(world, people, effects);
  const sceneryGeometry = new Set<T.BufferGeometry>();
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  const box = own(new T.BoxGeometry(1, 1, 1)), rounded = own(new RoundedBoxGeometry(1, 1, 1, 2, .12)), sphere = own(new T.SphereGeometry(1, 12, 8)), cylinder = own(new T.CylinderGeometry(1, 1, 1, 8));
  const arc = own(new T.TorusGeometry(43, 1.8, 6, 20, Math.PI * .75));
  const warningRing = own(new T.RingGeometry(.98, 1, 48).rotateX(-Math.PI / 2));
  const cache = new Map<string, T.MeshStandardMaterial>();
  const asphaltCanvas = document.createElement('canvas'); asphaltCanvas.width = asphaltCanvas.height = 256;
  const asphaltContext = asphaltCanvas.getContext('2d')!;
  const grain = asphaltContext.createImageData(256, 256);
  let seed = 193;
  for (let i = 0; i < grain.data.length; i += 4) { seed = (seed * 1664525 + 1013904223) >>> 0; const v = 85 + seed % 45; grain.data.set([v, v + 6, v + 12, 255], i); }
  asphaltContext.putImageData(grain, 0, 0);
  asphaltContext.strokeStyle = '#303d47'; asphaltContext.lineWidth = 1;
  for (let i = 0; i < 8; i++) { asphaltContext.beginPath(); asphaltContext.moveTo(i * 37, i * 31); asphaltContext.lineTo(i * 37 + 14, i * 31 + 5); asphaltContext.lineTo(i * 37 + 25, i * 31 + 23); asphaltContext.stroke(); }
  const asphalt = new T.CanvasTexture(asphaltCanvas); asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping; asphalt.repeat.set(18, 7); asphalt.colorSpace = T.SRGBColorSpace;
  const road = new T.MeshStandardMaterial({ color: '#708294', map: asphalt, roughness: .4, metalness: .45 }); materials.add(road);
  const gait = createGait(), rigs = new Map<number, ReturnType<typeof makeFighter>>();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, stage = -1, camX: number | undefined, lastTime = 0, shake = 0;
  const bursts: { mesh: T.Mesh; x: number; lane: number; height: number; vx: number; vz: number; life: number }[] = [];
  const transient = new T.Group(); effects.add(transient);
  const rainGeometry = own(new T.BufferGeometry()), rainData = new Float32Array(160 * 6);
  rainGeometry.setAttribute('position', new T.BufferAttribute(rainData, 3));
  const rainMaterial = new T.LineBasicMaterial({ color: '#b7d9eb', transparent: true, opacity: .18 }); materials.add(rainMaterial);
  const rain = new T.LineSegments(rainGeometry, rainMaterial); rain.frustumCulled = false; scene.add(rain);
  scene.add(new T.HemisphereLight('#b1d9f5', '#242439', 1.35));
  const key = new T.DirectionalLight('#d4e5ff', 1.9); key.position.set(-200, 700, 500); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -900; key.shadow.camera.right = 900;
  key.shadow.camera.top = 600; key.shadow.camera.bottom = -600; key.shadow.camera.far = 2000; key.shadow.normalBias = 1.5; key.shadow.bias = -.0002;
  scene.add(key, key.target);
  const rim = new T.DirectionalLight('#f483b8', 1.1); rim.position.set(300, 300, -500); scene.add(rim);
  const teal = new T.PointLight('#60ffdc', 16000, 700, 2); scene.add(teal);
  function own<G extends T.BufferGeometry>(g: G): G { geometries.add(g); return g; }
  function material(color: string, glow = false) {
    const id = color + glow; let m = cache.get(id);
    if (!m) { m = new T.MeshStandardMaterial({ color, roughness: .65, metalness: .18, emissive: glow ? color : '#000000', emissiveIntensity: glow ? 2 : 0 }); cache.set(id, m); materials.add(m); }
    return m;
  }
  function mesh(parent: T.Object3D, geometry: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const m = new T.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function block(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, glow = false) {
    return mesh(parent, box, material(color, glow), x, y, z, w, h, d);
  }
  function label(parent: T.Object3D, text: string, x: number, y: number, z: number, w: number, h: number, color: string) {
    const c = document.createElement('canvas'); c.width = 768; c.height = 160;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#0a1523'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(7, 7, 754, 146);
    ctx.font = 'bold 65px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.shadowBlur = 14; ctx.shadowColor = color; ctx.fillText(text, 384, 84, 720);
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace; textures.add(texture);
    const mat = new T.MeshBasicMaterial({ map: texture }); materials.add(mat);
    return mesh(parent, box, mat, x, y, z, w, h, 2);
  }
  function build(run: Run) {
    world.clear();
    for (const g of sceneryGeometry) { g.dispose(); geometries.delete(g); } sceneryGeometry.clear();
    // Stage-specific signs are the only textures owned by the rebuilt scenery.
    for (const t of textures) t.dispose(); textures.clear();
    for (const m of [...materials]) if (m instanceof T.MeshBasicMaterial && m.map) { m.dispose(); materials.delete(m); }
    const station = stageOf(run).environment === 'station', width = stageOf(run).width;
    mesh(world, box, road, width / 2, -12, 130, width + 2600, 20, 2200);
    block(world, width / 2, 1, -22, width + 2000, 7, 26, '#6c7c86');
    for (let i = -3; i < width / 320 + 4; i++) {
      const x = i * 320, accent = station ? '#ffc184' : i % 2 ? '#fa78b4' : '#70efde';
      const height = 410 + ((i * 73 + 1000) % 130);
      block(world, x, height / 2, -155, 310, height, 240, station ? '#354452' : i % 2 ? '#24364c' : '#354052');
      block(world, x, height + 9, -155, 325, 15, 253, '#556879');
      block(world, x, 150, -28, 302, 8, 16, '#111c2d');
      block(world, x, 157, -17, 285, 2, 4, accent, true);
      label(world, station ? i % 2 ? 'GRID / 06' : 'HIGH VOLTAGE' : ['AFTER HOURS', 'NIGHT MARKET', 'NO SIGNAL'][Math.abs(i) % 3]!, x - 32, 124, -20, 220, 39, accent);
      if (station) {
        for (let j = 0; j < 3; j++) {
          const tx = x - 98 + j * 95;
          mesh(world, cylinder, material('#687d86'), tx, 49, -10, 27, 82, 27);
          for (let k = 0; k < 5; k++) mesh(world, cylinder, material('#344b5b'), tx, 22 + k * 13, -10, 34, 5, 34);
          block(world, tx, 95, -10, 7, 22, 7, accent, true);
        }
      } else {
        block(world, x - 60, 49, -27, 160, 95, 6, '#152333');
        for (let k = 0; k < 9; k++) block(world, x - 60, 8 + k * 10, -22, 160, 2, 4, '#456072');
        block(world, x + 98, 49, -20, 60, 96, 9, '#142330');
        block(world, x + 98, 59, -14, 46, 63, 3, '#407b85');
        block(world, x + 98, 58, -11, 3, 65, 3, '#10212e');
        block(world, x + 120, 36, -7, 3, 11, 4, accent, true);
      }
      if (!station && i % 2 === 0) {
        const awning = block(world, x - 55, 98, 3, 192, 7, 54, '#273c50'); awning.rotation.x = .13;
        for (let stripe = 0; stripe < 7; stripe++) block(world, x - 137 + stripe * 27, 99, 3, 7, 2, 55, '#667680');
        block(world, x + 131, 191, 5, 29, 102, 18, '#193b4b');
        for (let mark = 0; mark < 3; mark++) block(world, x + 131, 163 + mark * 28, 16, 16, 4, 3, accent, true);
      }
      block(world, x + 105, 1, 26, 50, 2, 22, '#0e1d2d');
      for (let grate = 0; grate < 7; grate++) block(world, x + 84 + grate * 7, 2, 26, 2, 1, 21, '#566978');
      // Upper windows, rooftop vents and conduits add silhouette without hidden geometry.
      for (let row = 0; row < 6; row++) for (let col = 0; col < 5; col++) {
        const lit = (i + col + row * 2) % 4 === 0;
        block(world, x - 120 + col * 58, 189 + row * 47, -30, 29, 29, 4, lit ? '#9cb7bc' : '#122336', lit);
      }
      block(world, x + 145, 93, -8, 5, 180, 5, '#849097');
      block(world, x - 70, height + 29, -110, 70, 40, 60, '#344657');
      for (let band = 0; band < 5; band++) block(world, x, 175 + band * 54, -29, 302, 2, 3, '#536277');
      for (let k = 0; k < 4; k++) block(world, x - 93 + k * 15, height + 30, -78, 5, 28, 2, '#162a3a');
      block(world, x, .5, 310, 105, 1, 4, '#bcae7a');
      for (let k = 0; k < 6; k++) block(world, x - 110 + k * 30, 1, 35 + k * 21, 58 - k * 5, .7, 2, accent);
      const puddleMat = material(station ? '#303d47' : i % 2 ? '#342d44' : '#263e4b');
      mesh(world, sphere, puddleMat, x + 35, -.5, 170, 95, 1.2, 24);
      // Distant skyline and thin illuminated edges.
      block(world, x + 100, 320, -560, 230, 640 + Math.sin(i) * 160, 110, '#152639');
      block(world, x + 200, 280, -470, 2, 550, 2, '#476279');
    }
    for (let i = 0; i < width / 650 + 1; i++) {
      const x = i * 650 + 280;
      block(world, x, 130, -2, 6, 260, 6, '#627988'); block(world, x - 34, 260, 0, 74, 5, 8, '#627988');
      block(world, x - 60, 254, 5, 40, 3, 14, '#cfffe8', true);
    }
    // Bake fixed scenery into one draw per material. Actors and cues remain independent.
    world.updateMatrixWorld(true);
    const batches = new Map<T.Material, T.BufferGeometry[]>();
    world.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      const mat = object.material as T.Material;
      const list = batches.get(mat) ?? []; batches.set(mat, list);
      list.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
    });
    world.clear();
    for (const [mat, parts] of batches) {
      const geometry = own(mergeGeometries(parts)); sceneryGeometry.add(geometry);
      for (const part of parts) part.dispose();
      const mesh = new T.Mesh(geometry, mat); mesh.castShadow = true; mesh.receiveShadow = true; world.add(mesh);
    }
  }
  function makeFighter(a: Actor) {
    const root = new T.Group(), body = new T.Group(); root.add(body); people.add(root);
    const boss = a.kind === 'warden', player = a.kind === 'player';
    const coat = player ? '#3d989b' : boss ? '#526575' : a.kind === 'bruiser' ? '#946573' : '#706b98';
    const accent = player ? '#8bffe0' : boss ? '#ffc180' : '#ff91ba';
    mesh(body, rounded, material(coat), -1, 62, 0, 34, 39, 24);
    mesh(body, rounded, material('#1d3047'), 0, 40, 0, 28, 12, 20);
    block(body, -9, 64, 12, 11, 31, 4, player ? '#78c4be' : '#9ba1ac');
    block(body, 7, 61, 12, 7, 30, 3, '#1c2b40');
    block(body, 0, 43, 1, 32, 5, 24, '#c3b79c');
    block(body, 4, 43, 14, 8, 7, 2, accent, true);
    mesh(body, sphere, material(player ? '#ebbea1' : '#8395a6'), 0, 101, 0, 14, 17, 13);
    if (player) {
      mesh(body, rounded, material('#182638'), -4, 115, -1, 27, 12, 25); block(body, -12, 106, -5, 8, 15, 23, '#182638');
      block(body, 0, 111, 12, 26, 3, 3, accent, true);
      block(body, 13, 100, 7, 4, 5, 6, '#f5ceb0'); block(body, 11, 105, 12, 4, 2, 2, '#142638');
      block(body, 0, 83, 0, 32, 7, 27, '#ee8fa7');
    } else {
      block(body, 0, 103, 12, 30, 10, 5, '#14283a'); block(body, 0, 104, 15, 28, 3, 2, accent, true);
      block(body, -21, 76, 0, boss ? 24 : 14, boss ? 22 : 13, 30, '#8b98a9');
      block(body, 20, 77, 0, boss ? 24 : 14, boss ? 22 : 13, 30, '#8b98a9');
    }
    if (boss) { mesh(body, sphere, material(accent, true), 0, 66, 15, 9, 9, 3); block(body, -10, 123, 0, 5, 17, 6, '#b4c5cc'); block(body, 10, 123, 0, 5, 17, 6, '#b4c5cc'); }
    const scarf = block(body, -31, 82, -3, 36, 7, 5, '#d76e96'); scarf.visible = player;
    const limbs = Array.from({ length: 8 }, (_, i) => mesh(body, cylinder, material(i < 4 ? '#253d52' : coat), 0, 0, 0, i < 4 ? 6 : 5, 1, i < 4 ? 6 : 5));
    const boots = [0, 1].map(() => mesh(body, rounded, material('#172737'), 0, 0, 0, 24, 9, 17));
    const joints = [0, 1].map(() => mesh(body, sphere, material(coat), 0, 0, 0, 7, 7, 7));
    const trail = mesh(body, arc, material(accent, true), 30, 63, 17, 1, .75, 1);
    trail.rotation.z = -.9;
    const gloves = [0, 1].map(() => mesh(body, sphere, material(player ? '#dce8db' : accent), 0, 0, 0, 8, 8, 8));
    const shadow = mesh(root, sphere, material('#101d2b'), 0, 1, 0, a.radius * 1.3, 1, a.radius * .65); shadow.castShadow = false;
    const bar = block(root, 0, boss ? 247 : 170, 0, 40, 3, 2, '#ff9ab9', true);
    return { root, body, limbs, boots, gloves, scarf, bar, joints, trail };
  }
  const up = new T.Vector3(0, 1, 0), direction = new T.Vector3();
  function segment(m: T.Mesh, from: Point, to: Point, z: number) {
    m.position.set((from[0] + to[0]) / 2, -(from[1] + to[1]) / 2, z);
    direction.set(to[0] - from[0], from[1] - to[1], 0); m.scale.y = direction.length(); m.quaternion.setFromUnitVectors(up, direction.normalize());
  }
  function poseActor(a: Actor) {
    let rig = rigs.get(a.id); if (!rig) { rig = makeFighter(a); rigs.set(a.id, rig); }
    const p = fighterPose(a, gait.get(a.id)), s = a.kind === 'warden' ? 1.48 : a.kind === 'bruiser' ? 1.2 : 1;
    rig.root.position.set(a.x, 0, a.lane / .6); rig.root.visible = a.health > 0 || a.death > 0;
    rig.body.scale.set(a.facing * s, s / .8, s); rig.body.position.set(p.lean * a.facing, (a.elevation - p.bob) / .8, 0);
    rig.body.rotation.z = a.health <= 0 ? a.facing * 1.15 : 0;
    rig.body.visible = !(a.immune > 0 && Math.floor(lastTime * 14) % 2 === 0);
    const limbs: [Point, Point, number][] = [ [[-8,-43],p.backKnee,-7], [p.backKnee,p.backFoot,-7], [[8,-43],p.frontKnee,8], [p.frontKnee,p.frontFoot,8], [[-13,-76],p.rearElbow,-10], [p.rearElbow,p.rearHand,-10], [[14,-77],p.elbow,13], [p.elbow,p.hand,13] ];
    limbs.forEach(([from,to,z], i) => segment(rig!.limbs[i]!, from, to, z));
    [p.backFoot,p.frontFoot].forEach((f,i) => rig!.boots[i]!.position.set(f[0]+3,-f[1],i ? 8 : -7));
    [p.rearHand,p.hand].forEach((f,i) => rig!.gloves[i]!.position.set(f[0],-f[1],i ? 13 : -10));
    [p.backKnee, p.frontKnee].forEach((f, i) => rig!.joints[i]!.position.set(f[0], -f[1], i ? 8 : -7));
    rig.trail.visible = !!a.attack && attackPhase(a.attack) === 'active';
    rig.scarf.rotation.z = Math.sin(gait.get(a.id).phase) * .12;
    rig.bar.visible = a.kind !== 'player' && a.kind !== 'warden' && a.health > 0 && a.health < a.maxHealth;
    rig.bar.scale.x = 40 * a.health / a.maxHealth;
  }
  function cues(run: Run) {
    transient.clear();
    const encounter = stageOf(run).encounters[run.encounter];
    if (run.gated && encounter) for (const x of [encounter.left,encounter.right]) {
      block(transient, x, 2, 150, 3, 2, 310, '#fb84a6', true);
      for (let i=0;i<7;i++) block(transient,x,10, i*50,3,20,7,'#e97b9a',true);
    }
    for (const a of run.enemies) {
      const area = attackWarning(a); if (!area || !a.attack) continue;
      const z = area.lane / .6, depth = area.depth / .6;
      const color = attackPhase(a.attack) === 'active' ? '#ffb797' : '#f77f9f';
      if (area.shape === 'ellipse') mesh(transient, warningRing, material(color, true), area.x, 2, z, area.width / 2, 1, depth / 2);
      else for (const edge of [-1,1]) { block(transient,area.x,2,z+edge*depth/2,area.width,2,2,color,true); block(transient,area.x+edge*area.width/2,2,z,2,2,depth,color,true); }
      if (attackPhase(a.attack)==='startup') { block(transient,a.x, a.kind==='warden'?255:180,z,4,14,4,'#ffd6ae',true); block(transient,a.x,a.kind==='warden'?242:167,z,4,4,4,'#ffd6ae',true); }
    }
    for (const pickup of run.pickups) if (!pickup.collected) {
      block(transient,pickup.x,16,pickup.lane/.6,25,23,20,'#285d60');
      block(transient,pickup.x,17,pickup.lane/.6+11,4,15,2,'#95ffcc',true); block(transient,pickup.x,17,pickup.lane/.6+12,15,4,2,'#95ffcc',true);
    }
  }
  function dispose() {
    if (disposed) return; disposed=true; canvas.removeEventListener('webglcontextlost', lost);
    for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); for (const t of textures) t.dispose();
    asphalt.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); rigs.clear(); bursts.length=0;
  }
  function lost(event: Event) { event.preventDefault(); if (!disposed) onFailure(); }
  canvas.addEventListener('webglcontextlost', lost);
  try {
    surface.append(canvas);
    return { canvas,
      reset() { gait.reset(); people.clear(); rigs.clear(); for (const b of bursts) effects.remove(b.mesh); bursts.length=0; camX=undefined; shake=0; lastTime=0; },
      consume(events: readonly BrawlerEvent[]) {
        for (const e of events) if (['hit','damage','ko','pickup','victory'].includes(e.type)) {
          if (!reduced.matches) shake=Math.min(4,e.strength*2);
          for(let i=0;i<(reduced.matches?0:16)&&bursts.length<128;i++) {
            const angle=i*2.4, color=e.type==='damage'?'#ff8ca7':e.type==='pickup'?'#89ffdc':'#ffdb9f';
            const m=mesh(effects,sphere,material(color,true),e.x,70,e.lane/.6,2,2,2);
            bursts.push({mesh:m,x:e.x,lane:e.lane,height:60,vx:Math.cos(angle)*(50+i*9),vz:80+Math.sin(angle)*90,life:.35+i%4*.1});
          }
        }
      },
      draw(run,size,screen) {
        if(disposed) return;
        const dt=screen==='playing'?Math.max(0,Math.min(.05,run.elapsed-lastTime)):0; lastTime=run.elapsed;
        if(stage!==run.stageIndex) { stage=run.stageIndex; build(run); }
        gait.observe(run);
        const ratio=Math.min(size.ratio,1.65,Math.sqrt(2400000/Math.max(1,size.width*size.height)));
        if(canvas.width!==Math.round(size.width*ratio)||canvas.height!==Math.round(size.height*ratio)) { renderer.setPixelRatio(ratio); renderer.setSize(size.width,size.height,false); camX=undefined; }
        const view=circuitView(size.width,size.height,run); camX=camX===undefined?view.x:camX+(view.x-camX)*(reduced.matches?1:1-Math.exp(-7*dt));
        const center=camX+view.width/2, j=reduced.matches?0:Math.sin(run.elapsed*83)*shake;
        camera.left=-view.width/2; camera.right=view.width/2; camera.top=view.ground; camera.bottom=view.ground-view.height;
        camera.position.set(center+j,600,800); camera.lookAt(center+j,0,0); camera.updateProjectionMatrix();
        key.position.set(center-200,700,500); key.target.position.set(center,0,0); teal.position.set(run.player.x,130,run.player.lane/.6+90);
        for(const a of [run.player,...run.enemies]) poseActor(a);
        const ids=new Set([run.player.id,...run.enemies.map(a=>a.id)]); for(const [id,rig] of rigs) if(!ids.has(id)) { people.remove(rig.root); rigs.delete(id); }
        cues(run); shake=Math.max(0,shake-dt*26);
        for(let i=bursts.length-1;i>=0;i--) { const b=bursts[i]!; b.life-=dt; b.x+=b.vx*dt; b.height+=b.vz*dt; b.vz-=400*dt; b.mesh.position.set(b.x,b.height/.8,b.lane/.6); b.mesh.scale.setScalar(Math.max(.1,b.life*5)); if(b.life<=0) {effects.remove(b.mesh);bursts.splice(i,1);} }
        rain.visible=!reduced.matches&&stage===0;
        if(rain.visible) { for(let i=0;i<160;i++) { const x=camX+((i*137-run.elapsed*80)%view.width+view.width)%view.width,y=450-((i*73+run.elapsed*480)%500),z=(i*37)%650; rainData.set([x,y,z,x-4,y-18,z],i*6); } rainGeometry.attributes.position!.needsUpdate=true; }
        (scene.background as T.Color).set(run.finale>0||run.status==='victory'?'#294b52':'#111c30');
        renderer.render(scene,camera);
      }, dispose,
    };
  } catch(error) { dispose(); throw error; }
  } catch (error) { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); throw error; }
}
