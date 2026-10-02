import * as THREE from "three";
import { resetCatToHome, setCatVisible } from "./catAsset";
import { setFeederVisible } from "./feeder";
import type { Slide, SlideContext } from "./types";

const FLOOR_Y = -1.2;
const GAP_X = 0.5;
const GAP_Z = 0.62;

export type PartDef = {
  id: string;
  category: string;
  title: string;
  blurb: string;
};

export type PartItem = PartDef & {
  root: THREE.Group;
  center: THREE.Vector3;
  size: THREE.Vector3;
};

export type PartsKit = {
  root: THREE.Group;
  items: PartItem[];
  frame: { center: THREE.Vector3; size: THREE.Vector3 };
};

const M = {
  pcb: new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.55, metalness: 0.1 }),
  pcbDark: new THREE.MeshStandardMaterial({ color: 0x1c3d22, roughness: 0.55, metalness: 0.08 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4, metalness: 0.15 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0xe8e2da, roughness: 0.45, metalness: 0.04 }),
  charcoal: new THREE.MeshStandardMaterial({ color: 0x2b2c34, roughness: 0.45, metalness: 0.1 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.25, metalness: 0.7 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xc5c8ce, roughness: 0.3, metalness: 0.65 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.85 }),
  kibble: new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.8, metalness: 0 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc43a32, roughness: 0.35, metalness: 0.1, emissive: 0x7a1814, emissiveIntensity: 0.35 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x3d6fd4, roughness: 0.4, metalness: 0.08 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xe07a2f, roughness: 0.45, metalness: 0.05 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.35, metalness: 0.04 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.85, metalness: 0 }),
};

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function group(name: string, children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  for (const c of children) g.add(c);
  return g;
}

function pic(): THREE.Group {
  const body = mesh(new THREE.BoxGeometry(0.12, 0.018, 0.05), M.black, 0, 0.02, 0);
  const notch = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 10), M.black, -0.05, 0.02, 0);
  notch.rotation.z = Math.PI / 2;
  const pins: THREE.Object3D[] = [body, notch];
  for (let i = 0; i < 8; i++) {
    const x = -0.048 + i * 0.014;
    pins.push(mesh(new THREE.BoxGeometry(0.006, 0.016, 0.004), M.silver, x, 0.008, 0.03));
    pins.push(mesh(new THREE.BoxGeometry(0.006, 0.016, 0.004), M.silver, x, 0.008, -0.03));
  }
  return group("pic", pins);
}

function breadboard(): THREE.Group {
  const kids: THREE.Object3D[] = [
    mesh(new THREE.BoxGeometry(0.22, 0.016, 0.14), M.white, 0, 0.008, 0),
    mesh(new THREE.BoxGeometry(0.22, 0.003, 0.012), M.red, 0, 0.017, 0.058),
    mesh(new THREE.BoxGeometry(0.22, 0.003, 0.012), M.blue, 0, 0.017, -0.058),
  ];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      kids.push(
        mesh(
          new THREE.BoxGeometry(0.008, 0.004, 0.008),
          M.charcoal,
          -0.08 + c * 0.022,
          0.017,
          -0.028 + r * 0.018
        )
      );
    }
  }
  return group("breadboard", kids);
}

function dupont(): THREE.Group {
  const colors = [0xc43a32, 0x3cbf6e, 0x3d6fd4, 0xe0c14a];
  const kids: THREE.Object3D[] = [];
  colors.forEach((hex, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.05 });
    const y = 0.012 + i * 0.01;
    const z = -0.03 + i * 0.02;
    kids.push(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 8), mat, 0, y, z));
    kids[kids.length - 1].rotation.z = Math.PI / 2;
    kids.push(mesh(new THREE.BoxGeometry(0.018, 0.01, 0.01), M.black, -0.09, y, z));
    kids.push(mesh(new THREE.BoxGeometry(0.018, 0.01, 0.01), M.black, 0.09, y, z));
  });
  return group("dupont", kids);
}

function psu(): THREE.Group {
  return group("psu", [
    mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), M.charcoal, 0, 0.035, 0),
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 10), M.rubber, 0.08, 0.02, 0.02),
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 10), M.gold, 0.13, 0.02, 0.02),
  ]);
}

function gearedMotor(): THREE.Group {
  return group("geared-motor", [
    mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.048, 16), M.black, 0, 0.038, 0),
    mesh(new THREE.BoxGeometry(0.048, 0.038, 0.034), M.charcoal, 0.044, 0.034, 0),
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.022, 10), M.silver, 0.07, 0.034, 0),
    mesh(new THREE.BoxGeometry(0.004, 0.014, 0.004), M.gold, -0.018, 0.024, 0.018),
    mesh(new THREE.BoxGeometry(0.004, 0.014, 0.004), M.gold, -0.018, 0.024, -0.018),
  ]);
}

