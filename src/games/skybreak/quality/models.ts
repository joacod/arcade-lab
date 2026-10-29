import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AircraftRole } from '../art-pack.ts';

/** Original editable model template. Coordinates use gameplay XY, with decorative depth only. */
export function createFoundryModels(geometries: Set<THREE.BufferGeometry>, materials: Set<THREE.Material>) {
  const material = (color: string, emissive = '#000000', intensity = 0) => {
    const value = new THREE.MeshStandardMaterial({ color, metalness: 0.58, roughness: 0.36,
      emissive, emissiveIntensity: intensity });
    materials.add(value); return value;
  };
  const ivory = material('#d5e3de'), steel = material('#465b69'), dark = material('#101f2b');
  const gold = material('#b68b53'), glass = material('#174451', '#4ac8d6', 0.5);
  const cyan = material('#c4ffff', '#69e3ff', 3), amber = material('#ffe1af', '#ff793a', 2.4);
  const violet = material('#ddceff', '#aa7bff', 2.4), red = material('#ffb4a4', '#ff4934', 2.4);
  const unitBox = new THREE.BoxGeometry(1, 1, 1); geometries.add(unitBox);
  const template = (role: AircraftRole | 'flagship') => {
    const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
    function add(g: THREE.BufferGeometry, m: THREE.Material) {
      const list = parts.get(m) ?? []; list.push(g); parts.set(m, list);
    }
    function box(x: number, y: number, z: number, w: number, h: number, d: number, m: THREE.Material) {
      add(unitBox.clone().scale(w, h, d).translate(x, -y, z), m);
    }
    function plate(points: readonly number[], z: number, depth: number, m: THREE.Material) {
      const path = new THREE.Shape(); path.moveTo(points[0]!, -points[1]!);
      for (let i = 2; i < points.length; i += 2) path.lineTo(points[i]!, -points[i + 1]!);
      path.closePath();
      const g = new THREE.ExtrudeGeometry(path, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1,
        bevelSize: Math.min(1.2, depth * 0.3), bevelThickness: 0.7, curveSegments: 3 });
      g.translate(0, 0, z); add(g, m);
    }
    function ridge(points: readonly number[], center: readonly [number, number, number], edgeZ: number, m: THREE.Material) {
      const positions: number[] = [];
      for (let i = 0; i < points.length; i += 2) {
        const j = (i + 2) % points.length;
        positions.push(center[0], -center[1], center[2], points[j]!, -points[j + 1]!, edgeZ, points[i]!, -points[i + 1]!, edgeZ);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3 * 2), 2));
      g.computeVertexNormals(); add(g, m);
    }
    const glow = role === 'player' ? cyan : role === 'swoop' ? violet : role === 'interceptor' ? red : amber;
    const shell = role === 'player' ? ivory : steel;
    const engines: { x: number; y: number; width: number; length: number }[] = [];
    if (role === 'flagship') {
      plate([-166, 9, -151, -25, -58, -51, -22, -79, 22, -79, 58, -51, 151, -25, 166, 9,
        113, 35, 43, 17, 25, 66, -25, 66, -43, 17, -113, 35], 0, 10, dark);
      for (const s of [-1, 1]) {
        plate([s * 39, -40, s * 145, -20, s * 157, 4, s * 109, 24, s * 42, 8], 10, 9, steel);
        // Mirrored plates keep their winding so both raised armor ridges face the camera.
        const wing = [39, -40, 145, -20, 157, 4, 109, 24, 42, 8];
        const mirrored = s === 1 ? wing : Array.from({ length: wing.length / 2 }, (_, i) =>
          [-wing[wing.length - 2 - i * 2]!, wing[wing.length - 1 - i * 2]!]).flat();
        ridge(mirrored, [s * 91, -4, 29], 20, steel);
        plate([s * 47, -35, s * 131, -17, s * 141, -6, s * 57, -20], 21, 3, ivory);
        for (let i = 0; i < 8; i++) box(s * (50 + i * 12), -13 + i * 2, 24, 2, 18, 2, dark);
        box(s * 138, 10, 24, 16, 3, 2, gold);
        for (let i = 0; i < 4; i++) box(s * (115 + i * 9), 4, 25, 3, 10, 2, amber);
        // Engine housings are articulated separately to follow the simulation's weak points.
        engines.push({ x: s * 138, y: -24, width: 8, length: 35 });
      }
      plate([-37, -36, -16, -65, 16, -65, 37, -36, 25, 30, 0, 57, -25, 30], 13, 12, steel);
      box(0, -33, 31, 14, 24, 6, glass);
      for (const s of [-1, 1]) box(s * 26, -19, 28, 3, 34, 2, gold);
    } else {
      const span = role === 'swoop' ? 37 : role === 'interceptor' ? 20 : role === 'crossing' ? 31 : 27;
      const nose = role === 'interceptor' ? -38 : -32;
      // Different silhouettes carry enemy roles without relying on color.
      const wingY = role === 'crossing' ? -14 : role === 'swoop' ? 2 : 8;
      plate([-span, 22, -span + 3, wingY, -8, -12, 0, nose, 8, -12, span - 3, wingY,
        span, 22, 10, 14, 5, 25, -5, 25, -10, 14], 0, 4, dark);
      for (const s of [-1, 1]) {
        plate([s * 7, -10, s * (span - 5), wingY + 3, s * (span - 2), 17, s * 8, 9], 4, 3, shell);
        box(s * (span - 7), 10, 9, 3, 14, 2, gold);
        add(new THREE.CylinderGeometry(4, 5, 22, 10).translate(s * 14, -17, 6), steel);
        box(s * 14, 28, 8, 5, 3, 4, glow);
        box(s * (span - 3), 0, 7, 2, 13, 3, dark);
        engines.push({ x: s * 14, y: 29, width: 4, length: role === 'interceptor' ? 29 : 21 });
      }
      ridge([-7, 17, -7, -14, 0, nose, 7, -14, 7, 17, 0, 24], [0, -2, 18], 6, shell);
      plate([-3.5, -4, 0, -19, 3.5, -4, 2.5, 5, -2.5, 5], 18, 2, glass);
      box(0, 15, 15, 3, 11, 2, gold);
      for (const s of [-1, 1]) {
        box(s * 8, 4, 10, 1, 16, 2, gold);
        for (let n = 0; n < 4; n++) box(s * 13, 5 + n * 3, 11, 5, 1, 1, dark);
        box(s * (span - 5), 16, 10, 2, 3, 2, glow);
      }
      if (role === 'swoop') for (const s of [-1, 1]) {
        box(s * 30, 10, 7, 10, 33, 9, steel); box(s * 30, -8, 10, 5, 4, 3, glow);
      }
      if (role === 'crossing') plate([-30, -11, -18, -20, -9, -14, 9, -14, 18, -20, 30, -11, 0, -5], 4, 3, steel);
    }
    const group = new THREE.Group();
    for (const [m, list] of parts) {
      // Convert to non-indexed geometry so boxes and extruded plates batch together.
      const normalized = list.map(g => g.index ? g.toNonIndexed() : g);
      const merged = mergeGeometries(normalized);
      for (const g of new Set([...list, ...normalized])) g.dispose();
      if (!merged) throw new Error('Could not build foundry geometry.');
      geometries.add(merged); group.add(new THREE.Mesh(merged, m));
    }
    return { group, engines, glow };
  };
  const templates = Object.fromEntries((['player', 'straight', 'crossing', 'swoop', 'interceptor', 'flagship'] as const)
    .map(role => [role, template(role)])) as Record<AircraftRole | 'flagship', ReturnType<typeof template>>;
  const flameGeometry = new THREE.PlaneGeometry(1, 1); geometries.add(flameGeometry);
  const flameMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tint: { value: new THREE.Color('#88eaff') } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform vec3 tint; void main(){
      float taper = max(.02, vUv.y); float x = abs(vUv.x-.5)*2.;
      float a = exp(-x*x*12./(taper*taper)) * pow(vUv.y,.6) * smoothstep(1.,.85,vUv.y);
      gl_FragColor=vec4(tint*2.,a*.85); }` });
  materials.add(flameMaterial);
  return {
    create(role: AircraftRole | 'flagship') {
      const source = templates[role], group = source.group.clone();
      const flames = source.engines.map(engine => {
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.set(engine.x, -engine.y - engine.length / 2, 3);
        flame.scale.set(engine.width * 4, engine.length, 1); group.add(flame);
        return { mesh: flame, length: engine.length, y: flame.position.y };
      });
      return { group, flames };
    },
    dark, steel, ivory, gold, cyan, amber, unitBox,
  };
}
