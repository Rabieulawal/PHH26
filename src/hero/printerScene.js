import * as THREE from 'three';

const CENTER_Y = 2.45;
const FRAME = {
  halfWidth: 2.65,
  halfDepth: 1.72,
  bottom: 0.28,
  top: 4.72,
};

const COLORS = {
  blueprint: '#57a9c5',
  structure: '#53d8f1',
  motion: '#8cecff',
  detail: '#d1f7ff',
  accent: '#ffc27a',
  guide: '#2b6b83',
};

const smoothstep = (a, b, value) => {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const v = (x, y, z) => new THREE.Vector3(x, y, z);

function createLayer(parent, {
  start,
  end,
  color,
  opacity = 0.86,
  mode = 'reveal',
  glow = false,
}) {
  const group = new THREE.Group();
  const positions = [];
  const tubeMaterials = [];
  const lineMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const coreMaterial = glow
    ? new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    })
    : null;
  const glowMaterial = glow
    ? new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    })
    : null;
  if (coreMaterial) tubeMaterials.push(coreMaterial, glowMaterial);

  const toLocal = (point) => [point.x, point.y - CENTER_Y, point.z];

  const line = (a, b) => {
    positions.push(...toLocal(a), ...toLocal(b));
  };

  const path = (points, closed = false) => {
    for (let i = 0; i < points.length - 1; i += 1) line(points[i], points[i + 1]);
    if (closed && points.length > 2) line(points[points.length - 1], points[0]);
  };

  const rail = (a, b, radius = 0.012) => {
    line(a, b);
    if (!coreMaterial) return;

    const delta = new THREE.Vector3().subVectors(b, a);
    const length = delta.length();
    const midpoint = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const makeRod = (rodRadius, material, segments) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(rodRadius, rodRadius, length, segments, 1, true),
        material,
      );
      mesh.position.set(midpoint.x, midpoint.y - CENTER_Y, midpoint.z);
      mesh.quaternion.setFromUnitVectors(v(0, 1, 0), delta.normalize());
      group.add(mesh);
    };

    makeRod(radius * 2.6, glowMaterial, 5);
    makeRod(radius, coreMaterial, 6);
  };

  const finalize = () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    group.add(new THREE.LineSegments(geometry, lineMaterial));
    parent.add(group);
  };

  const update = (progress) => {
    const t = smoothstep(start, end, progress);
    const visible = mode === 'fade-out' ? 1 - t : t;
    lineMaterial.opacity = opacity * visible;
    if (coreMaterial) {
      coreMaterial.opacity = opacity * 0.74 * visible;
      glowMaterial.opacity = opacity * 0.105 * visible;
    }

    if (mode === 'reveal') {
      group.position.y = (1 - t) * 0.26;
      group.scale.setScalar(0.965 + t * 0.035);
    }
  };

  return { line, path, rail, finalize, update };
}

function addRect(layer, x, y, z, width, height, depth, rail = false) {
  const x1 = x - width / 2;
  const x2 = x + width / 2;
  const y1 = y - height / 2;
  const y2 = y + height / 2;
  const z1 = z - depth / 2;
  const z2 = z + depth / 2;
  const p = [
    v(x1, y1, z1), v(x2, y1, z1), v(x2, y2, z1), v(x1, y2, z1),
    v(x1, y1, z2), v(x2, y1, z2), v(x2, y2, z2), v(x1, y2, z2),
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  edges.forEach(([a, b], index) => {
    if (rail && index < 8) layer.rail(p[a], p[b], 0.009);
    else layer.line(p[a], p[b]);
  });
}

function addCircleXY(layer, x, y, z, radius, segments = 36) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(v(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z));
  }
  layer.path(points, true);
}

function addCircleXZ(layer, x, y, z, radius, segments = 32) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(v(x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius));
  }
  layer.path(points, true);
}