function endlessScrew(): THREE.Group {
  const points: THREE.Vector3[] = [];
  const turns = 2.2;
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const y = t * 0.12;
    points.push(
      new THREE.Vector3(Math.cos(angle) * 0.02, y, Math.sin(angle) * 0.02)
    );
  }
  const helix = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.0075, 8, false),
    M.orange
  );
  const shaft = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.13, 10), M.silver, 0, 0.065, 0);
  return group("endless-screw", [helix, shaft]);
}

/** VL53-style ToF module (same footprint for bowl and hopper mounts). */
function tofModule(id: string): THREE.Group {
  return group(id, [
    mesh(new THREE.BoxGeometry(0.028, 0.008, 0.018), M.pcbDark, 0, 0.012, 0),
    mesh(new THREE.BoxGeometry(0.012, 0.006, 0.012), M.black, 0, 0.018, 0),
    mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 10), M.silver, 0, 0.022, 0),
    mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), M.gold, -0.012, 0.01, 0.012),
    mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), M.gold, 0.012, 0.01, 0.012),
    mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), M.gold, -0.012, 0.01, -0.012),
    mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), M.gold, 0.012, 0.01, -0.012),
  ]);
}

function foodReservoir(): THREE.Group {
  return group("food-res", [
    mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), M.amber, 0, 0.08, 0),
    mesh(new THREE.BoxGeometry(0.11, 0.01, 0.11), M.charcoal, 0, 0.145, 0),
    mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), M.plastic, 0, 0.015, 0.04),
  ]);
}

function foodBowl(): THREE.Group {
  const kids: THREE.Object3D[] = [
    mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.028, 20), M.plastic, 0, 0.016, 0),
    mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.012, 16), M.kibble, 0, 0.02, 0),
  ];
  return group("food-bowl", kids);
}

function led(mat: THREE.Material, name: string): THREE.Group {
  return group(name, [
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 12), mat, 0, 0.028, 0),
    mesh(new THREE.SphereGeometry(0.012, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, 0.036, 0),
    mesh(new THREE.BoxGeometry(0.003, 0.02, 0.003), M.silver, -0.005, 0.01, 0),
    mesh(new THREE.BoxGeometry(0.003, 0.014, 0.003), M.silver, 0.005, 0.007, 0),
  ]);
}

function resistors(): THREE.Group {
  const kids: THREE.Object3D[] = [];
  const band = [0xc43a32, 0xe0c14a, 0x3d6fd4];
  for (let i = 0; i < 3; i++) {
    const z = -0.03 + i * 0.03;
    kids.push(mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.04, 10), M.plastic, 0, 0.016, z));
    kids[kids.length - 1].rotation.z = Math.PI / 2;
    kids.push(mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 8), new THREE.MeshStandardMaterial({ color: band[i], roughness: 0.5, metalness: 0.1 }), -0.006, 0.016, z));
    kids[kids.length - 1].rotation.z = Math.PI / 2;
    kids.push(mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.08, 6), M.silver, 0, 0.016, z));
    kids[kids.length - 1].rotation.z = Math.PI / 2;
  }
  return group("resistors", kids);
}

function housing(): THREE.Group {
  return group("housing", [
    mesh(new THREE.BoxGeometry(0.16, 0.008, 0.1), M.plastic, 0, 0.02, 0),
    mesh(new THREE.BoxGeometry(0.16, 0.06, 0.008), M.plastic, 0, 0.05, -0.046),
    mesh(new THREE.BoxGeometry(0.008, 0.06, 0.1), M.plastic, -0.076, 0.05, 0),
  ]);
}

const BUILDERS: Record<string, () => THREE.Group> = {
  pic,
  breadboard,
  dupont,
  psu,
  "geared-motor": gearedMotor,
  "endless-screw": endlessScrew,
  "food-res": foodReservoir,
  "food-bowl": foodBowl,
  "tof-bowl": () => tofModule("tof-bowl"),
  "tof-hopper": () => tofModule("tof-hopper"),
  "led-red": () => led(M.red, "led-red"),
  resistors,
  housing,
};

const CATALOG: PartDef[] = [
  { id: "pic", category: "Control", title: "PIC", blurb: "The brain behind the machine." },
  { id: "breadboard", category: "Control", title: "Breadboard", blurb: "To build the circuit." },
  { id: "dupont", category: "Control", title: "Dupont wires", blurb: "To connect the parts." },
  { id: "psu", category: "Control", title: "Power supply", blurb: "To power the feeder." },
  { id: "food-res", category: "Food", title: "Hopper", blurb: "To store the food." },
  {
    id: "endless-screw",
    category: "Food",
    title: "Endless screw (3D printed)",
    blurb: "To push the food to the bowl.",
  },
  {
    id: "geared-motor",
    category: "Food",
    title: "Geared motor",
    blurb: "To turn the endless screw.",
  },
  { id: "food-bowl", category: "Food", title: "Food bowl", blurb: "Where the food lands." },
  {
    id: "tof-hopper",
    category: "Food",
    title: "Distance sensor (hopper)",
    blurb: "To check if the hopper is low.",
  },
  {
    id: "tof-bowl",
    category: "Food",
    title: "Distance sensor (bowl)",
    blurb: "To check if the bowl is full.",
  },
  { id: "led-red", category: "Display", title: "Red LED", blurb: "Warns when the hopper is low." },
  { id: "resistors", category: "Misc", title: "Resistors", blurb: "For the circuit." },
  { id: "housing", category: "Misc", title: "Enclosure", blurb: "To hold everything together." },
];

