import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createFoundryModels } from './models.ts';
import { createPresentation, flightView } from '../presentation.ts';
import type { FlightPresentation } from '../flight-presentation.ts';
import type { FlightTheme } from '../themes.ts';
import type { FlightEvent } from '../game.ts';
import { fortress } from '../content.ts';
import type { ImageBundle } from '../../../engine/browser/images.ts';

const noise = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
interface Burst { x: number; y: number; age: number; duration: number; size: number }

/** Orthographic XY combat with cosmetic Z depth. No extra loop, simulation writes or camera shake. */
export function createFoundry(theme: FlightTheme, images: ImageBundle, onFailure: () => void): FlightPresentation {
  const element = document.createElement('div'); element.className = 'skybreak-foundry';
  const canvas = document.createElement('canvas'); canvas.className = 'skybreak-canvas'; canvas.dataset.renderer = 'foundry';
  canvas.setAttribute('aria-hidden', 'true'); element.append(canvas);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  const listeners = new AbortController(), scene = new THREE.Scene();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let renderer: THREE.WebGLRenderer | undefined, composer: EffectComposer | undefined;
  let bloom: UnrealBloomPass | undefined, output: OutputPass | undefined, overlay: FlightPresentation | undefined;
  let disposed = false, lost = false, lastTime = 0, width = 0, height = 0, ratio = 0;
  function dispose() {
    if (disposed) return; disposed = true; listeners.abort();
    overlay?.dispose(); bloom?.dispose(); output?.dispose(); composer?.dispose();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
    renderer?.dispose(); renderer?.forceContextLoss(); scene.clear(); element.remove(); canvas.width = canvas.height = 1;
  }
  const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
  const material = <T extends THREE.Material>(m: T) => { materials.add(m); return m; };
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    const gpu = renderer;
    gpu.setClearColor(theme.palette.background); gpu.toneMapping = THREE.ACESFilmicToneMapping; gpu.toneMappingExposure = 1.12;
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); if (disposed || lost) return; lost = true; onFailure();
    }, { signal: listeners.signal });
    const camera = new THREE.OrthographicCamera(0, 480, 0, -800, 0.1, 1800); camera.position.set(0, 0, 1000);
    scene.add(new THREE.HemisphereLight('#bee9ff', '#17263a', 2.4));
    const key = new THREE.DirectionalLight('#e1f6ff', 3.6); key.position.set(-250, 350, 500); scene.add(key);
    const rim = new THREE.DirectionalLight('#ffba70', 2.1); rim.position.set(300, -250, 160); scene.add(rim);
    const models = createFoundryModels(geometries, materials);
    const image = images.backdrop;
    if (!image) throw new Error('Missing foundry backdrop.');
    const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true; textures.add(texture);
    const plate = new THREE.Mesh(geometry(new THREE.PlaneGeometry(880 * 2 / 3, 880)), material(new THREE.MeshBasicMaterial({ map: texture, color: '#a0b0b8' })));
    plate.position.set(240, -400, -160); scene.add(plate);

    // Moving geometry is confined to the periphery and darker than combat actors.
    const scenery = new THREE.Group(); scene.add(scenery);
    const scaffold = material(new THREE.MeshStandardMaterial({ color: '#142b37', metalness: 0.8, roughness: 0.6 }));
    const lamps = material(new THREE.MeshBasicMaterial({ color: '#698b8b' }));
    const stations: THREE.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const station = new THREE.Group(); station.position.set(i % 2 ? 483 : -4, -i * 430, -60); scenery.add(station); stations.push(station);
      const arc = new THREE.Mesh(geometry(new THREE.TorusGeometry(82, 4, 5, 44, Math.PI * 1.6)), scaffold);
      arc.scale.y = 1.7; station.add(arc);
      for (let n = 0; n < 9; n++) {
        const a = n * Math.PI * 2 / 9;
        const strut = new THREE.Mesh(models.unitBox, scaffold); strut.position.set(Math.cos(a) * 80, Math.sin(a) * 136, 2);
        strut.rotation.z = a; strut.scale.set(28, 7, 10); station.add(strut);
        const light = new THREE.Mesh(models.unitBox, lamps); light.position.copy(strut.position); light.position.z += 7;
        light.scale.set(6, 2, 1); station.add(light);
      }
      // Each station becomes two draws, sharing its metal and dim lamp materials.
      for (const m of [scaffold, lamps]) {
        const parts: THREE.BufferGeometry[] = [];
        for (const child of [...station.children]) if (child instanceof THREE.Mesh && child.material === m) {
          child.updateMatrix();
          const source = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
          parts.push(source.applyMatrix4(child.matrix)); station.remove(child);
        }
        const merged = mergeGeometries(parts); for (const part of parts) part.dispose();
        if (!merged) throw new Error('Could not build orbital scenery.');
        station.add(new THREE.Mesh(geometry(merged), m));
      }
    }
    const starsGeometry = geometry(new THREE.BufferGeometry());
    const stars = new Float32Array(96 * 3);
    for (let i = 0; i < 96; i++) stars.set([noise(i) * 480, -noise(i + 100) * 880, -80], i * 3);
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    const starfield = new THREE.Points(starsGeometry, material(new THREE.PointsMaterial({ color: '#7bafb7', size: 1.1,
      transparent: true, opacity: 0.45, depthWrite: false }))); scene.add(starfield);
    const player = models.create('player'); scene.add(player.group);
    const flagship = models.create('flagship'); flagship.group.rotation.z = Math.PI; scene.add(flagship.group);
    const nacelles = [-1, 1].map(side => {
      const g = new THREE.Group(); flagship.group.add(g);
      const hull = new THREE.Mesh(models.unitBox, models.steel); hull.scale.set(49, 78, 16); g.add(hull);
      for (const x of [-18, 18]) {
        const rail = new THREE.Mesh(models.unitBox, models.ivory); rail.position.set(x, 0, 10); rail.scale.set(5, 60, 3); g.add(rail);
      }
      const ring = new THREE.Mesh(geometry(new THREE.TorusGeometry(23, 3, 6, 32)), models.gold);
      ring.position.z = 14; g.add(ring);
      // Fortress parent faces south: local positions are the inverse of world offsets.
      g.position.x = -side * 88;
      return g;
    });
    type Rig = ReturnType<typeof models.create>;
    const enemies = new Map<number, Rig>(), pool = new Map<string, Rig[]>();
    const hitTimes = new Map<number | 'boss', number>();
    const rings: Burst[] = [];
    const ringGeometry = geometry(new THREE.RingGeometry(0.89, 1, 48));
    const ringMeshes = Array.from({ length: 16 }, () => {
      const m = material(new THREE.MeshBasicMaterial({ color: '#a5f1ee', transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false }));
      const mesh = new THREE.Mesh(ringGeometry, m); mesh.visible = false; scene.add(mesh); return mesh;
    });
    const trailGeometry = geometry(new THREE.BufferGeometry());
    const trailPositions = new Float32Array(32 * 3); trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trail = new THREE.LineSegments(trailGeometry, material(new THREE.LineBasicMaterial({ color: '#66cadd', transparent: true,
      opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }))); scene.add(trail);
    const history: { x: number; y: number }[] = [];
    composer = new EffectComposer(gpu);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(480, 800), 0.45, 0.55, 1.25); composer.addPass(bloom);
    output = new OutputPass(); composer.addPass(output);
    overlay = createPresentation(element, theme, { overlay: true });

    function animate(rig: Rig, time: number, bank = 0, roll = 0) {
      rig.group.rotation.y = motion.matches ? 0 : bank * 0.32 + (roll ? roll * Math.PI * 3 : 0);
      for (const flame of rig.flames) {
        const pulse = motion.matches ? 1 : 1 + Math.sin(time * 38 + flame.y) * 0.12;
        flame.mesh.scale.y = flame.length * pulse;
        flame.mesh.position.y = flame.y - (pulse - 1) * flame.length / 2;
      }
    }
    return {
      element,
      reset() { lastTime = 0; rings.length = 0; history.length = 0; hitTimes.clear(); overlay!.reset(); },
      consume(events: readonly FlightEvent[]) {
        overlay!.consume(events);
        for (const e of events) {
          if (!motion.matches && e.type === 'hit' && e.target !== undefined) hitTimes.set(e.target, 0.09);
          if (motion.matches || !['explosion', 'boss-break', 'evade', 'pickup', 'damage'].includes(e.type)) continue;
          rings.push({ x: e.x, y: e.y, age: 0, duration: e.type === 'boss-break' ? 1.4 : 0.6,
            size: e.type === 'boss-break' ? 210 : e.type === 'evade' ? 65 : 45 });
        }
        if (rings.length > 16) rings.splice(0, rings.length - 16);
      },
      draw(run, size, attractTime) {
        if (disposed || lost) throw new Error('Foundry graphics unavailable.');
        // Bound the expensive bloom buffers independently of CSS size and the host DPR.
        const view = flightView(size.width, size.height), fieldWidth = 480 * view.scale, fieldHeight = 800 * view.scale;
        const nextRatio = Math.min(size.ratio, 1.5, 1440 / Math.max(fieldWidth, fieldHeight));
        if (width !== size.width || height !== size.height || ratio !== nextRatio) {
          width = size.width; height = size.height; ratio = nextRatio;
          // Only allocate GPU buffers for the portrait field, rather than rendering the letterbox.
          gpu.setPixelRatio(ratio); gpu.setSize(fieldWidth, fieldHeight, false);
          composer!.setPixelRatio(ratio); composer!.setSize(fieldWidth, fieldHeight);
          canvas.style.left = `${view.x}px`; canvas.style.top = `${view.y}px`;
          canvas.style.width = `${fieldWidth}px`; canvas.style.height = `${fieldHeight}px`;
        }
        const dt = Math.max(0, run.elapsed - lastTime); lastTime = run.elapsed;
        const t = motion.matches ? 0 : attractTime ?? run.elapsed;
        plate.position.y = -400 + (motion.matches ? 0 : Math.sin(t * 0.022) * 15);
        starfield.position.y = -(t * 8 % 70);
        stations.forEach((station, i) => {
          station.position.y = -((i * 430 + t * 17) % 1400 - 220);
          station.rotation.z = (i - 1) * 0.3;
        });
        player.group.visible = run.status !== 'defeat'; player.group.position.set(run.player.x, -run.player.y, 30);
        animate(player, t, run.player.bank, run.player.roll);
        // Immunity remains readable without switching off the aircraft silhouette.
        player.group.scale.setScalar(run.player.immunity > 0 && !motion.matches ? 1 + Math.sin(t * 24) * 0.025 : 1);
        const living = new Set(run.enemies.map(e => e.id));
        for (const [id, rig] of enemies) if (!living.has(id)) {
          rig.group.visible = false; enemies.delete(id);
          const key = rig.group.userData.role as string; const list = pool.get(key) ?? []; list.push(rig); pool.set(key, list);
        }
        for (const e of run.enemies) {
          let rig = enemies.get(e.id);
          if (!rig) {
            rig = pool.get(e.pattern)?.pop() ?? models.create(e.pattern);
            rig.group.userData.role = e.pattern; rig.group.rotation.z = Math.PI; scene.add(rig.group); enemies.set(e.id, rig);
          }
          rig.group.visible = true; rig.group.position.set(e.x, -e.y, 24);
          const bank = e.pattern === 'crossing' ? e.side * 0.5 : e.pattern === 'swoop' ? e.side * Math.cos(e.age * 1.8) * 0.7 : 0;
          animate(rig, t, bank); rig.group.scale.setScalar(hitTimes.has(e.id) ? 1.06 : 1);
        }
        const b = run.boss; flagship.group.visible = !!b;
        if (b) {
          flagship.group.position.set(b.x, -b.y, 15);
          // Nacelles track gameplay age even when decorative animation is reduced.
          nacelles.forEach(g => { g.position.y = 16 + Math.sin(b.age * 2) * 8; });
          animate(flagship, t);
          flagship.group.scale.setScalar(b.health <= 0 ? Math.max(0.01, 1 - b.defeated / fortress.defeatDuration) : hitTimes.has('boss') ? 1.015 : 1);
        }
        for (const [id, life] of hitTimes) { if (life <= dt) hitTimes.delete(id); else hitTimes.set(id, life - dt); }
        if (motion.matches) { rings.length = 0; history.length = 0; }
        else if (dt > 0) { history.unshift({ x: run.player.x, y: run.player.y }); if (history.length > 16) history.pop(); }
        trail.visible = !motion.matches && history.length > 1;
        for (let i = 0; i < 16; i++) {
          const a = history[Math.min(i, history.length - 1)] ?? run.player, b = history[Math.min(i + 1, history.length - 1)] ?? a;
          trailPositions.set([a.x, -a.y - 29, 24, b.x, -b.y - 29, 24], i * 6);
        }
        trailGeometry.attributes.position!.needsUpdate = true;
        for (const burst of rings) burst.age += dt;
        for (let i = rings.length - 1; i >= 0; i--) if (rings[i]!.age >= rings[i]!.duration) rings.splice(i, 1);
        ringMeshes.forEach((mesh, i) => {
          const burst = rings[i]; mesh.visible = !!burst && !motion.matches; if (!burst) return;
          const f = burst.age / burst.duration; mesh.position.set(burst.x, -burst.y, 55);
          mesh.scale.setScalar(5 + f * burst.size); mesh.material.opacity = (1 - f) * 0.5;
        });
        composer!.render();
        overlay!.draw(run, size, attractTime);
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
