import * as THREE from "three";

const FLOOR_Y = -1.2;
/** Root-local baseline for food pile inside the bowl (below rim). */
export const FOOD_BOWL_PILE_Y = 0.06 + 0.012;

export type FeederCameraPreset =
  | "overview"
  | "food"
  | "meal"
  | "foodBowl"
  | "foodDispenser"
  | "box";

export type FeederAsset = {
  root: THREE.Group;
  led: THREE.Mesh;
  ledLight: THREE.PointLight;
  foodHopper: THREE.Mesh;
  foodHopperFill: THREE.Mesh;
  body: THREE.Mesh;
  foodChute: THREE.Mesh;
  frame: { center: THREE.Vector3; size: THREE.Vector3 };
  foodCenter: THREE.Vector3;
  foodBowlCenter: THREE.Vector3;
  foodDispenserCenter: THREE.Vector3;
  bodyCenter: THREE.Vector3;
  foodBowlInner: THREE.Mesh;
  foodKibbles: THREE.Group;
};

const mat = {
  shell: new THREE.MeshStandardMaterial({
    color: 0xf4efe8,
    roughness: 0.38,
    metalness: 0.04,
  }),
  charcoal: new THREE.MeshStandardMaterial({
    color: 0x2b2c34,
    roughness: 0.45,
    metalness: 0.12,
  }),
  foodHopper: new THREE.MeshStandardMaterial({
    color: 0xd4a574,
    roughness: 0.22,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
  }),
  foodFill: new THREE.MeshStandardMaterial({
    color: 0xc48a4a,
    roughness: 0.7,
    metalness: 0,
  }),
  bowl: new THREE.MeshStandardMaterial({
    color: 0xe8e2da,
    roughness: 0.28,
    metalness: 0.08,
  }),
  kibble: new THREE.MeshStandardMaterial({
    color: 0xb87333,
    roughness: 0.85,
    metalness: 0,
  }),
  ledOff: new THREE.MeshStandardMaterial({
    color: 0x3a1010,
    roughness: 0.3,
    metalness: 0.4,
    emissive: 0xc43a32,
    emissiveIntensity: 0.55,
  }),
};

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createFeeder(): FeederAsset {
  const root = new THREE.Group();
  root.name = "feeder";

  const baseH = 0.06;
  const bodyW = 0.38;
  const bodyD = 0.26;
  const bodyH = 0.34;
  const hopperH = 0.22;
  const hopperW = 0.24;
  const hopperD = 0.2;

  const base = box(0.48, baseH, 0.44, mat.charcoal, 0, baseH / 2, 0.04);
  root.add(base);

  const body = box(bodyW, bodyH, bodyD, mat.shell, 0, baseH + bodyH / 2, -0.04);
  body.name = "feeder-body";
  root.add(body);

  const foodHopper = box(
    hopperW,
    hopperH,
    hopperD,
    mat.foodHopper,
    0,
    baseH + bodyH + hopperH / 2,
    -0.04
  );
  foodHopper.name = "food-hopper";
  root.add(foodHopper);

  const foodHopperFill = box(
    hopperW - 0.04,
    hopperH * 0.42,
    hopperD - 0.04,
    mat.foodFill,
    0,
    baseH + bodyH + hopperH * 0.28,
    -0.04
  );
  foodHopperFill.name = "food-hopper-fill";
  root.add(foodHopperFill);

  const lid = box(
    hopperW + 0.02,
    0.02,
    hopperD + 0.02,
    mat.charcoal,
    0,
    baseH + bodyH + hopperH + 0.01,
    -0.04
  );
  root.add(lid);

  const frontPanel = box(bodyW - 0.04, 0.08, 0.02, mat.charcoal, 0, baseH + 0.2, bodyD / 2 - 0.03);
  root.add(frontPanel);

  const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 16), mat.ledOff);
  led.position.set(bodyW / 2 + 0.008, baseH + bodyH * 0.62, -0.04);
  root.add(led);

  const ledLight = new THREE.PointLight(0xc43a32, 0.22, 0.55, 2);
  ledLight.position.copy(led.position);
  ledLight.position.x += 0.03;
  root.add(ledLight);

  const {
    bowl: foodBowl,
    inner: foodBowlInner,
    kibbles: foodKibbles,
  } = addFoodBowl(root, 0, 0.18);

  const chuteL = box(0.05, 0.06, 0.08, mat.shell, 0, baseH + 0.08, 0.1);
  chuteL.name = "food-chute";
  root.add(chuteL);

  root.position.set(0, FLOOR_Y, 0);
  root.updateMatrixWorld(true);

  const box3 = new THREE.Box3().setFromObject(root);
  const frame = {
    center: box3.getCenter(new THREE.Vector3()),
    size: box3.getSize(new THREE.Vector3()),
  };

  const foodCenter = new THREE.Vector3();
  foodHopper.getWorldPosition(foodCenter);
  const foodBowlCenter = new THREE.Vector3();
  foodBowl.getWorldPosition(foodBowlCenter);
  const foodDispenserCenter = new THREE.Vector3();
  chuteL.getWorldPosition(foodDispenserCenter);
  const bodyCenter = new THREE.Vector3();
  body.getWorldPosition(bodyCenter);

  root.visible = false;
  return {
    root,
    led,
    ledLight,
    foodHopper,
    foodHopperFill,
    body,
    foodChute: chuteL,
    frame,
    foodCenter,
    foodBowlCenter,
    foodDispenserCenter,
    bodyCenter,
    foodBowlInner,
    foodKibbles,
  };
}

