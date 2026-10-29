import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Original Afterglow geometry and materials. All resources belong to one presentation. */
export function createArt() {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  function own<G extends T.BufferGeometry>(geometry: G): G { geometries.add(geometry); return geometry; }
  const box = own(new T.BoxGeometry(1, 1, 1));
  const round = own(new RoundedBoxGeometry(1, 1, 1, 3, .12));
  const sphere = own(new T.SphereGeometry(1, 12, 10));
  const cylinder = own(new T.CylinderGeometry(.78, 1, 1, 10));
  const plane = own(new T.PlaneGeometry(1, 1));
  const cache = new Map<string, T.MeshStandardMaterial>();
  function material(color: string, glow = false, metal = false) {
    const id = `${color}/${glow}/${metal}`;
    let mat = cache.get(id);
    if (!mat) {
      mat = new T.MeshStandardMaterial({ color, roughness: metal ? .36 : .76, metalness: metal ? .65 : .08,
        emissive: glow ? color : '#000000', emissiveIntensity: glow ? 2.8 : 0 });
      cache.set(id, mat); materials.add(mat);
    }
    return mat;
  }
  function mesh(parent: T.Object3D, geometry: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
    const item = new T.Mesh(geometry, mat); item.position.set(x, y, z); item.scale.set(w, h, d);
    item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
  }
  function block(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, glow = false, metal = false) {
    return mesh(parent, box, material(color, glow, metal), x, y, z, w, h, d);
  }
  function rounded(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, metal = false) {
    return mesh(parent, round, material(color, false, metal), x, y, z, w, h, d);
  }
  function profile(points: readonly (readonly [number, number])[], depth: number, bevel = 1.5) {
    const shape = new T.Shape(); points.forEach(([x,y],i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
    const geometry = own(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 4 }));
    geometry.translate(0, 0, -depth / 2); return geometry;
  }
  function texture(canvas: HTMLCanvasElement) {
    const t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; textures.add(t); return t;
  }
  function sign(parent: T.Object3D, title: string, subtitle: string, x: number, y: number, z: number, w: number, h: number, color: string, dark = '#102329') {
    const canvas = document.createElement('canvas');
    // Texture density follows the sign's footprint, including tall narrow panels.
    const density = Math.min(4, 1024 / Math.max(w, h));
    canvas.width = Math.ceil(w * density); canvas.height = Math.ceil(h * density);
    const logicalHeight = 1024 * h / w, vertical = w / h < .8;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(canvas.width / 1024, canvas.height / logicalHeight);
    ctx.fillStyle = dark; ctx.fillRect(0, 0, 1024, logicalHeight);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(10, 10, 1004, logicalHeight - 20);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${vertical ? Math.min(650, logicalHeight * .45) : Math.min(130, logicalHeight * .5)}px sans-serif`;
    ctx.fillText(title, 512, logicalHeight * (subtitle ? .42 : .52), 930);
    if (subtitle) {
      ctx.font = `${Math.min(vertical ? 180 : 27, logicalHeight * .15)}px monospace`;
      ctx.fillText(subtitle, 512, logicalHeight * .8, 920);
    }
    const map = texture(canvas);
    const mat = new T.MeshStandardMaterial({ map, emissiveMap: map, emissive: color, emissiveIntensity: .85, roughness: .55 }); materials.add(mat);
    return mesh(parent, plane, mat, x,y,z,w,h,1);
  }
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d')!, gradient = ctx.createRadialGradient(64,64,3,64,64,64);
  gradient.addColorStop(0,'#000c'); gradient.addColorStop(.4,'#0007'); gradient.addColorStop(1,'#0000');
  ctx.fillStyle=gradient; ctx.fillRect(0,0,128,128);
  const shadowMaterial = new T.MeshBasicMaterial({ map: texture(shadowCanvas), transparent: true, depthWrite: false, opacity: .85 }); materials.add(shadowMaterial);
  return { own, box, round, sphere, cylinder, plane, material, mesh, block, rounded, profile, sign, shadowMaterial, geometries, materials, textures,
    dispose() { for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); for (const t of textures) t.dispose(); },
  };
}
export type CircuitArt = ReturnType<typeof createArt>;
