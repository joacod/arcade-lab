// The only module allowed to import Three.js objects or types. Loaded on selection.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createGardenFloor } from './floor.ts';
import { clearing, configurations, enemies, weapons } from '../content.ts';
import type { RunState, GameEvent } from '../game-state.ts';
import type { Theme } from '../themes.ts';
import { MAX_EFFECTS, visualTiming } from '../themes.ts';
import type { WorldPresentation, DisplaySize } from '../world-presentation.ts';
import type { Viewport } from '../view.ts';
import type { ActorRole } from '../art-pack.ts';
import { createAnimationObservations } from '../animation.ts';
import { orbitPosition } from '../weapons/halo.ts';
import { haloLights } from '../weapon-stats.ts';

/** XY ground: (x, -worldY, elevation). Camera looks down -Z, so elevation never shifts XY. */
export function createGarden(theme: Theme, onFailure: () => void): WorldPresentation {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas'; canvas.dataset.renderer = 'garden';
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  let renderer: THREE.WebGLRenderer | undefined, disposed = false, lost = false;
  let composer: EffectComposer | undefined, bloom: UnrealBloomPass | undefined, output: OutputPass | undefined;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const scene = new THREE.Scene();
  const p = theme.palette;
  const { width, height } = clearing.arena;
  function dispose() {
    if (disposed) return;
    disposed = true; listeners.abort();
    bloom?.dispose(); output?.dispose(); composer?.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) {
      texture.dispose();
      if (texture.image instanceof HTMLCanvasElement) texture.image.width = texture.image.height = 1;
    }
    // Includes the directional light's shadow render target, allocated on first render.
    scene.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose(); if (object instanceof THREE.InstancedMesh) object.dispose(); });
    renderer?.dispose(); renderer?.forceContextLoss();
    scene.clear(); canvas.remove(); canvas.width = canvas.height = 1;
  }
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.add(value); return value; };
  const material = <T extends THREE.Material>(value: T): T => { materials.add(value); return value; };
  const texture = <T extends THREE.Texture>(value: T): T => { textures.add(value); return value; };
  const lit = (color: string, emissive = '#000000', intensity = 0) => material(new THREE.MeshStandardMaterial({
    color: color.slice(0, 7), emissive: emissive.slice(0, 7), emissiveIntensity: intensity, roughness: 0.64, metalness: 0.18, flatShading: true,
  }));
  const lightMaterial = (color: string) => material(new THREE.MeshBasicMaterial({ color }));
  function mesh(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
    const item = new THREE.Mesh(g, m); item.position.set(x, -y, z); parent.add(item); return item;
  }
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    // Scene backgrounds follow the composer's linear color path, including outside the arena.
    scene.background = new THREE.Color(p.background);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); lost = true; onFailure();
    }, { signal: listeners.signal });
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 2000);
    camera.position.set(0, 0, 1000);
    const sky = new THREE.HemisphereLight('#b7dfe8', '#12222c', 1.1); scene.add(sky);
    const sun = new THREE.DirectionalLight('#dce6ff', 2.1);
    sun.position.set(100, 60, 650); sun.target.position.set(width / 2, -height / 2, 0);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -720, right: 720, top: 720, bottom: -720, near: 1, far: 1600 });
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.001; sun.shadow.normalBias = 1;
    scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight('#ba8bdb', 1.4); rim.position.set(width, -height, 140); scene.add(rim);
    const lantern = new THREE.PointLight('#ffc777', 9500, 160, 2); scene.add(lantern);

    const floorMap = texture(new THREE.CanvasTexture(createGardenFloor()));
    floorMap.colorSpace = THREE.SRGBColorSpace; floorMap.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const floorMat = material(new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.83, metalness: 0.25 }));
    const floor = mesh(geometry(new THREE.PlaneGeometry(width, height)), floorMat, width / 2, height / 2, -0.1);
    floor.receiveShadow = true;
    const stone = lit(p.canopy), edge = lit(p.boundary, p.boundary, 0.3);
    const box = geometry(new THREE.BoxGeometry(1, 1, 1));
    // Boundary inlays stay at the actual world edge; all large scenery lies beyond it.
    for (const [x, y, w, h] of [[width / 2, -3, width + 6, 5], [width / 2, height + 3, width + 6, 5], [-3, height / 2, 5, height], [width + 3, height / 2, 5, height]]) {
      mesh(box, edge, x!, y!, 0).scale.set(w!, h!, 4);
    }
    // Quiet engravings read as traversable floor; substantial crystals stay outside.
    const engraving = lit('#697e6c');
    const seal = geometry(new THREE.TorusGeometry(1, 0.006, 3, 80));
    for (const radius of [64, 78, 110]) mesh(seal, engraving, width / 2, height / 2, 0.05).scale.set(radius, radius, 0.1);
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI / 12, radius = i % 2 ? 96 : 102;
      const inlay = mesh(box, engraving, width / 2 + Math.cos(angle) * radius, height / 2 + Math.sin(angle) * radius, 0.08);
      inlay.scale.set(i % 2 ? 6 : 12, 1, 0.1); inlay.rotation.z = -angle;
    }
    const crystal = geometry(new THREE.OctahedronGeometry(1));
    const crystalMat = lit(p.ground, p.boundary, 0.25), violet = lit(p.canopy, p.canopy, 0.2);
    for (let i = 0; i < 54; i++) {
      const vertical = i >= 32, index = vertical ? i - 32 : i;
      const side = index % 2 === 0;
      const x = vertical ? (side ? -35 : width + 35) : 18 + Math.floor(index / 2) * 62;
      const y = vertical ? 20 + Math.floor(index / 2) * 60 : (side ? -38 : height + 38);
      const rock = mesh(crystal, i % 3 ? crystalMat : violet, x, y, 18);
      rock.scale.set(11 + i % 5 * 2, 14 + i % 3 * 3, 25 + i % 4 * 9);
      rock.rotation.set(0.16, 0.3, i * 0.7); rock.castShadow = true;
      const base = mesh(box, stone, x, y, -3); base.scale.set(28, 28, 9); base.rotation.z = i * 0.7;
      // Flower-like crowns read from overhead; raised props remain beyond the boundary.
      for (let petal = 0; petal < 5; petal++) {
        const a = petal * Math.PI * 2 / 5 + i;
        const leaf = mesh(crystal, violet, x + Math.cos(a) * 16, y + Math.sin(a) * 16, 9);
        leaf.scale.set(6, 15, 7); leaf.rotation.set(0.3, 0.5, -a + Math.PI / 2);
      }
    }
    // Flush botanical inlays bring the garden into the cropped camera without implying obstacles.
    const rootMat = lit('#254a47', '#397264', 0.12);
    const noise = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
    for (let i = 0; i < 28; i++) {
      const x = 26 + noise(i) * (width - 52), y = 22 + noise(i + 50) * (height - 44);
      for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 2 / 5 + i;
        const leaf = mesh(crystal, rootMat, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 0.2);
        leaf.scale.set(1.5, 7, 0.12); leaf.rotation.z = -a + Math.PI / 2;
      }
    }

    // Scenery is immutable. Batch equal geometry/material/shadow combinations once,
    // keeping authored transforms and letting Three compute bounds for each batch.
    const scenery = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>();
    for (const item of scene.children) {
      if (!(item instanceof THREE.Mesh) || Array.isArray(item.material)) continue;
      const key = `${item.geometry.uuid}:${item.material.uuid}:${item.castShadow}:${item.receiveShadow}`;
      const group = scenery.get(key) ?? [];
      group.push(item); scenery.set(key, group);
    }
    for (const group of scenery.values()) {
      if (group.length < 2) continue;
      const first = group[0]!;
      const batch = new THREE.InstancedMesh(first.geometry, first.material, group.length);
      batch.castShadow = first.castShadow; batch.receiveShadow = first.receiveShadow;
      group.forEach((item, index) => {
        item.updateMatrix(); batch.setMatrixAt(index, item.matrix); scene.remove(item);
      });
      batch.computeBoundingSphere(); scene.add(batch);
    }

    const keeperMat = lit('#c9b477', '#ffc777', 0.22), enemyMat = lit('#9d4867', '#c35287', 0.08);
    const eliteMat = lit('#7851a2', '#b36ee0', 0.2), dark = lit('#1b263c'), core = lit('#fff4cc', '#ffd090', 3);
    const petalMat = lit('#6eaaa8', '#76dcc9', 0.24), gold = lit('#bba06a');
    const eyes = lit('#ffb8c1', '#ff809b', 1.1);
    const ringGeometry = geometry(new THREE.TorusGeometry(1, 0.035, 5, 48));
    const sphere = geometry(new THREE.IcosahedronGeometry(1, 0));
    const observations = createAnimationObservations();
    let effects: Extract<GameEvent, { x: number }>[] = [];
    const flashMaterial = lightMaterial(p.hit), healthMaterial = lightMaterial(p.damage), eliteHealthMaterial = lightMaterial(p.elite);
    function actor(role: ActorRole) {
      const group = new THREE.Group(); scene.add(group);
      const model = new THREE.Group(); group.add(model);
      const elite = role === 'elite', keeper = role === 'keeper';
      const bodyMaterial = keeper ? keeperMat : elite ? eliteMat : enemyMat;
      const radius = keeper ? 11 : elite ? 21 : 12;
      const limbs: THREE.Group[] = [], petals: THREE.Mesh[] = [];
      const body = mesh(keeper ? crystal : sphere, bodyMaterial, 0, 0, radius);
      body.scale.set(radius, radius * (keeper ? 0.78 : 0.9), keeper ? 24 : radius * 0.85);
      body.rotation.set(0.24, 0.18, 0); body.castShadow = true; model.add(body);
      if (keeper) {
        for (let index = 0; index < 6; index++) {
          const angle = index * Math.PI / 3;
          const petal = mesh(crystal, petalMat, Math.cos(angle) * 11, Math.sin(angle) * 11, 17, model);
          petal.scale.set(4, 10, 7); petal.rotation.z = -angle + Math.PI / 2; petal.castShadow = true; petals.push(petal);
        }
        // Four dark ribs frame a luminous lantern, readable directly from above.
        for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
          const rib = mesh(box, gold, Math.cos(angle) * 7, Math.sin(angle) * 7, 28, model);
          rib.scale.set(2, 2, 16); rib.castShadow = true;
        }
        const cap = mesh(sphere, core, 0, 0, 30, model); cap.scale.set(5, 5, 8);
        const frame = mesh(ringGeometry, gold, 0, 0, 35, model); frame.scale.setScalar(8);
        const base = mesh(ringGeometry, gold, 0, 0, 12, model); base.scale.setScalar(12);
      } else {
        // Six jointed legs, split shell plates and paired eyes distinguish creatures from gems.
        for (let j = 0; j < 6; j++) {
          const side = j < 3 ? -1 : 1, offset = j % 3 - 1;
          const joint = new THREE.Group(); joint.position.set(side * radius * 0.65, offset * radius * 0.65, 7); model.add(joint); limbs.push(joint);
          const leg = mesh(box, dark, side * radius * 0.55, 0, 0, joint);
          leg.scale.set(radius * 1.1, 3, 4); leg.rotation.z = offset * side * 0.5; leg.castShadow = true;
          const tip = mesh(crystal, bodyMaterial, side * radius * 1.05, -offset * radius * 0.25, -2, joint);
          tip.scale.set(3, 4, 5); tip.castShadow = true;
        }
        for (const side of [-1, 1]) {
          const shell = mesh(crystal, bodyMaterial, side * radius * 0.43, 0, radius * 1.6, model);
          shell.scale.set(radius * 0.48, radius * 0.85, radius * 0.45); shell.rotation.z = side * 0.15;
          const thorn = mesh(crystal, gold, side * radius * 0.6, radius * 0.6, radius * 1.7, model); thorn.scale.set(2, radius * 0.45, 4);
        }
        for (const x of [-radius * 0.35, radius * 0.35]) {
          const eye = mesh(sphere, eyes, x, -radius * 0.33, radius * 1.8, model); eye.scale.set(1.8, 1.8, 1.2);
        }
        if (elite) for (let j = 0; j < 5; j++) {
          const spike = mesh(crystal, core, Math.cos(j * Math.PI * 2 / 5) * 15, Math.sin(j * Math.PI * 2 / 5) * 15, 24, model);
          spike.scale.set(3, 3, 11);
        }
      }
      const flash = mesh(ringGeometry, flashMaterial, 0, 0, 5, group);
      flash.scale.setScalar(radius + 5); flash.visible = false;
      const healthBack = mesh(box, dark, 0, -radius - 12, 5, group); healthBack.scale.set(radius * 2, 3, 1);
      const health = mesh(box, elite ? eliteHealthMaterial : healthMaterial, 0, -radius - 12, 6, group);
      const crest = new THREE.Group(); model.add(crest); crest.visible = false;
      for (const side of [-1, 1]) {
        const fork = mesh(crystal, gold, side * 6, -radius * 0.7, radius * 2, crest); fork.scale.set(3, 10, 5); fork.rotation.z = side * 0.4;
      }
      group.visible = false;
      // Detached pose trees are copied into shared instance buffers below.
      scene.remove(group);
      return { group, model, flash, health, healthBack, radius, limbs, petals, crest };
    }
    type Actor = ReturnType<typeof actor>;
    const keeper = actor('keeper');
    // Enemy IDs are observations only. Mesh slots can be reused without claiming array identity.
    const ordinarySlots = Math.max(...Object.values(configurations).map(config => config.round.ordinaryCap));
    const crawlers = Array.from({ length: ordinarySlots }, () => actor('crawler')), eliteActor = actor('elite');
    const actors = [keeper, ...crawlers, eliteActor];
    function drawActor(slot: Actor, id: string | number, x: number, y: number, time: number, health = 1, entry = false) {
      const observation = observations.get(id);
      slot.group.visible = true; slot.group.position.set(x, -y, 0);
      const hitAt = effects.findLast(e => e.type === (id === 'keeper' ? 'player-hit' : 'enemy-hit') && (!('enemyId' in e) || e.enemyId === id))?.at;
      slot.flash.visible = hitAt !== undefined && time - hitAt < visualTiming.hit;
      slot.health.visible = slot.healthBack.visible = health < 1 && id !== 'keeper';
      slot.health.scale.set(slot.radius * 2 * health, 2, 1);
      slot.health.position.x = -slot.radius * (1 - health);
      slot.group.scale.setScalar(entry ? 0.8 : 1);
      // Eyes and crest face local +Y; convert world heading into the garden's inverted Y.
      slot.model.rotation.z = -observation.angle - Math.PI / 2;
      const gait = !motion.matches && observation.moving ? Math.sin(time * 14 + x * 0.03) : 0;
      slot.model.position.z = !motion.matches ? Math.sin(time * 3 + x) * (id === 'keeper' ? 1.4 : 0.4) : 0;
      for (const [index, limb] of slot.limbs.entries()) {
        limb.rotation.z = gait * (index % 2 ? 0.22 : -0.22);
        limb.position.z = 7 + Math.max(0, gait * (index % 2 ? 1 : -1)) * 2;
      }
      for (const [index, petal] of slot.petals.entries()) petal.rotation.x = motion.matches ? 0 : Math.sin(time * 3.2 + index) * 0.12;
    }

    // Fixed instance capacity covers authored round limits; no allocation per transient or per frame.
    const dummy = new THREE.Object3D();
    function instances(g: THREE.BufferGeometry, m: THREE.Material, capacity: number) {
      const batch = new THREE.InstancedMesh(g, m, capacity);
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage); batch.frustumCulled = false; batch.count = 0; scene.add(batch);
      return batch;
    }
    function add(batch: THREE.InstancedMesh, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, angle = 0) {
      if (batch.count >= batch.instanceMatrix.count) return;
      dummy.position.set(x, -y, z); dummy.rotation.set(0, 0, angle); dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix(); batch.setMatrixAt(batch.count++, dummy.matrix);
    }
    const actorParts = new Map<string, { batch: THREE.InstancedMesh; parts: { mesh: THREE.Mesh; slot: Actor }[] }>();
    for (const slot of actors) slot.group.traverse(item => {
      if (!(item instanceof THREE.Mesh) || Array.isArray(item.material)) return;
      const key = `${item.geometry.uuid}:${item.material.uuid}:${item.castShadow}`;
      let entry = actorParts.get(key);
      if (!entry) {
        entry = { batch: instances(item.geometry, item.material, 1024), parts: [] };
        entry.batch.castShadow = item.castShadow; actorParts.set(key, entry);
      }
      entry.parts.push({ mesh: item, slot });
    });
    function paintActors() {
      for (const slot of actors) if (slot.group.visible) slot.group.updateMatrixWorld(true);
      for (const { batch, parts } of actorParts.values()) {
        batch.count = 0;
        for (const { mesh: part, slot } of parts) {
          if (!slot.group.visible) continue;
          let parent: THREE.Object3D | null = part, visible = true;
          while (parent) { if (!parent.visible) { visible = false; break; } parent = parent.parent; }
          if (visible) batch.setMatrixAt(batch.count++, part.matrixWorld);
        }
        batch.instanceMatrix.needsUpdate = true;
      }
    }
    const gems = instances(crystal, lit(p.gem, p.gem, 0.6), 2048);
    const spark = instances(sphere, lightMaterial(p.spark), 256);
    const trails = instances(box, lightMaterial(p.spark), 256);
    const arcSpark = instances(crystal, lightMaterial(p.shard), 256);
    const arcTrails = instances(box, lightMaterial(p.shard), 256);
    const shards = instances(crystal, lit(p.shard, p.shard, 0.7), 256);
    const fragments = instances(crystal, lit(p.enemy, p.enemy, 0.5), MAX_EFFECTS * 6);
    const rings = instances(ringGeometry, lightMaterial('#ffffff'), MAX_EFFECTS);
    const warningRings = instances(ringGeometry, lightMaterial(p.damage), 64);
    const haloMaterial = lit(p.halo, p.halo, 1.2);
    const halos = Array.from({ length: 3 }, () => {
      const halo = mesh(crystal, haloMaterial, 0, 0, 14); halo.scale.set(9, 9, 16); return halo;
    });
    const haloTrack = mesh(ringGeometry, lit(p.halo, p.halo, 0.3), 0, 0, 1); haloTrack.scale.setScalar(weapons.halo.radius);
    const keeperRing = mesh(ringGeometry, lightMaterial(p.light), 0, 0, 1); keeperRing.scale.setScalar(20);
    const shieldRing = mesh(ringGeometry, lightMaterial(p.shard), 0, 0, 2); shieldRing.scale.setScalar(24);
    const moteMaterial = material(new THREE.MeshBasicMaterial({ color: '#c6e1a6', transparent: true, opacity: 0.45, depthWrite: false }));
    const motes = instances(sphere, moteMaterial, 48);
    // Only emissive cores and spell accents exceed the bloom threshold.
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.6, 1.2); composer.addPass(bloom);
    output = new OutputPass(); composer.addPass(output);
    const effectColor = new THREE.Color();
    const batches = [gems, spark, trails, arcSpark, arcTrails, shards, fragments, rings, warningRings];
    const dawnColor = new THREE.Color('#ffda9b');
    let size: DisplaySize = { width: 1, height: 1, ratio: 1 };
    return {
      canvas,
      resize(next) {
        if (size.width === next.width && size.height === next.height && size.ratio === next.ratio) return;
        size = { width: next.width, height: next.height, ratio: next.ratio };
        const ratio = Math.min(size.ratio, 1.5, 1600 / Math.max(size.width, size.height));
        renderer!.setPixelRatio(ratio); renderer!.setSize(size.width, size.height, false);
        composer!.setPixelRatio(ratio); composer!.setSize(size.width, size.height);
        bloom!.setSize(Math.round(size.width * ratio * 0.5), Math.round(size.height * ratio * 0.5));
      },
      observe(run) { observations.observe(run); },
      reset(run) { effects = []; observations.reset(run); },
      consume(events) {
        for (const event of events) if ('x' in event) effects.push(event);
        if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);
      },
      draw(run: Readonly<RunState>, view: Viewport) {
        if (lost || renderer!.getContext().isContextLost()) throw new Error('Graphics context lost');
        const dawn = Math.max(0, 1 - (run.round.duration - run.elapsed) / 30);
        sky.intensity = 1.1 + dawn * 0.4; sun.intensity = 2.1 + dawn * 0.8;
        sun.color.set('#dce6ff').lerp(dawnColor, dawn);
        lantern.position.set(run.player.x, -run.player.y, 45);
        // Same affine mapping as Canvas. Negative world Y is deliberate, elevation has no parallax.
        camera.left = -view.x / view.scale; camera.right = (size.width - view.x) / view.scale;
        camera.top = view.y / view.scale; camera.bottom = -(size.height - view.y) / view.scale; camera.updateProjectionMatrix();
        effects = effects.filter(e => run.elapsed - e.at < Math.max(visualTiming.defeat, visualTiming.pulse));
        drawActor(keeper, 'keeper', run.player.x, run.player.y, run.elapsed);
        for (const slot of crawlers) slot.group.visible = false;
        eliteActor.group.visible = false;
        let count = 0;
        for (const enemy of run.enemies) {
          const info = enemies[enemy.kind], slot = info.elite ? eliteActor : crawlers[count++];
          if (slot) {
            drawActor(slot, enemy.id, enemy.x, enemy.y, run.elapsed, enemy.health / info.maxHealth, enemy.entryDelay > 0);
            slot.model.scale.set(enemy.kind === 'charger' ? 1.25 : 1, enemy.kind === 'charger' ? 0.8 : 1, 1);
            slot.crest.visible = enemy.kind === 'charger';
          }
        }
        for (const batch of batches) batch.count = 0;
        const time = motion.matches ? 0 : run.elapsed;
        motes.count = 0;
        for (let i = 0; i < 48; i++) {
          const x = (noise(i + 100) * width + time * (i % 2 ? 1.5 : -1.5) + width) % width;
          const y = (noise(i + 200) * height + Math.sin(time * 0.35 + i) * 8 + height) % height;
          add(motes, x, y, 16 + i % 19, 0.45 + i % 3 * 0.2);
        }
        motes.instanceMatrix.needsUpdate = true;
        for (const gem of run.gems) add(gems, gem.x, gem.y, 7 + Math.sin(time * 2.8 + gem.x * 0.07) * 1.5, gem.amount > 5 ? 8 : 5, gem.amount > 5 ? 8 : 5, 8, time * 0.5);
        for (const projectile of run.projectiles) {
          const angle = -Math.atan2(projectile.dy, projectile.dx);
          if (projectile.weapon === 'shard') add(shards, projectile.x, projectile.y, 7, 10, 4, 5, angle);
          else {
            const arc = projectile.chainLimit > 1;
            add(arc ? arcSpark : spark, projectile.x, projectile.y, 8, arc ? 8 : 5, 4, 4, angle);
            // Velocity-aligned cosmetic tail, never an index-based history of unrelated projectiles.
            if (!motion.matches) add(arc ? arcTrails : trails, projectile.x - projectile.dx * 13, projectile.y - projectile.dy * 13, 6, 22, arc ? 2.5 : 1.5, 1, angle);
          }
        }
        for (const effect of effects) {
          const age = run.elapsed - effect.at;
          if (effect.type === 'pulse' && age < visualTiming.pulse) {
            const radius = effect.radius; // The whole circle hits at activation.
            add(rings, effect.x, effect.y, 2, radius, radius, 0.5);
            rings.setColorAt(rings.count - 1, effectColor.set(p.pulse).multiplyScalar(1 - age / visualTiming.pulse));
          } else if (effect.type === 'shot' && age < visualTiming.shot && !motion.matches) {
            const radius = 6 + age * 45;
            add(rings, effect.x, effect.y, 12, radius, radius, 0.3);
            rings.setColorAt(rings.count - 1, effectColor.set(p.spark).multiplyScalar(1 - age / visualTiming.shot));
          } else if (effect.type === 'enemy-defeated' && age < visualTiming.defeat && !motion.matches) {
            for (let j = 0; j < 6; j++) {
              const angle = j * Math.PI / 3 + effect.enemyId * 0.7, spread = age * 65;
              const scale = (1 - age / visualTiming.defeat) * 3;
              add(fragments, effect.x + Math.cos(angle) * spread, effect.y + Math.sin(angle) * spread, 4 + Math.sin(age / visualTiming.defeat * Math.PI) * 14, scale, scale, scale * 2, age * 8);
            }
          } else if (effect.type === 'pickup' && age < visualTiming.pickup) {
            const radius = motion.matches ? 8 : 6 + age * 30;
            add(rings, effect.x, effect.y, 2, radius, radius, 0.4);
            rings.setColorAt(rings.count - 1, effectColor.set(p.gem).multiplyScalar(1 - age / visualTiming.pickup));
          }
        }
        for (const entry of [...run.entries, ...run.enemies.filter(e => e.entryDelay > 0).map(e => ({ ...e, remaining: e.entryDelay }))]) {
          const radius = 19 + (1 - entry.remaining / run.round.entryWarning) * 5;
          add(warningRings, entry.x, entry.y, 1, radius, radius, 0.5);
        }
        const orbit = run.loadout.find(slot => weapons[slot.base].behavior === 'orbit');
        haloTrack.visible = Boolean(orbit);
        for (const [index, halo] of halos.entries()) halo.visible = !!orbit && index < haloLights(orbit.rank);
        if (orbit) {
          for (const [index, halo] of halos.entries()) {
            const at = orbitPosition(run, orbit, index); halo.position.set(at.x, -at.y, 16); halo.rotation.z = time * 2;
          }
          haloTrack.position.set(run.player.x, -run.player.y, 1);
        }
        keeperRing.position.set(run.player.x, -run.player.y, 1);
        shieldRing.position.set(run.player.x, -run.player.y, 2); shieldRing.visible = run.player.shield > 0;
        for (const batch of batches) batch.instanceMatrix.needsUpdate = true;
        if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
        paintActors();
        composer!.render();
        if (lost || renderer!.getContext().isContextLost()) throw new Error('Graphics context lost');
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
