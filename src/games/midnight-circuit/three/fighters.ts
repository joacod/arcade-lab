import * as T from 'three';
import { createGait, fighterFrame } from '../animation.ts';
import { fighterRow, fighterScale } from '../sprite-art.ts';
import type { Actor } from '../game.ts';
import type { ImageBundle } from '../../../engine/browser/images.ts';
import type { CircuitArt } from './art.ts';

/** One complete cel per actor. A single atlas texture serves the scene and its reflection. */
export function createFighters(art: CircuitArt, people: T.Group, images: ImageBundle) {
  const map = new T.Texture(images.fighters!);
  map.colorSpace = T.SRGBColorSpace; map.needsUpdate = true; art.textures.add(map);
  const material = new T.MeshBasicMaterial({ map, transparent: true, alphaTest: .04, depthWrite: false, toneMapped: false });
  art.materials.add(material);
  const frames = Array.from({ length: 4 }, (_, row) => Array.from({ length: 8 }, (_, frame) => {
    const geometry = art.own(new T.PlaneGeometry(160, 160));
    const left = frame / 8, right = (frame + 1) / 8, top = 1 - row / 4, bottom = 1 - (row + 1) / 4;
    geometry.setAttribute('uv', new T.Float32BufferAttribute([left, top, right, top, left, bottom, right, bottom], 2));
    return geometry;
  }));
  const healthBack = new T.MeshBasicMaterial({color:'#182d30',depthTest:false});
  const healthFill = new T.MeshBasicMaterial({color:'#f7ae73',depthTest:false});
  art.materials.add(healthBack); art.materials.add(healthFill);
  const actors = new Map<number, { root: T.Group; cel: T.Mesh; bar: T.Mesh; back: T.Mesh }>(), gait = createGait();
  return {
    gait,
    pose(a: Actor, time: number, reduced: boolean) {
      let sprite = actors.get(a.id);
      if (!sprite) {
        const root = new T.Group(), cel = new T.Mesh(frames[fighterRow(a)]![0], material);
        // Screen up projects to (.8 * height, -.6 * depth), matching circuitView.
        cel.rotation.x = -Math.atan2(.6, .8); cel.position.set(0, 70 * .8, -70 * .6); root.add(cel);
        const shadow = new T.Mesh(art.plane, art.shadowMaterial);
        shadow.rotation.x = -Math.PI / 2; shadow.position.y = 1; shadow.scale.set(80, 45, 1); root.add(shadow);
        const back = new T.Mesh(art.plane,healthBack), bar = new T.Mesh(art.plane,healthFill);
        for (const item of [back,bar]) {
          item.rotation.x = cel.rotation.x; item.position.set(0,145*.8,-145*.6);root.add(item);
        }
        back.scale.set(38,4,1); bar.scale.set(36,2,1);
        people.add(root); sprite = { root, cel, bar, back }; actors.set(a.id, sprite);
      }
      const { root, cel, bar, back } = sprite, size = fighterScale(a);
      root.position.set(a.x, 0, a.lane / .6); root.scale.set(a.facing * size, size, size);
      cel.position.y = 70 * .8 + a.elevation / (.8 * size);
      root.visible = a.health > 0 || a.death > 0;
      cel.geometry = frames[fighterRow(a)]![fighterFrame(a, gait.get(a.id), reduced)]!;
      cel.visible = reduced || !(a.immune > 0 && Math.floor(time * 16) % 2 === 0);
      cel.renderOrder = 10 + a.lane * .001;
      bar.visible = back.visible = a.kind !== 'player' && a.kind !== 'warden' && a.health > 0 && a.health < a.maxHealth;
      const health = Math.max(0,a.health/a.maxHealth);
      bar.scale.x = 36*health;bar.position.x = (-18+18*health)*a.facing;
      back.renderOrder = cel.renderOrder + 1;bar.renderOrder = cel.renderOrder + 2;
    },
    prune(ids: Set<number>) { for (const [id, sprite] of actors) if (!ids.has(id)) { sprite.root.removeFromParent(); actors.delete(id); } },
    reset() { for (const sprite of actors.values()) sprite.root.removeFromParent(); actors.clear(); gait.reset(); },
    dispose() { for (const sprite of actors.values()) sprite.root.removeFromParent(); actors.clear(); },
  };
}