function addCornerMarks(layer, x, y, z, size, depth = 0.025) {
  const left = x - size;
  const right = x + size;
  const low = y - size;
  const high = y + size;
  const front = z + depth;
  layer.path([v(left, low, front), v(left + size * 0.48, low, front)]);
  layer.path([v(left, low, front), v(left, low + size * 0.48, front)]);
  layer.path([v(right, low, front), v(right - size * 0.48, low, front)]);
  layer.path([v(right, low, front), v(right, low + size * 0.48, front)]);
  layer.path([v(left, high, front), v(left + size * 0.48, high, front)]);
  layer.path([v(left, high, front), v(left, high - size * 0.48, front)]);
  layer.path([v(right, high, front), v(right - size * 0.48, high, front)]);
  layer.path([v(right, high, front), v(right, high - size * 0.48, front)]);
}

function buildBlueprint(parent) {
  const blueprint = createLayer(parent, {
    start: 0,
    end: 0.48,
    color: COLORS.blueprint,
    opacity: 0.66,
    mode: 'fade-out',
  });
  const z = 0.06;
  const { halfWidth: w, bottom, top } = FRAME;

  // Front elevation: a measured drawing with a distinct printer silhouette.
  blueprint.path([
    v(-w, bottom, z), v(w, bottom, z), v(w, top, z), v(-w, top, z),
  ], true);
  blueprint.path([v(-2.36, bottom + 0.1, z), v(-2.36, top - 0.13, z)]);
  blueprint.path([v(2.36, bottom + 0.1, z), v(2.36, top - 0.13, z)]);
  blueprint.path([v(-2.38, 0.7, z), v(2.38, 0.7, z)]);
  blueprint.path([v(-2.28, 1.58, z), v(2.28, 1.58, z)]);
  blueprint.path([v(-2.26, 3.35, z), v(2.26, 3.35, z)]);
  blueprint.path([v(-0.42, 2.94, z), v(0.42, 2.94, z), v(0.42, 3.65, z), v(-0.42, 3.65, z)], true);
  blueprint.path([v(-0.22, 2.52, z), v(0.22, 2.52, z), v(0.22, 2.94, z), v(-0.22, 2.94, z)], true);
  blueprint.path([v(0, 2.52, z), v(0, 2.35, z)]);

  // Spool, control panel, bed and filament path are still flat in this view.
  addCircleXY(blueprint, 2.73, 4.02, z, 0.53, 48);
  addCircleXY(blueprint, 2.73, 4.02, z, 0.16, 32);
  blueprint.path([v(2.73, 4.55, z), v(1.7, 4.62, z), v(0.44, 3.62, z)]);
  blueprint.path([v(-2.15, 0.78, z), v(-1.44, 0.78, z), v(-1.44, 1.3, z), v(-2.15, 1.3, z)], true);
  blueprint.path([v(-2.02, 0.98, z), v(-1.58, 0.98, z)]);
  blueprint.path([v(-2.02, 1.1, z), v(-1.73, 1.1, z)]);

  // Dimension leaders and extension ticks make the opening state read as CAD.
  const dimX = 3.12;
  blueprint.path([v(dimX, bottom, z), v(dimX, top, z)]);
  blueprint.path([v(dimX - 0.11, bottom, z), v(dimX + 0.11, bottom, z)]);
  blueprint.path([v(dimX - 0.11, top, z), v(dimX + 0.11, top, z)]);
  blueprint.path([v(-w, 0.04, z), v(w, 0.04, z)]);
  blueprint.path([v(-w, -0.08, z), v(-w, 0.16, z)]);
  blueprint.path([v(w, -0.08, z), v(w, 0.16, z)]);
  for (let i = 0; i <= 8; i += 1) {
    const y = 0.44 + i * 0.49;
    blueprint.path([v(-3.0, y, z), v(-2.88, y, z)]);
  }
  addCornerMarks(blueprint, 0, 2.55, 0.045, 3.18, 0);
  blueprint.finalize();
  return blueprint;
}

