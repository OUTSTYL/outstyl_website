// The hero's 3D layer: a satin ribbon in the brand gradient, the brand ring
// (the favicon's circle) in glossy pink, and a few floating pearls.
// One WebGL context, paused when the hero is off screen or the tab is hidden.
import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, TorusGeometry, SphereGeometry, CapsuleGeometry,
  MeshPhysicalMaterial, Mesh, Group, Color, PMREMGenerator, DoubleSide, ACESFilmicToneMapping, SRGBColorSpace,
  BufferAttribute, DirectionalLight, AmbientLight,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PINK_1 = new Color('#b5006a');
const PINK_2 = new Color('#ff3d8a');
const BLUSH = new Color('#ffc2da');

export function mountHero(canvas, { reduced = false } = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return; // no WebGL: the CSS glow stays as the hero's ground
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  scene.add(new AmbientLight(0xffffff, 0.35));
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new DirectionalLight(0xff8fbf, 1.2);
  rim.position.set(-6, -2, -4);
  scene.add(rim);

  const world = new Group();
  scene.add(world);

  /* ---- satin ribbon ---- */
  const SEG_X = 260; const SEG_Y = 26;
  const ribbonGeo = new PlaneGeometry(18, 1.9, SEG_X, SEG_Y);
  const base = ribbonGeo.attributes.position.array.slice();
  const colors = new Float32Array((SEG_X + 1) * (SEG_Y + 1) * 3);
  const c = new Color();
  for (let i = 0; i < base.length / 3; i++) {
    const t = (base[i * 3] + 9) / 18; // 0..1 along the ribbon
    if (t < 0.5) c.copy(PINK_1).lerp(PINK_2, t * 2); else c.copy(PINK_2).lerp(BLUSH, (t - 0.5) * 2);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  ribbonGeo.setAttribute('color', new BufferAttribute(colors, 3));
  const ribbonMat = new MeshPhysicalMaterial({
    vertexColors: true, side: DoubleSide, roughness: 0.32, metalness: 0.05,
    clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 1, sheenColor: new Color('#ffd6e8'), sheenRoughness: 0.35,
  });
  const ribbon = new Mesh(ribbonGeo, ribbonMat);
  world.add(ribbon);

  const shapeRibbon = (time) => {
    const p = ribbonGeo.attributes.position.array;
    for (let i = 0; i < base.length; i += 3) {
      const x = base[i]; const y = base[i + 1];
      const u = x / 9; // -1..1
      const twist = u * 2.6 + Math.sin(time * 0.35 + u * 1.7) * 0.9;
      const cy = Math.sin(u * 2.2 + time * 0.45) * 1.6 + Math.cos(u * 3.1 - time * 0.3) * 0.5;
      const cz = Math.cos(u * 1.8 + time * 0.4) * 1.8;
      p[i] = x;
      p[i + 1] = cy + y * Math.cos(twist);
      p[i + 2] = cz + y * Math.sin(twist);
    }
    ribbonGeo.attributes.position.needsUpdate = true;
    ribbonGeo.computeVertexNormals();
  };

  /* ---- brand ring ---- */
  const ringMat = new MeshPhysicalMaterial({ color: PINK_2, roughness: 0.18, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.35, iridescenceIOR: 1.4 });
  const ring = new Mesh(new TorusGeometry(1.15, 0.42, 48, 120), ringMat);
  world.add(ring);

  /* ---- pearls and a soft capsule ---- */
  const pearlMat = new MeshPhysicalMaterial({ color: '#fff1f6', roughness: 0.12, metalness: 0.0, clearcoat: 1, sheen: 1, sheenColor: new Color('#ff9cc5'), iridescence: 0.6 });
  const deepMat = new MeshPhysicalMaterial({ color: PINK_1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
  const chromeMat = new MeshPhysicalMaterial({ color: '#ffd3e4', roughness: 0.08, metalness: 1 });
  const bits = [
    // all on the right half on desktop, so nothing drifts over the copy or its buttons
    { mesh: new Mesh(new SphereGeometry(0.55, 48, 48), pearlMat), pos: [3.6, 2.7, 1], speed: 0.9 },
    { mesh: new Mesh(new SphereGeometry(0.32, 40, 40), deepMat), pos: [2.0, -0.9, 2], speed: 1.3 },
    { mesh: new Mesh(new SphereGeometry(0.22, 32, 32), chromeMat), pos: [5.8, -1.4, 0.5], speed: 1.1 },
    { mesh: new Mesh(new CapsuleGeometry(0.28, 0.9, 12, 32), pearlMat), pos: [8.2, 0.6, -2], speed: 0.7 },
    { mesh: new Mesh(new SphereGeometry(0.4, 40, 40), chromeMat), pos: [7.4, -3.4, -2], speed: 0.8 },
  ];
  bits.forEach((b) => { b.home = b.pos.slice(); b.mesh.position.set(...b.pos); world.add(b.mesh); });

  /* ---- layout per screen shape ---- */
  let ringY = 2.4;
  const layout = () => {
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (innerWidth <= 1080) {
      // stacked: the canvas covers only the phone's area, the phone is centred.
      // the ribbon crosses behind it edge to edge, the ring and pearls frame it.
      const hw = Math.tan((camera.fov * Math.PI) / 360) * 15 * camera.aspect; // half width at z = -1
      const small = w < 600;
      ribbon.position.set(0, -0.6, -3);
      ribbon.rotation.set(0.3, 0, -0.28);
      ribbon.scale.setScalar(1.1);
      ringY = 2.2;
      ring.position.set(hw * 0.62, ringY, -1);
      ring.scale.setScalar(small ? 0.55 : 0.8);
      const spots = [[-0.6, 2.4, 0], [0.7, -2.6, 1], [-0.78, -1.6, 0], [0.82, 0.2, -1.5], [-0.85, 0.9, -2]];
      bits.forEach((b, i) => { b.mesh.visible = !small || i < 3; b.home = [spots[i][0] * hw, spots[i][1], spots[i][2]]; });
    } else {
      ringY = 2.4;
      // desktop: the ribbon sweeps behind the phone on the right half
      // enters at the top centre (behind the nav), leaves at the bottom right: the copy stays clear
      ribbon.position.set(4.6, -0.6, -3.5);
      ribbon.rotation.set(0.25, -0.15, -0.95);
      ribbon.scale.setScalar(1);
      ring.position.set(6.6, 2.4, -2);
      ring.scale.setScalar(1);
      bits.forEach((b) => { b.mesh.visible = true; b.home = b.pos.slice(); });
    }
  };
  layout();
  new ResizeObserver(layout).observe(canvas);

  /* ---- pointer + scroll ---- */
  const target = { x: 0, y: 0 }; const cur = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { target.x = e.clientX / innerWidth - 0.5; target.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  let scrollP = 0;
  addEventListener('scroll', () => { scrollP = Math.min(1, scrollY / innerHeight); }, { passive: true });

  /* ---- loop ---- */
  let t = 0; let last = 0; // own clock, so a pause never makes the ribbon jump
  let running = false; let visible = true;
  const frame = () => {
    if (!running) return;
    const now = performance.now(); t += Math.min(0.05, (now - last) / 1000); last = now;
    cur.x += (target.x - cur.x) * 0.04;
    cur.y += (target.y - cur.y) * 0.04;
    shapeRibbon(t);
    ring.rotation.set(0.9 + Math.sin(t * 0.4) * 0.25 + cur.y * 0.6, t * 0.35 + cur.x * 0.8, 0.3);
    ring.position.y += (ringY + Math.sin(t * 0.8) * 0.25 - ring.position.y) * 0.1;
    bits.forEach((b, i) => {
      const [hx, hy, hz] = b.home;
      b.mesh.position.set(
        hx + Math.sin(t * 0.5 * b.speed + i) * 0.3 - cur.x * (1 + i * 0.3),
        hy + Math.cos(t * 0.6 * b.speed + i * 2) * 0.35 + cur.y * (0.8 + i * 0.2),
        hz,
      );
      b.mesh.rotation.y = t * 0.4 * b.speed;
    });
    world.rotation.y = cur.x * 0.18;
    world.rotation.x = cur.y * 0.1 + scrollP * 0.35;
    world.position.y = scrollP * 2.2;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  const start = () => { if (running || !visible || document.hidden || reduced) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  const stop = () => { running = false; };

  if (reduced) {
    // still frame, no motion
    shapeRibbon(1.2);
    ring.rotation.set(1, 0.6, 0.3);
    renderer.render(scene, camera);
  } else {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  }
  requestAnimationFrame(() => canvas.classList.add('is-on'));
}
