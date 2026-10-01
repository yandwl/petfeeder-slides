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
  water: new THREE.MeshStandardMaterial({ color: 0x6ec8e6, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.5 }),
  waterFill: new THREE.MeshStandardMaterial({ color: 0x4aa8d4, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.7 }),
  kibble: new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.8, metalness: 0 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc43a32, roughness: 0.35, metalness: 0.1, emissive: 0x7a1814, emissiveIntensity: 0.35 }),
  green: new THREE.MeshStandardMaterial({ color: 0x3cbf6e, roughness: 0.35, metalness: 0.1, emissive: 0x145c2e, emissiveIntensity: 0.35 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x3d6fd4, roughness: 0.4, metalness: 0.08 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xe07a2f, roughness: 0.45, metalness: 0.05 }),
  lcd: new THREE.MeshStandardMaterial({ color: 0x6fd36a, roughness: 0.2, metalness: 0.05, emissive: 0x1d4a1a, emissiveIntensity: 0.4 }),
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

function programmer(): THREE.Group {
  return group("programmer", [
    mesh(new THREE.BoxGeometry(0.16, 0.03, 0.07), M.blue, 0, 0.025, 0),
    mesh(new THREE.BoxGeometry(0.04, 0.012, 0.03), M.silver, -0.095, 0.02, 0),
    mesh(new THREE.BoxGeometry(0.05, 0.014, 0.028), M.charcoal, 0.07, 0.028, 0),
    mesh(new THREE.BoxGeometry(0.03, 0.006, 0.02), M.gold, 0.1, 0.02, 0),
  ]);
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

function pir(): THREE.Group {
  return group("pir", [
    mesh(new THREE.BoxGeometry(0.1, 0.012, 0.07), M.pcb, 0, 0.016, 0),
    mesh(new THREE.SphereGeometry(0.028, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.white, 0, 0.022, 0),
    mesh(new THREE.BoxGeometry(0.008, 0.02, 0.008), M.gold, -0.02, 0.006, 0.04),
    mesh(new THREE.BoxGeometry(0.008, 0.02, 0.008), M.gold, 0, 0.006, 0.04),
    mesh(new THREE.BoxGeometry(0.008, 0.02, 0.008), M.gold, 0.02, 0.006, 0.04),
  ]);
}

function servo(): THREE.Group {
  return group("servo", [
    mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), M.blue, 0, 0.03, 0),
    mesh(new THREE.BoxGeometry(0.11, 0.006, 0.04), M.blue, 0, 0.038, 0),
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), M.silver, 0.02, 0.06, 0),
    mesh(new THREE.BoxGeometry(0.05, 0.006, 0.012), M.white, 0.02, 0.072, 0),
  ]);
}

function floatSensor(accent: THREE.Material, name: string): THREE.Group {
  return group(name, [
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 12), accent, 0, 0.035, 0),
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), M.silver, 0, 0.08, 0),
    mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 8), M.rubber, 0.03, 0.1, 0),
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

function dosingWheel(): THREE.Group {
  const kids: THREE.Object3D[] = [
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.018, 20), M.orange, 0, 0.02, 0),
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.03, 10), M.silver, 0, 0.03, 0),
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    kids.push(
      mesh(new THREE.BoxGeometry(0.028, 0.02, 0.02), M.charcoal, Math.cos(a) * 0.032, 0.02, Math.sin(a) * 0.032)
    );
  }
  return group("dosing-wheel", kids);
}

function pump(): THREE.Group {
  return group("pump", [
    mesh(new THREE.BoxGeometry(0.08, 0.05, 0.06), M.black, 0, 0.035, 0),
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 10), M.silver, 0.05, 0.045, 0),
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 10), M.silver, -0.05, 0.045, 0),
    mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), M.red, 0.02, 0.01, 0.04),
    mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), M.black, -0.02, 0.01, 0.04),
  ]);
}

function mosfet(): THREE.Group {
  return group("mosfet", [
    mesh(new THREE.BoxGeometry(0.08, 0.01, 0.05), M.pcb, 0, 0.012, 0),
    mesh(new THREE.BoxGeometry(0.028, 0.022, 0.008), M.black, 0, 0.028, 0),
    mesh(new THREE.BoxGeometry(0.02, 0.028, 0.002), M.silver, 0, 0.04, -0.008),
    mesh(new THREE.BoxGeometry(0.004, 0.02, 0.004), M.silver, -0.01, 0.006, 0.02),
    mesh(new THREE.BoxGeometry(0.004, 0.02, 0.004), M.silver, 0, 0.006, 0.02),
    mesh(new THREE.BoxGeometry(0.004, 0.02, 0.004), M.silver, 0.01, 0.006, 0.02),
  ]);
}

