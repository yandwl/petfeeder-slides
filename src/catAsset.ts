import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { easeInOutCubic } from "./math";

const CAT_URL = "/models/cat.glb";
const TARGET_HEIGHT = 0.55;
const WALK_SPEED = 0.72;

export type CatFrame = {
  center: THREE.Vector3;
  size: THREE.Vector3;
};

export type CatCameraPreset = "front" | "feeding" | "angry";

type CatEntrance = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  duration: number;
  elapsed: number;
  endClip: string;
  endRotationY: number;
  linearMove: boolean;
  /** After walk completes, play Q&A jump instead of endClip loop */
  afterEntrance?: "qa-jump";
};

export type CatAsset = {
  root: THREE.Group;
  /** GLB scene (animations are authored on this node). */
  mesh: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationClip>;
  activeAction: THREE.AnimationAction | null;
  frame: CatFrame;
  homePosition: THREE.Vector3;
  homeRotationY: number;
  entrance: CatEntrance | null;
};

let loadPromise: Promise<CatAsset> | null = null;

function clipSuffix(name: string): string {
  const i = name.lastIndexOf("|");
  return i >= 0 ? name.slice(i + 1) : name;
}

export function preloadCat(): Promise<CatAsset> {
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        CAT_URL,
        (gltf) => {
          const root = new THREE.Group();
          root.name = "cat-root";
          root.add(gltf.scene);

          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const scale = TARGET_HEIGHT / Math.max(size.y, 1e-6);
          root.scale.setScalar(scale);

          box.setFromObject(root);
          const center = box.getCenter(new THREE.Vector3());
          root.position.set(-center.x, -box.min.y - 1.2, -center.z);
          root.updateMatrixWorld(true);

          const frame = measureFrame(root);

          const clips = new Map<string, THREE.AnimationClip>();
          for (const clip of gltf.animations) {
            clips.set(clipSuffix(clip.name), clip);
          }

          const mixer = new THREE.AnimationMixer(gltf.scene);
          const homePosition = root.position.clone();
          resolve({
            root,
            mesh: gltf.scene,
            mixer,
            clips,
            activeAction: null,
            frame,
            homePosition,
            homeRotationY: 0,
            entrance: null,
          });
        },
        undefined,
        reject
      );
    });
  }
  return loadPromise;
}

function measureFrame(root: THREE.Group): CatFrame {
  const box = new THREE.Box3().setFromObject(root);
  return {
    center: box.getCenter(new THREE.Vector3()),
    size: box.getSize(new THREE.Vector3()),
  };
}

/** Camera aimed at the cat’s world-space bounds (not scene origin). */
export function getCatCameraView(
  frame: CatFrame,
  preset: CatCameraPreset
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  const lookAt = frame.center.clone();
  const span = Math.max(frame.size.x, frame.size.y, frame.size.z);
  const dist = span * 2.4;

  if (preset === "front") {
    return {
      position: new THREE.Vector3(
        frame.center.x,
        frame.center.y + frame.size.y * 0.08,
        frame.center.z + dist
      ),
      lookAt,
    };
  }

  if (preset === "angry") {
    const close = span * 1.65;
    return {
      position: new THREE.Vector3(
        frame.center.x + close * 0.12,
        frame.center.y + frame.size.y * 0.02,
        frame.center.z + close * 0.92
      ),
      lookAt,
    };
  }

  lookAt.y -= frame.size.y * 0.15;
  return {
    position: new THREE.Vector3(
      frame.center.x + dist * 0.72,
      frame.center.y + frame.size.y * 0.02,
      frame.center.z + dist * 0.35
    ),
    lookAt,
  };
}

export function mountCat(asset: CatAsset, scene: THREE.Scene): void {
  if (!asset.root.parent) scene.add(asset.root);
}

export function setCatVisible(asset: CatAsset, visible: boolean): void {
  asset.root.visible = visible;
}

export function playCatClip(
  asset: CatAsset,
  clipName: string,
  fade = 0.35,
  loop = false
): void {
  const clip = asset.clips.get(clipName);
  if (!clip) {
    console.warn(`Cat clip not found: ${clipName}`);
    return;
  }

  const next = asset.mixer.clipAction(clip);
  next.reset();
  next.setLoop(
    loop ? THREE.LoopRepeat : THREE.LoopOnce,
    loop ? Infinity : 1
  );
  next.clampWhenFinished = !loop;
  next.fadeIn(fade).play();

  if (asset.activeAction && asset.activeAction !== next) {
    asset.activeAction.fadeOut(fade);
  }
  asset.activeAction = next;
}

