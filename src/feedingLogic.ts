import * as THREE from "three";
import { FOOD_BOWL_PILE_Y, type FeederAsset } from "./feeder";

export type FeedingLogicMode =
  | "idle"
  | "wake"
  | "check"
  | "dispense"
  | "restart";

let mode: FeedingLogicMode = "idle";
let elapsed = 0;
let bowlFill = 0.32;
let dispenseStarted = false;

type FallingKibble = {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  delay: number;
  duration: number;
  t: number;
};

const falling: FallingKibble[] = [];
const kibbleMat = new THREE.MeshStandardMaterial({
  color: 0xb87333,
  roughness: 0.85,
  metalness: 0,
});

function ledMaterial(feeder: FeederAsset): THREE.MeshStandardMaterial {
  return feeder.led.material as THREE.MeshStandardMaterial;
}

export function resetFeedingLogic(feeder?: FeederAsset): void {
  mode = "idle";
  elapsed = 0;
  bowlFill = 0.32;
  dispenseStarted = false;
  for (const drop of falling) {
    drop.mesh.removeFromParent();
    drop.mesh.geometry.dispose();
  }
  falling.length = 0;
  if (feeder) {
    feeder.foodChute.rotation.x = 0;
    applyBowlFill(feeder, 0.32);
  }
}

export function setFeedingLogicMode(next: FeedingLogicMode, feeder?: FeederAsset): void {
  mode = next;
  elapsed = 0;
  dispenseStarted = false;
  for (const drop of falling) {
    drop.mesh.removeFromParent();
    drop.mesh.geometry.dispose();
  }
  falling.length = 0;

  if (!feeder) return;
  if (next === "check") applyBowlFill(feeder, 0.28);
  if (next === "restart") applyBowlFill(feeder, 0.78);
}

export function applyBowlFill(feeder: FeederAsset, level: number): void {
  bowlFill = THREE.MathUtils.clamp(level, 0.08, 1);
  const inner = feeder.foodBowlInner;
  inner.scale.y = 0.35 + bowlFill * 0.85;
  inner.position.y = FOOD_BOWL_PILE_Y + 0.008 + inner.scale.y * 0.01;

  feeder.foodKibbles.position.y = FOOD_BOWL_PILE_Y + bowlFill * 0.016;

  const mat = inner.material as THREE.MeshStandardMaterial;
  mat.emissive.setHex(0x000000);
  mat.emissiveIntensity = 0;

  const kids = feeder.foodKibbles.children;
  for (let i = 0; i < kids.length; i++) {
    kids[i].visible = i / kids.length < bowlFill;
  }
}

function startDispense(feeder: FeederAsset): void {
  if (dispenseStarted) return;
  dispenseStarted = true;
  applyBowlFill(feeder, 0.22);

  const origin = feeder.foodDispenserCenter.clone();
  origin.y += 0.04;
  const target = new THREE.Vector3();
  feeder.foodKibbles.getWorldPosition(target);
  target.y += 0.008;

  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.011, 8, 8),
      kibbleMat
    );
    mesh.castShadow = true;
    feeder.root.add(mesh);
    const spread = (i - 2.5) * 0.018;
    falling.push({
      mesh,
      from: origin.clone().add(new THREE.Vector3(spread, 0, 0)),
      to: target.clone().add(new THREE.Vector3(spread * 0.6, 0, spread * 0.3)),
      delay: i * 0.14,
      duration: 0.55,
      t: 0,
    });
  }
}

export function onFeedingLogicArrive(feeder: FeederAsset): void {
  if (mode === "dispense") startDispense(feeder);
}

export function updateFeedingLogic(feeder: FeederAsset, dt: number): boolean {
  if (mode === "idle" || !feeder.root.visible) return false;

  elapsed += dt;
  const led = ledMaterial(feeder);

  if (mode === "wake") {
    const pulse = 0.5 + Math.sin(elapsed * 9) * 0.45;
    led.emissiveIntensity = pulse;
    feeder.ledLight.intensity = 0.08 + pulse * 0.35;
    return true;
  }

  if (mode === "check") {
    const scan = 0.35 + Math.sin(elapsed * 5) * 0.25;
    const innerMat = feeder.foodBowlInner.material as THREE.MeshStandardMaterial;
    innerMat.emissive.setHex(0x6a4020);
    innerMat.emissiveIntensity = scan;
    feeder.foodBowlInner.scale.y =
      0.3 + 0.08 * Math.sin(elapsed * 4) + bowlFill * 0.35;
    led.emissiveIntensity = 0.45 + Math.sin(elapsed * 2) * 0.1;
    feeder.ledLight.intensity = 0.14;
    return true;
  }

  if (mode === "dispense") {
    let active = 0;
    for (const drop of falling) {
      if (elapsed < drop.delay) {
        drop.mesh.position.copy(drop.from);
        active++;
        continue;
      }
      drop.t = Math.min(1, drop.t + dt / drop.duration);
      const ease = drop.t * drop.t * (3 - 2 * drop.t);
      drop.mesh.position.lerpVectors(drop.from, drop.to, ease);
      drop.mesh.position.y += Math.sin(ease * Math.PI) * 0.06;
      if (drop.t < 1) active++;
    }

    if (active === 0 && dispenseStarted && falling.length > 0) {
      applyBowlFill(feeder, 0.72);
    }

    led.emissiveIntensity = 0.85;
    feeder.ledLight.intensity = 0.28;
    feeder.foodChute.rotation.x = Math.sin(elapsed * 12) * 0.04;
    return true;
  }

  if (mode === "restart") {
    const pulse = 0.4 + Math.sin(elapsed * 1.4) * 0.12;
    led.emissiveIntensity = pulse;
    feeder.ledLight.intensity = 0.1 + pulse * 0.12;
    applyBowlFill(feeder, 0.78);
    return true;
  }

  return false;
}