function buildPrinter(parent) {
  const blueprint = buildBlueprint(parent);

  const base = createLayer(parent, {
    start: 0.16, end: 0.36, color: COLORS.structure, opacity: 0.86, glow: true,
  });
  const frame = createLayer(parent, {
    start: 0.26, end: 0.53, color: COLORS.structure, opacity: 0.8, glow: true,
  });
  const motion = createLayer(parent, {
    start: 0.4, end: 0.69, color: COLORS.motion, opacity: 0.86, glow: true,
  });
  const bed = createLayer(parent, {
    start: 0.47, end: 0.74, color: COLORS.detail, opacity: 0.76, glow: true,
  });
  const extruder = createLayer(parent, {
    start: 0.58, end: 0.84, color: COLORS.motion, opacity: 0.92, glow: true,
  });
  const details = createLayer(parent, {
    start: 0.7, end: 0.98, color: COLORS.detail, opacity: 0.74,
  });
  const accent = createLayer(parent, {
    start: 0.68, end: 0.94, color: COLORS.accent, opacity: 0.9, glow: true,
  });
  const guide = createLayer(parent, {
    start: 0.22, end: 0.64, color: COLORS.guide, opacity: 0.6,
  });

  const { halfWidth: w, halfDepth: d, bottom, top } = FRAME;

  // Isometric construction guides remain barely visible once the machine is built.
  guide.path([v(-w - 0.42, 0.02, -d - 0.25), v(w + 0.42, 0.02, -d - 0.25)]);
  guide.path([v(-w - 0.42, 0.02, d + 0.24), v(w + 0.42, 0.02, d + 0.24)]);
  guide.path([v(-w - 0.42, 0.02, -d - 0.25), v(-w - 0.42, 0.02, d + 0.24)]);
  guide.path([v(w + 0.42, 0.02, -d - 0.25), v(w + 0.42, 0.02, d + 0.24)]);
  addCircleXZ(guide, 0, 0.03, 0, 0.14, 24);
  addCircleXZ(guide, 0, 0.03, 0, 0.33, 24);
  for (let x = -2.8; x <= 2.8; x += 0.4) {
    guide.path([v(x, 0.025, d + 0.24), v(x, 0.025, d + 0.31)]);
  }

  // The lower chassis: nested rails, four feet, and squared-off motor housings.
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const x = sx * 2.52;
      const z = sz * 1.6;
      addRect(base, x, 0.17, z, 0.34, 0.24, 0.34);
      addRect(base, x, 0.35, z, 0.25, 0.18, 0.25);
      addCornerMarks(base, x, 0.35, z, 0.08, sz * 0.2);
    });
  });
  addRect(base, 0, 0.39, 0, 5.36, 0.42, 3.52, true);
  addRect(base, 0, 0.2, 0, 5.08, 0.16, 3.28, true);
  [-1, 1].forEach((sx) => {
    base.rail(v(sx * 2.25, 0.54, -1.48), v(sx * 2.25, 0.54, 1.48), 0.013);
  });
  base.path([v(-2.15, 0.62, 1.78), v(2.15, 0.62, 1.78)]);
  base.path([v(-2.15, 0.62, -1.78), v(2.15, 0.62, -1.78)]);

  // Four open uprights and the upper torsion frame define a clear cube silhouette.
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const x = sx * 2.49;
      const z = sz * 1.59;
      addRect(frame, x, (bottom + top) / 2, z, 0.16, top - bottom - 0.22, 0.16, true);
      addRect(frame, x, 0.75, z, 0.28, 0.14, 0.28);
      addRect(frame, x, 4.48, z, 0.28, 0.18, 0.28);
    });
  });
  addRect(frame, 0, 4.62, 0, 5.36, 0.22, 3.5, true);
  addRect(frame, 0, 4.39, 0, 5.14, 0.12, 3.28, true);
  addRect(frame, 0, 0.72, 0, 5.14, 0.12, 3.28, true);
  [-1, 1].forEach((sx) => {
    frame.line(v(sx * 2.36, 0.83, -1.28), v(sx * 2.36, 4.37, -1.28));
    frame.line(v(sx * 2.36, 0.83, 1.28), v(sx * 2.36, 4.37, 1.28));
  });

  // The gantry, belt path, paired Z screws and linear guides explain the motion.
  addRect(motion, 0, 3.27, 0.42, 4.72, 0.28, 0.28, true);
  motion.rail(v(-2.1, 3.03, 0.66), v(2.1, 3.03, 0.66), 0.012);
  motion.rail(v(-2.1, 3.49, 0.66), v(2.1, 3.49, 0.66), 0.012);
  [-1, 1].forEach((sx) => {
    const x = sx * 2.25;
    motion.rail(v(x, 0.86, -0.92), v(x, 3.22, -0.92), 0.01);
    motion.rail(v(x, 0.86, 0.92), v(x, 3.22, 0.92), 0.01);
    addRect(motion, x, 3.29, 0.42, 0.48, 0.44, 0.42);
    addCircleXZ(motion, x, 0.97, 0.97, 0.12, 20);
    addCircleXZ(motion, x, 3.0, 0.97, 0.12, 20);
  });
  const beltZ = -0.22;
  motion.path([
    v(-2.18, 3.72, beltZ), v(2.18, 3.72, beltZ),
    v(2.33, 3.57, beltZ), v(2.33, 3.18, beltZ),
    v(-2.33, 3.18, beltZ), v(-2.33, 3.57, beltZ),
  ], true);
  motion.path([v(-2.36, 4.32, -1.25), v(2.36, 4.32, -1.25)]);
  motion.path([v(-2.36, 4.32, 1.25), v(2.36, 4.32, 1.25)]);

  // Build plate: a fine, deliberate surface grid with corner registration marks.
  addRect(bed, 0, 1.43, 0.22, 4.3, 0.14, 2.76, true);
  addRect(bed, 0, 1.31, 0.22, 4.0, 0.1, 2.48);
  for (let x = -1.8; x <= 1.81; x += 0.45) {
    bed.path([v(x, 1.512, -1.0), v(x, 1.512, 1.44)]);
  }
  for (let z = -1.0; z <= 1.45; z += 0.41) {
    bed.path([v(-1.8, 1.512, z), v(1.8, 1.512, z)]);
  }
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      addCircleXZ(bed, sx * 1.88, 1.53, 0.22 + sz * 1.16, 0.075, 16);
      bed.path([
        v(sx * 1.88 - 0.11, 1.53, 0.22 + sz * 1.16),
        v(sx * 1.88 + 0.11, 1.53, 0.22 + sz * 1.16),
      ]);
    });
  });
  bed.rail(v(-2.15, 1.15, -1.2), v(-2.15, 1.15, 1.62), 0.012);
  bed.rail(v(2.15, 1.15, -1.2), v(2.15, 1.15, 1.62), 0.012);

  // Extruder carriage, fan guard, heater block, and tapered hot end.
  addRect(extruder, 0.32, 3.2, 0.9, 0.66, 0.72, 0.4);
  addRect(extruder, 0.32, 2.76, 0.9, 0.46, 0.28, 0.34);
  addCircleXY(extruder, 0.32, 3.23, 1.112, 0.23, 40);
  addCircleXY(extruder, 0.32, 3.23, 1.115, 0.13, 32);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    extruder.path([
      v(0.32 + Math.cos(angle) * 0.13, 3.23 + Math.sin(angle) * 0.13, 1.116),
      v(0.32 + Math.cos(angle) * 0.22, 3.23 + Math.sin(angle) * 0.22, 1.116),
    ]);
  }
  addRect(extruder, 0.32, 2.68, 0.9, 0.32, 0.2, 0.26);
  addCircleXY(extruder, 0.32, 2.6, 0.9, 0.11, 20);
  extruder.path([v(0.17, 2.58, 0.9), v(0.32, 2.37, 0.9), v(0.47, 2.58, 0.9)]);
  extruder.path([v(0.17, 2.58, 0.9), v(0.47, 2.58, 0.9)]);
  extruder.path([v(0.32, 2.37, 0.9), v(0.32, 2.28, 0.9)]);
  extruder.path([v(-0.09, 3.43, 0.96), v(-0.35, 3.58, 0.96), v(-0.64, 3.58, 0.96)]);
  extruder.path([v(-0.64, 3.58, 0.96), v(-0.82, 3.42, 0.96), v(-0.82, 3.14, 0.96)]);
  addRect(extruder, -0.98, 3.28, 0.96, 0.2, 0.4, 0.2);

  // Filament spool on an elevated rear bracket, drawn as nested, true circles.
  const spoolX = 2.88;
  const spoolY = 4.03;
  const spoolFront = -1.37;
  [spoolFront, spoolFront - 0.34].forEach((z) => {
    addCircleXY(details, spoolX, spoolY, z, 0.57, 56);
    addCircleXY(details, spoolX, spoolY, z, 0.48, 48);
    addCircleXY(details, spoolX, spoolY, z, 0.15, 32);
  });
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    details.path([
      v(spoolX + Math.cos(angle) * 0.16, spoolY + Math.sin(angle) * 0.16, spoolFront),
      v(spoolX + Math.cos(angle) * 0.46, spoolY + Math.sin(angle) * 0.46, spoolFront),
    ]);
  }
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const x = spoolX + Math.cos(angle) * 0.57;
    const y = spoolY + Math.sin(angle) * 0.57;
    details.path([v(x, y, spoolFront), v(x, y, spoolFront - 0.34)]);
  }
  addRect(details, spoolX, 4.64, -1.62, 0.34, 0.22, 0.34);
  details.path([v(2.7, 4.53, -1.62), v(2.7, 4.38, -1.2)]);
  details.path([v(3.06, 4.53, -1.62), v(3.06, 4.38, -1.2)]);

  // Front control display and the quiet mechanical annotations.
  addRect(details, -1.84, 0.94, 1.79, 0.78, 0.51, 0.08);
  addRect(details, -1.84, 0.94, 1.844, 0.62, 0.35, 0.025);
  details.path([v(-2.1, 1.03, 1.86), v(-1.88, 1.03, 1.86), v(-1.76, 0.91, 1.86), v(-1.58, 0.91, 1.86)]);
  details.path([v(-2.1, 0.86, 1.86), v(-1.93, 0.86, 1.86)]);
  addCircleXY(details, -1.29, 0.92, 1.82, 0.055, 16);
  addCircleXY(details, -1.1, 0.92, 1.82, 0.055, 16);

  // The warm filament line is the one deliberate color accent.
  accent.path([
    v(2.88, 4.58, spoolFront),
    v(2.24, 4.78, -0.78),
    v(1.62, 4.68, 0.05),
    v(0.82, 4.17, 0.58),
    v(0.52, 3.58, 0.88),
  ]);
  accent.path([v(-2.34, 4.79, -1.12), v(2.34, 4.79, -1.12)]);
  addCircleXY(accent, 0.52, 3.58, 0.9, 0.055, 16);
  addCircleXY(accent, 2.88, 4.58, spoolFront, 0.055, 16);

  // Corner targets and small fastener rings finish the drafting language.
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const x = sx * 2.49;
      const z = sz * 1.59;
      addCircleXZ(details, x, 0.85, z, 0.055, 16);
      addCircleXZ(details, x, 4.34, z, 0.055, 16);
    });
  });
  details.path([v(-3.14, 0.25, 0.15), v(-3.14, 4.79, 0.15)]);
  details.path([v(-3.22, 0.25, 0.15), v(-3.06, 0.25, 0.15)]);
  details.path([v(-3.22, 4.79, 0.15), v(-3.06, 4.79, 0.15)]);
  details.path([v(-2.66, 0.02, 2.06), v(2.66, 0.02, 2.06)]);
  details.path([v(-2.66, -0.07, 2.06), v(-2.66, 0.11, 2.06)]);
  details.path([v(2.66, -0.07, 2.06), v(2.66, 0.11, 2.06)]);

  [base, frame, motion, bed, extruder, details, accent, guide]
    .forEach((layer) => layer.finalize());

  return { layers: [blueprint, base, frame, motion, bed, extruder, details, accent, guide] };
}