function waterReservoir(): THREE.Group {
  return group("water-res", [
    mesh(new THREE.BoxGeometry(0.1, 0.13, 0.1), M.water, 0, 0.075, 0),
    mesh(new THREE.BoxGeometry(0.086, 0.07, 0.086), M.waterFill, 0, 0.05, 0),
    mesh(new THREE.BoxGeometry(0.11, 0.01, 0.11), M.charcoal, 0, 0.145, 0),
  ]);
}

function hose(): THREE.Group {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.08, 0.02, 0),
    new THREE.Vector3(-0.02, 0.06, 0.02),
    new THREE.Vector3(0.04, 0.03, -0.02),
    new THREE.Vector3(0.09, 0.05, 0),
  ]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.008, 8, false), M.rubber);
  return group("hose", [tube]);
}

function waterBowl(): THREE.Group {
  return group("water-bowl", [
    mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.028, 20), M.plastic, 0, 0.016, 0),
    mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.012, 16), M.waterFill, 0, 0.02, 0),
  ]);
}

function led(mat: THREE.Material, name: string): THREE.Group {
  return group(name, [
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 12), mat, 0, 0.028, 0),
    mesh(new THREE.SphereGeometry(0.012, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, 0.036, 0),
    mesh(new THREE.BoxGeometry(0.003, 0.02, 0.003), M.silver, -0.005, 0.01, 0),
    mesh(new THREE.BoxGeometry(0.003, 0.014, 0.003), M.silver, 0.005, 0.007, 0),
  ]);
}

function lcd(): THREE.Group {
  return group("lcd", [
    mesh(new THREE.BoxGeometry(0.16, 0.02, 0.07), M.pcbDark, 0, 0.016, 0),
    mesh(new THREE.BoxGeometry(0.13, 0.008, 0.045), M.charcoal, 0, 0.028, 0),
    mesh(new THREE.BoxGeometry(0.11, 0.004, 0.032), M.lcd, 0, 0.033, 0),
    mesh(new THREE.BoxGeometry(0.12, 0.01, 0.012), M.gold, 0, 0.01, 0.045),
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

function diodes(): THREE.Group {
  return group("diodes", [
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.036, 10), M.black, 0, 0.016, 0),
    mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.006, 10), M.orange, 0.01, 0.016, 0),
    mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.08, 6), M.silver, 0, 0.016, 0),
  ].map((m, i) => {
    if (i < 3) m.rotation.z = Math.PI / 2;
    return m;
  }));
}

function button(): THREE.Group {
  return group("button", [
    mesh(new THREE.BoxGeometry(0.04, 0.01, 0.04), M.charcoal, 0, 0.01, 0),
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 14), M.red, 0, 0.02, 0),
  ]);
}

function cables(): THREE.Group {
  const kids: THREE.Object3D[] = [];
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.07, 0.01, -0.02 + i * 0.02),
      new THREE.Vector3(-0.01, 0.03 + i * 0.01, 0.01),
      new THREE.Vector3(0.07, 0.015, -0.01 + i * 0.015),
    ]);
    kids.push(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.005, 6, false), i === 1 ? M.red : M.rubber));
  }
  return group("cables", kids);
}

function housing(): THREE.Group {
  return group("housing", [
    mesh(new THREE.BoxGeometry(0.16, 0.008, 0.1), M.plastic, 0, 0.02, 0),
    mesh(new THREE.BoxGeometry(0.16, 0.06, 0.008), M.plastic, 0, 0.05, -0.046),
    mesh(new THREE.BoxGeometry(0.008, 0.06, 0.1), M.plastic, -0.076, 0.05, 0),
  ]);
}

function printed(): THREE.Group {
  return group("printed", [
    mesh(new THREE.BoxGeometry(0.08, 0.012, 0.04), M.orange, 0, 0.016, 0),
    mesh(new THREE.BoxGeometry(0.02, 0.05, 0.04), M.orange, -0.03, 0.04, 0),
    mesh(new THREE.BoxGeometry(0.02, 0.05, 0.04), M.orange, 0.03, 0.04, 0),
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 10), M.orange, 0, 0.04, 0),
  ]);
}

const BUILDERS: Record<string, () => THREE.Group> = {
  pic,
  programmer,
  breadboard,
  dupont,
  psu,
  pir,
  servo,
  "float-food-bowl": () => floatSensor(M.orange, "float-food-bowl"),
  "float-food-res": () => floatSensor(M.amber, "float-food-res"),
  "food-res": foodReservoir,
  "food-bowl": foodBowl,
  "dosing-wheel": dosingWheel,
  pump,
  mosfet,
  "float-water-bowl": () => floatSensor(M.waterFill, "float-water-bowl"),
  "float-water-res": () => floatSensor(M.blue, "float-water-res"),
  "water-res": waterReservoir,
  hose,
  "water-bowl": waterBowl,
  "led-red": () => led(M.red, "led-red"),
  "led-green": () => led(M.green, "led-green"),
  lcd,
  resistors,
  diodes,
  button,
  cables,
  housing,
  printed,
};

