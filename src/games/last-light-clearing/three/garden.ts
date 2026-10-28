// The only module allowed to import Three.js objects or types. Loaded on selection.
import * as THREE from 'three';
import { clearing, configurations, enemies, weapons } from '../content.ts';
import type { RunState, GameEvent } from '../game-state.ts';
import type { Theme } from '../themes.ts';
import { MAX_EFFECTS, visualTiming } from '../themes.ts';
import type { WorldPresentation, DisplaySize } from '../world-presentation.ts';
import type { Viewport } from '../view.ts';
import type { ActorRole } from '../art-pack.ts';
import { createAnimationObservations } from '../animation.ts';
import { orbitPosition } from '../weapons/halo.ts';

/** XY ground: (x, -worldY, elevation). Camera looks down -Z, so elevation never shifts XY. */
export function createGarden(theme: Theme, onFailure: () => void): WorldPresentation {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas'; canvas.dataset.renderer = 'garden';
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  let renderer: THREE.WebGLRenderer | undefined, disposed = false, lost = false;
  const listeners = new AbortController();
  const scene = new THREE.Scene();
  const p = theme.palette;
  const { width, height } = clearing.arena;
  function dispose() {
    if (disposed) return;
    disposed = true; listeners.abort();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
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
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(p.background);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); lost = true; onFailure();
    }, { signal: listeners.signal });
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 2000);
    camera.position.set(0, 0, 1000);
    scene.add(new THREE.HemisphereLight(p.light, p.canopy, 2.1));
    const sun = new THREE.DirectionalLight(p.hit, 3.1);
    sun.position.set(180, 200, 600); sun.target.position.set(width / 2, -height / 2, 0);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -720, right: 720, top: 720, bottom: -720, near: 1, far: 1600 });
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.001; sun.shadow.normalBias = 1;
    scene.add(sun, sun.target);

    // A small deterministic stone texture; cosmetic variation never uses run.randomState.
    const data = new Uint8Array(64 * 64 * 4);
    for (let i = 0; i < 64 * 64; i++) {
      const n = (i * 73 + (i % 64) * 19) % 17;
      data.set([190 + n * 3, 190 + n * 3, 190 + n * 3, 255], i * 4);
    }
    const floorMap = texture(new THREE.DataTexture(data, 64, 64));
    floorMap.colorSpace = THREE.SRGBColorSpace; floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
    floorMap.repeat.set(14, 10); floorMap.needsUpdate = true;
    const floorMat = material(new THREE.MeshStandardMaterial({ map: floorMap, color: p.floor, roughness: 0.95, metalness: 0.12 }));
    const floor = mesh(geometry(new THREE.BoxGeometry(width, height, 18)), floorMat, width / 2, height / 2, -9.1);
    floor.receiveShadow = true;
    const stone = lit(p.canopy), edge = lit(p.boundary, p.boundary, 0.3);
    const box = geometry(new THREE.BoxGeometry(1, 1, 1));
    // Boundary inlays stay at the actual world edge; all large scenery lies beyond it.
    for (const [x, y, w, h] of [[width / 2, -3, width + 6, 5], [width / 2, height + 3, width + 6, 5], [-3, height / 2, 5, height], [width + 3, height / 2, 5, height]]) {
      mesh(box, edge, x!, y!, 0).scale.set(w!, h!, 4);
    }
    const panel = geometry(new THREE.CircleGeometry(1, 6));
    const panelMat = lit(p.floor);
    for (let i = 0; i < 40; i++) {
      const x = 30 + (i * 173) % (width - 60), y = 30 + (i * 97) % (height - 60);
      const item = mesh(panel, panelMat, x, y, 0.05); item.scale.setScalar(10 + i % 4 * 4); item.rotation.z = i;
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

    const keeperMat = lit(p.light, p.light, 1.2), enemyMat = lit(p.enemy, p.enemy, 0.12);
    const eliteMat = lit(p.elite, p.elite, 0.3), dark = lit(p.canopy), core = lightMaterial(p.hit);
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
      const body = mesh(keeper ? crystal : sphere, bodyMaterial, 0, 0, radius);
      body.scale.set(radius, radius * (keeper ? 0.78 : 0.9), keeper ? 24 : radius * 0.85);
      body.rotation.set(0.24, 0.18, 0); body.castShadow = true; model.add(body);
      if (keeper) {
        const cap = mesh(crystal, core, 0, 0, 36, model); cap.scale.set(4, 4, 5);
        const frame = mesh(ringGeometry, edge, 0, 0, 12, model); frame.scale.setScalar(15);
      } else {
        // Four angled limbs and two bright eyes distinguish creatures from pickups.
        for (let j = 0; j < 4; j++) {
          const leg = mesh(box, dark, (j < 2 ? -1 : 1) * radius, (j % 2 ? -1 : 1) * radius * 0.7, 3, model);
          leg.scale.set(radius * 0.9, 4, 5); leg.rotation.z = j % 2 ? -0.55 : 0.55; leg.castShadow = true;
        }
        for (const x of [-radius * 0.35, radius * 0.35]) {
          const eye = mesh(sphere, core, x, -radius * 0.33, radius * 1.8, model); eye.scale.set(2.2, 2.2, 1.2);
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
      group.visible = false;
      return { group, model, flash, health, healthBack, radius };
    }
    type Actor = ReturnType<typeof actor>;
    const keeper = actor('keeper');
    // Enemy IDs are observations only. Mesh slots can be reused without claiming array identity.
    const ordinarySlots = Math.max(...Object.values(configurations).map(config => config.round.ordinaryCap));
    const crawlers = Array.from({ length: ordinarySlots }, () => actor('crawler')), eliteActor = actor('elite');
    function drawActor(slot: Actor, id: string | number, x: number, y: number, time: number, health = 1, entry = false) {
      const observation = observations.get(id);
      slot.group.visible = true; slot.group.position.set(x, -y, 0);
      const hitAt = effects.findLast(e => e.type === (id === 'keeper' ? 'player-hit' : 'enemy-hit') && (!('enemyId' in e) || e.enemyId === id))?.at;
      slot.flash.visible = hitAt !== undefined && time - hitAt < visualTiming.hit;
      slot.health.visible = slot.healthBack.visible = health < 1 && id !== 'keeper';
      slot.health.scale.set(slot.radius * 2 * health, 2, 1);
      slot.health.position.x = -slot.radius * (1 - health);
      slot.group.scale.setScalar(entry ? 0.8 : 1);
      slot.model.rotation.z = id === 'keeper' ? time * 0.3 : -observation.angle + Math.PI / 2;
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
    const gems = instances(crystal, lit(p.gem, p.gem, 0.6), 2048);
    const spark = instances(sphere, lightMaterial(p.spark), 256);
    const trails = instances(box, lightMaterial(p.spark), 256);
    const shards = instances(crystal, lit(p.shard, p.shard, 0.7), 256);
    const fragments = instances(crystal, lit(p.enemy, p.enemy, 0.5), MAX_EFFECTS * 6);
    const rings = instances(ringGeometry, lightMaterial('#ffffff'), MAX_EFFECTS);
    const warningRings = instances(ringGeometry, lightMaterial(p.damage), 64);
    const halo = mesh(crystal, lit(p.halo, p.halo, 1.2), 0, 0, 14); halo.scale.set(9, 9, 16);
    const haloTrack = mesh(ringGeometry, lit(p.halo, p.halo, 0.3), 0, 0, 1); haloTrack.scale.setScalar(weapons.halo.radius);
    const keeperRing = mesh(ringGeometry, lightMaterial(p.light), 0, 0, 1); keeperRing.scale.setScalar(20);
    const shieldRing = mesh(ringGeometry, lightMaterial(p.shard), 0, 0, 2); shieldRing.scale.setScalar(24);
    const effectColor = new THREE.Color();
    const batches = [gems, spark, trails, shards, fragments, rings, warningRings];
    let size: DisplaySize = { width: 1, height: 1, ratio: 1 };
    return {
      canvas,
      resize(next) {
        if (size.width === next.width && size.height === next.height && size.ratio === next.ratio) return;
        size = { width: next.width, height: next.height, ratio: next.ratio };
        renderer!.setPixelRatio(size.ratio); renderer!.setSize(size.width, size.height, false);
      },
      observe(run) { observations.observe(run); },
      reset(run) { effects = []; observations.reset(run); },
      consume(events) {
        for (const event of events) if ('x' in event) effects.push(event);
        if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);
      },
      draw(run: Readonly<RunState>, view: Viewport) {
        if (lost || renderer!.getContext().isContextLost()) throw new Error('Graphics context lost');
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
          if (slot) drawActor(slot, enemy.id, enemy.x, enemy.y, run.elapsed, enemy.health / info.maxHealth, enemy.entryDelay > 0);
        }
        for (const batch of batches) batch.count = 0;
        for (const gem of run.gems) add(gems, gem.x, gem.y, 7 + Math.sin(run.elapsed * 2.8 + gem.x * 0.07) * 1.5, gem.amount > 5 ? 8 : 5, gem.amount > 5 ? 8 : 5, 8, run.elapsed * 0.5);
        for (const projectile of run.projectiles) {
          const angle = -Math.atan2(projectile.dy, projectile.dx);
          if (projectile.weapon === 'shard') add(shards, projectile.x, projectile.y, 7, 10, 4, 5, angle);
          else {
            add(spark, projectile.x, projectile.y, 8, 5, 4, 4, angle);
            // Velocity-aligned cosmetic tail, never an index-based history of unrelated projectiles.
            add(trails, projectile.x - projectile.dx * 13, projectile.y - projectile.dy * 13, 6, 22, 1.5, 1, angle);
          }
        }
        for (const effect of effects) {
          const age = run.elapsed - effect.at;
          if (effect.type === 'pulse' && age < visualTiming.pulse) {
            const radius = effect.radius * (0.15 + 0.85 * age / visualTiming.pulse);
            add(rings, effect.x, effect.y, 2, radius, radius, 0.5);
            rings.setColorAt(rings.count - 1, effectColor.set(p.pulse));
          } else if (effect.type === 'enemy-defeated' && age < visualTiming.defeat) {
            for (let j = 0; j < 6; j++) {
              const angle = j * Math.PI / 3 + effect.enemyId * 0.7, spread = age * 65;
              const scale = (1 - age / visualTiming.defeat) * 3;
              add(fragments, effect.x + Math.cos(angle) * spread, effect.y + Math.sin(angle) * spread, 4 + Math.sin(age / visualTiming.defeat * Math.PI) * 14, scale, scale, scale * 2, age * 8);
            }
          } else if (effect.type === 'pickup' && age < visualTiming.pickup) {
            add(rings, effect.x, effect.y, 2, 6 + age * 30, 6 + age * 30, 0.4);
            rings.setColorAt(rings.count - 1, effectColor.set(p.gem));
          }
        }
        for (const entry of [...run.entries, ...run.enemies.filter(e => e.entryDelay > 0).map(e => ({ ...e, remaining: e.entryDelay }))]) {
          const radius = 19 + (1 - entry.remaining / run.round.entryWarning) * 5;
          add(warningRings, entry.x, entry.y, 1, radius, radius, 0.5);
        }
        const orbit = run.loadout.find(slot => weapons[slot.base].behavior === 'orbit');
        halo.visible = haloTrack.visible = Boolean(orbit);
        if (orbit) {
          const at = orbitPosition(run, orbit); halo.position.set(at.x, -at.y, 16); halo.rotation.z = run.elapsed * 2;
          haloTrack.position.set(run.player.x, -run.player.y, 1);
        }
        keeperRing.position.set(run.player.x, -run.player.y, 1);
        shieldRing.position.set(run.player.x, -run.player.y, 2); shieldRing.visible = run.player.shield > 0;
        for (const batch of batches) batch.instanceMatrix.needsUpdate = true;
        if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
        renderer!.render(scene, camera);
        if (lost || renderer!.getContext().isContextLost()) throw new Error('Graphics context lost');
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