export function initPrinterScene(canvas, container) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return { setProgress: () => {} };
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = () => window.innerWidth < 760;
  const scene = new THREE.Scene();
  const backgroundScene = new THREE.Scene();
  const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const backgroundMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      varying vec2 vUv;

      void main() {
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        float x = (vUv.x - 0.5) * aspect;
        float y = vUv.y - 0.5;
        float sweepY = 0.12 * sin(uTime * 0.085 + x * 1.7)
          + 0.035 * sin(uTime * 0.06 - x * 3.2);
        float distanceFromSweep = y - sweepY;
        float beam = exp(-pow(distanceFromSweep * 150.0, 2.0));
        float spill = exp(-pow(distanceFromSweep * 24.0, 2.0));
        float edgeFade = 1.0 - smoothstep(0.2, 0.72, abs(vUv.x - 0.5));
        float alpha = (beam * 0.075 + spill * 0.012) * edgeFade;
        gl_FragColor = vec4(vec3(0.11, 0.62, 0.78), alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const backgroundPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backgroundMaterial);
  backgroundScene.add(backgroundPlane);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const model = new THREE.Group();
  const { layers } = buildPrinter(model);
  scene.add(model);

  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const pointer = { x: 0, y: 0 };
  const pointerTarget = { x: 0, y: 0 };
  let progress = reduceMotion ? 1 : 0;
  let frame = 0;
  let last = performance.now();
  let elapsed = 0;

  const resize = () => {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const isNarrow = narrow();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isNarrow ? 1.7 : 2));
    renderer.setSize(width, height, false);
    backgroundMaterial.uniforms.uResolution.value.set(width, height);

    camera.aspect = width / height;
    camera.fov = isNarrow ? 42 : 38;
    camera.position.set(0, isNarrow ? 1.7 : 1.55, isNarrow ? 10.4 : 8.7);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    model.scale.setScalar(isNarrow ? 0.68 : 0.9);
  };

  const draw = () => {
    backgroundMaterial.uniforms.uTime.value = elapsed;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
  };

  const update = (value) => {
    progress = THREE.MathUtils.clamp(value, 0, 1);
    const depth = 0.04 + smoothstep(0.08, 0.52, progress) * 0.96;
    model.scale.z = (narrow() ? 0.68 : 0.9) * depth;
    model.rotation.y = -smoothstep(0.1, 0.64, progress) * 0.2 + pointer.x * 0.026;
    model.rotation.x = smoothstep(0.18, 0.75, progress) * 0.025 + pointer.y * 0.018;
    layers.forEach((layer) => layer.update(progress));
  };

  const onPointerMove = (event) => {
    pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1;
  };

  const loop = () => {
    const now = performance.now();
    elapsed += (now - last) / 1000;
    last = now;
    pointer.x += (pointerTarget.x - pointer.x) * 0.035;
    pointer.y += (pointerTarget.y - pointer.y) * 0.035;
    model.rotation.y = -smoothstep(0.1, 0.64, progress) * 0.2 + pointer.x * 0.026;
    model.rotation.x = smoothstep(0.18, 0.75, progress) * 0.025 + pointer.y * 0.018;
    model.position.y = Math.sin(elapsed * 0.42) * 0.012;
    draw();
    frame = requestAnimationFrame(loop);
  };

  const play = () => {
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(loop);
    }
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const onVisibilityChange = () => {
    if (document.hidden) stop();
    else if (!reduceMotion) play();
    else draw();
  };

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !reduceMotion) play();
    else stop();
  }, { threshold: 0 });

  const onResize = () => {
    resize();
    if (reduceMotion) draw();
  };

  resize();
  update(progress);
  observer.observe(container);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);

  if (reduceMotion) {
    update(1);
    draw();
  } else {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    play();
  }

  return {
    setProgress: update,
    destroy() {
      stop();
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      renderer.dispose();
      [scene, backgroundScene].forEach((renderScene) => renderScene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      }));
    },
  };
}