function addFoodBowl(
  root: THREE.Group,
  x: number,
  z: number
): { bowl: THREE.Mesh; inner: THREE.Mesh; kibbles: THREE.Group } {
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.085, 0.045, 28),
    mat.bowl
  );
  bowl.position.set(x, 0.06 + 0.022, z);
  bowl.name = "food-bowl";
  root.add(bowl);

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.07, 0.03, 28),
    mat.foodFill.clone()
  );
  inner.position.set(x, FOOD_BOWL_PILE_Y + 0.012, z);
  inner.name = "food-bowl-inner";
  root.add(inner);

  const kibbles = new THREE.Group();
  kibbles.name = "food-kibbles";
  const kibbleGeo = new THREE.SphereGeometry(0.012, 8, 8);
  for (let i = 0; i < 9; i++) {
    const k = new THREE.Mesh(kibbleGeo, mat.kibble);
    const a = (i / 9) * Math.PI * 2;
    const r = 0.035 + (i % 3) * 0.012;
    const lift = 0.006 + (i % 3) * 0.004;
    k.position.set(Math.cos(a) * r, lift, Math.sin(a) * r * 0.7);
    k.scale.set(1, 0.7, 1.2);
    kibbles.add(k);
  }
  kibbles.position.set(x, FOOD_BOWL_PILE_Y, z);
  root.add(kibbles);

  return { bowl, inner, kibbles };
}

function closeupCamera(
  lookAt: THREE.Vector3,
  side: -1 | 1,
  height: number,
  distance: number
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  const target = lookAt.clone();
  return {
    position: new THREE.Vector3(
      target.x + side * distance * 0.55,
      target.y + height,
      target.z + distance
    ),
    lookAt: target,
  };
}

export function mountFeeder(feeder: FeederAsset, scene: THREE.Scene): void {
  if (!feeder.root.parent) scene.add(feeder.root);
}

export function setFeederVisible(feeder: FeederAsset, visible: boolean): void {
  feeder.root.visible = visible;
  feeder.ledLight.visible = visible;
}

export function getFeederCameraView(
  feeder: FeederAsset,
  preset: FeederCameraPreset = "overview"
): {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
} {
  if (preset === "meal") {
    const lookAt = feeder.foodBowlCenter.clone();
    lookAt.y += 0.02;
    return {
      position: new THREE.Vector3(lookAt.x + 0.58, lookAt.y + 0.26, lookAt.z + 0.88),
      lookAt,
    };
  }

  if (preset === "food") {
    return closeupCamera(feeder.foodCenter.clone(), -1, 0.18, 0.42);
  }

  if (preset === "foodBowl") {
    return closeupCamera(feeder.foodBowlCenter.clone(), -1, 0.12, 0.32);
  }

  if (preset === "foodDispenser") {
    return closeupCamera(feeder.foodDispenserCenter.clone(), -1, 0.1, 0.36);
  }

  if (preset === "box") {
    const lookAt = feeder.bodyCenter.clone();
    return {
      position: new THREE.Vector3(lookAt.x + 0.48, lookAt.y + 0.22, lookAt.z + 0.62),
      lookAt,
    };
  }

  const { center, size } = feeder.frame;
  const span = Math.max(size.x, size.y, size.z);
  const dist = span * 1.55;
  return {
    position: new THREE.Vector3(
      center.x + dist * 0.55,
      center.y + size.y * 0.35,
      center.z + dist * 0.95
    ),
    lookAt: center.clone(),
  };
}

export function updateFeeder(feeder: FeederAsset, elapsed: number): void {
  if (!feeder.root.visible) return;
  const pulse = 0.35 + Math.sin(elapsed * 2.2) * 0.15;
  const material = feeder.led.material as THREE.MeshStandardMaterial;
  material.emissiveIntensity = pulse;
  feeder.ledLight.intensity = 0.12 + pulse * 0.18;
}