function sitOnFloor(model: THREE.Group): void {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.position.y -= box.min.y;
}

export function createPartsKit(): PartsKit {
  const root = new THREE.Group();
  root.name = "parts-kit";

  const byCat = new Map<string, PartItem[]>();
  const items: PartItem[] = [];

  for (const def of CATALOG) {
    const build = BUILDERS[def.id];
    const model = build();
    sitOnFloor(model);
    const item: PartItem = {
      ...def,
      root: model,
      center: new THREE.Vector3(),
      size: new THREE.Vector3(),
    };
    items.push(item);
    const list = byCat.get(def.category) ?? [];
    list.push(item);
    byCat.set(def.category, list);
    root.add(model);
  }

  const categories = [...byCat.keys()];
  const rowCount = categories.length;
  const startZ = -((rowCount - 1) * GAP_Z) / 2;

  categories.forEach((cat, row) => {
    const rowItems = byCat.get(cat)!;
    const width = (rowItems.length - 1) * GAP_X;
    rowItems.forEach((item, i) => {
      item.root.position.x = -width / 2 + i * GAP_X;
      item.root.position.z = startZ + row * GAP_Z;
      item.root.position.y = FLOOR_Y;
      item.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(item.root);
      box.getCenter(item.center);
      box.getSize(item.size);
    });
  });

  root.updateMatrixWorld(true);
  const all = new THREE.Box3().setFromObject(root);
  root.visible = false;

  return {
    root,
    items,
    frame: {
      center: all.getCenter(new THREE.Vector3()),
      size: all.getSize(new THREE.Vector3()),
    },
  };
}

export function mountParts(kit: PartsKit, scene: THREE.Scene): void {
  if (!kit.root.parent) scene.add(kit.root);
}

export function setPartsVisible(kit: PartsKit, visible: boolean): void {
  kit.root.visible = visible;
}

export function getPartsOverviewCamera(kit: PartsKit): {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
} {
  const { center, size } = kit.frame;
  const span = Math.max(size.x, size.z);
  return {
    position: new THREE.Vector3(center.x, center.y + span * 0.55, center.z + span * 0.85),
    lookAt: center.clone(),
  };
}

export function getPartCamera(item: PartItem): {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
} {
  const span = Math.max(item.size.x, item.size.y, item.size.z, 0.08);
  return {
    position: new THREE.Vector3(
      item.center.x + span * 1.35,
      item.center.y + span * 0.95,
      item.center.z + span * 1.7
    ),
    lookAt: item.center.clone(),
  };
}

function hideStory(ctx: SlideContext): void {
  if (ctx.cat) {
    setCatVisible(ctx.cat, false);
    resetCatToHome(ctx.cat);
  }
  if (ctx.feeder) setFeederVisible(ctx.feeder, false);
}

export function createPartSlides(): Slide[] {
  const empty = {
    position: new THREE.Vector3(0, -0.4, 1.4),
    lookAt: new THREE.Vector3(0, -0.9, 0),
  };

  const overview: Slide = {
    id: "bom-overview",
    overlayHtml: `
      <h1>Bill of materials</h1>
      <p>The full kit, grouped by function. Press right arrow for one part at a time.</p>
    `,
    camera: (ctx) =>
      ctx.parts ? getPartsOverviewCamera(ctx.parts) : empty,
    onEnter(ctx) {
      hideStory(ctx);
      if (!ctx.parts) return;
      mountParts(ctx.parts, ctx.scene);
      setPartsVisible(ctx.parts, true);
      ctx.callout?.setTarget(null);
    },
  };

  const details: Slide[] = CATALOG.map((def) => ({
    id: `part-${def.id}`,
    overlayHtml: `
      <h1 data-callout-from>${def.title}</h1>
      <p>${def.blurb}</p>
    `,
    camera: (ctx) => {
      const item = ctx.parts?.items.find((p) => p.id === def.id);
      return item ? getPartCamera(item) : empty;
    },
    onEnter(ctx) {
      hideStory(ctx);
      if (!ctx.parts) return;
      mountParts(ctx.parts, ctx.scene);
      setPartsVisible(ctx.parts, true);
      const item = ctx.parts.items.find((p) => p.id === def.id);
      ctx.callout?.setTarget(item ? item.center : null);
    },
    onLeave(ctx) {
      ctx.callout?.setTarget(null);
    },
  }));

  return [overview, ...details];
}