const CATALOG: PartDef[] = [
  { id: "pic", category: "Contrôle", title: "PIC", blurb: "Le microcontrôleur imposé par le cours. Il pilote capteurs, moteurs et affichage." },
  { id: "programmer", category: "Contrôle", title: "Programmateur", blurb: "Debugger / programmateur compatible PIC pour flasher et tester le firmware." },
  { id: "breadboard", category: "Contrôle", title: "Breadboard", blurb: "Protoboard pour câbler le circuit sans soudure pendant le proto." },
  { id: "dupont", category: "Contrôle", title: "Fils Dupont", blurb: "Liaisons mâle/femelle entre le PIC, les modules et la breadboard." },
  { id: "psu", category: "Contrôle", title: "Alimentation", blurb: "Alim adaptée au PIC et aux moteurs (logique 5 V + puissance moteurs)." },
  { id: "pir", category: "Détection", title: "Capteur PIR", blurb: "Détecte l’approche ou le mouvement du chat pour déclencher un cycle." },
  { id: "servo", category: "Croquettes", title: "Servo-moteur", blurb: "Ouvre le mécanisme pour laisser tomber une portion." },
  { id: "float-food-bowl", category: "Croquettes", title: "Flotteur gamelle", blurb: "Capteur de niveau dans la gamelle : ne pas re-servir si elle est déjà pleine." },
  { id: "float-food-res", category: "Croquettes", title: "Flotteur réservoir", blurb: "Détecte que les croquettes sont presque épuisées." },
  { id: "food-res", category: "Croquettes", title: "Réservoir croquettes", blurb: "Stocke les croquettes au-dessus du doseur." },
  { id: "food-bowl", category: "Croquettes", title: "Gamelle croquettes", blurb: "Bol où tombe la portion." },
  { id: "dosing-wheel", category: "Croquettes", title: "Roue doseuse", blurb: "Volet / roue, éventuellement imprimée en 3D, pour doser une portion." },
  { id: "pump", category: "Eau", title: "Pompe à eau", blurb: "Petite pompe DC pour remplir la gamelle d’eau." },
  { id: "mosfet", category: "Eau", title: "MOSFET / relais", blurb: "Commande la pompe avec le PIC (le PIC ne drive pas la pompe directement)." },
  { id: "float-water-bowl", category: "Eau", title: "Flotteur gamelle eau", blurb: "Contrôle le niveau d’eau dans la gamelle." },
  { id: "float-water-res", category: "Eau", title: "Flotteur réservoir eau", blurb: "Sait si le réservoir est presque vide." },
  { id: "water-res", category: "Eau", title: "Réservoir d’eau", blurb: "Cuve d’eau propre en amont de la pompe." },
  { id: "hose", category: "Eau", title: "Tuyau", blurb: "Liaison souple entre pompe, réservoir et gamelle." },
  { id: "water-bowl", category: "Eau", title: "Gamelle d’eau", blurb: "Bol d’eau côté chat." },
  { id: "led-red", category: "Affichage", title: "LED rouge", blurb: "Alerte : eau à changer, ou erreur." },
  { id: "led-green", category: "Affichage", title: "LED verte", blurb: "Fonctionnement normal." },
  { id: "lcd", category: "Affichage", title: "Écran LCD / OLED", blurb: "Messages : Eau OK, Changer l’eau, Croquettes OK, Réservoir vide." },
  { id: "resistors", category: "Divers", title: "Résistances", blurb: "Limitent le courant des LED et polarisent les lignes." },
  { id: "diodes", category: "Divers", title: "Diodes", blurb: "Protection des charges inductives (servo, pompe)." },
  { id: "button", category: "Divers", title: "Bouton", blurb: "Confirme le renouvellement de l’eau." },
  { id: "cables", category: "Divers", title: "Câbles", blurb: "Câbles et connecteurs pour l’ensemble du montage." },
  { id: "housing", category: "Divers", title: "Boîtier", blurb: "Matériaux du boîtier : panneaux, vis, structure." },
  { id: "printed", category: "Divers", title: "Pièces 3D", blurb: "Supports, mécanisme doseur et fixations imprimés." },
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
      <span class="tag">Matériel</span>
      <h1>Bill of materials</h1>
      <p>Tout le kit, aligné par fonction. Flèche suivante : une pièce à la fois.</p>
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
      <span class="tag">${def.category}</span>
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