/** Facing at the meal bowl (walk uses this rotation for the whole path). */
function facingAngleForPath(from: THREE.Vector3, to: THREE.Vector3): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 1e-5) return 0;
  return Math.atan2(dz, dx) - Math.PI / 2;
}

export function resetCatToHome(asset: CatAsset): void {
  asset.entrance = null;
  asset.root.position.copy(asset.homePosition);
  asset.root.rotation.y = asset.homeRotationY;
  asset.mesh.rotation.y = 0;
  asset.mixer.stopAllAction();
  asset.activeAction = null;
}

export function startCatWalkTo(
  asset: CatAsset,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    duration?: number;
    endClip?: string;
    endRotationY?: number;
    linearMove?: boolean;
    afterEntrance?: "qa-jump";
  } = {}
): void {
  asset.entrance = null;
  asset.mixer.stopAllAction();
  asset.activeAction = null;
  asset.root.position.copy(from);
  const facingY = options.endRotationY ?? asset.homeRotationY;
  asset.root.rotation.y = facingY;
  asset.mesh.rotation.y = 0;
  const dist = from.distanceTo(to);
  asset.entrance = {
    from: from.clone(),
    to: to.clone(),
    duration: options.duration ?? Math.max(1.4, dist / WALK_SPEED),
    elapsed: 0,
    endClip: options.endClip ?? "Idle",
    endRotationY: facingY,
    linearMove: options.linearMove ?? true,
    afterEntrance: options.afterEntrance,
  };
  setCatVisible(asset, true);
  playCatClip(asset, "Walk", 0.15, true);
}

export function startCatWalkIn(asset: CatAsset, offset = 2.8): void {
  resetCatToHome(asset);
  const from = asset.homePosition.clone();
  from.x -= offset;
  startCatWalkTo(asset, from, asset.homePosition.clone(), {
    endClip: "Idle",
    endRotationY: asset.homeRotationY,
  });
}

export function startCatMealWalk(asset: CatAsset): void {
  const to = new THREE.Vector3(0.04, asset.homePosition.y, 0.52);
  const from = to.clone();
  from.z += 2.45;

  const rot = facingAngleForPath(from, to);

  startCatWalkTo(asset, from, to, {
    endClip: "Idle_Eating",
    endRotationY: rot,
  });
}

function tickCatEntrance(asset: CatAsset, dt: number): void {
  const e = asset.entrance;
  if (!e) return;

  e.elapsed += dt;
  const t = Math.min(1, e.elapsed / e.duration);
  const moveT = e.linearMove ? t : easeInOutCubic(t);
  asset.root.position.lerpVectors(e.from, e.to, moveT);

  if (t >= 1) {
    asset.entrance = null;
    asset.root.position.copy(e.to);
    asset.root.rotation.y = e.endRotationY;
    if (e.afterEntrance === "qa-jump") {
      playCatClip(asset, "Jump_Start", 0.2, false);
      asset.root.userData.qaJumpHandoff = true;
    } else {
      playCatClip(asset, e.endClip, 0.4, true);
    }
  }
}

export function startCatQAShow(asset: CatAsset): void {
  resetCatToHome(asset);
  setCatVisible(asset, false);
  const to = asset.homePosition.clone();
  const from = to.clone();
  from.z -= 2.8;
  startCatWalkTo(asset, from, to, {
    endClip: "Idle",
    endRotationY: asset.homeRotationY,
    afterEntrance: "qa-jump",
  });
}

export function updateCatQAHandoff(asset: CatAsset): void {
  if (!asset.root.userData.qaJumpHandoff) return;
  const action = asset.activeAction;
  if (!action) return;
  const clip = action.getClip();
  if (clipSuffix(clip.name) !== "Jump_Start") return;
  if (action.time < clip.duration * 0.88) return;
  asset.root.userData.qaJumpHandoff = false;
  playCatClip(asset, "Jump_Loop", 0.25, true);
  if (asset.activeAction) asset.activeAction.timeScale = 1.15;
}

export function clearCatQAState(asset: CatAsset): void {
  asset.root.userData.qaJumpHandoff = false;
}

export function isCatEating(asset: CatAsset): boolean {
  if (asset.entrance) return false;
  const clip = asset.activeAction?.getClip();
  if (!clip) return false;
  return clipSuffix(clip.name) === "Idle_Eating";
}

export function updateCat(asset: CatAsset, dt: number): void {
  if (!asset.root.visible) return;
  tickCatEntrance(asset, dt);
  asset.mixer.update(dt);
}
