import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MARK_URL = "/models/question_mark.glb";
const TARGET_HEIGHT = 0.14;

export type QuestionMarksKit = {
  root: THREE.Group;
  marks: THREE.Group[];
};

const markMaterial = new THREE.MeshStandardMaterial({
  color: 0xffe08a,
  emissive: 0xffc040,
  emissiveIntensity: 0.55,
  roughness: 0.32,
  metalness: 0.06,
});

function applyMarkMaterial(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.material = markMaterial;
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
}

function normalizeMarkTemplate(scene: THREE.Object3D): THREE.Group {
  const template = new THREE.Group();
  template.add(scene);

  const box = new THREE.Box3().setFromObject(template);
  const size = box.getSize(new THREE.Vector3());
  const scale = TARGET_HEIGHT / Math.max(size.y, 1e-6);
  template.scale.setScalar(scale);

  box.setFromObject(template);
  const center = box.getCenter(new THREE.Vector3());
  template.position.sub(center);
  template.updateMatrixWorld(true);

  applyMarkMaterial(template);
  return template;
}

const MARK_COUNT = 5;
const ARC_RADIUS = 0.26;
const ARC_BASE_Y = 0.1;

function layoutMarks(root: THREE.Group, template: THREE.Group): THREE.Group[] {
  const marks: THREE.Group[] = [];
  for (let i = 0; i < MARK_COUNT; i++) {
    const t = i / Math.max(1, MARK_COUNT - 1);
    const angle = -Math.PI * 0.55 + t * Math.PI * 1.1;
    const x = Math.sin(angle) * ARC_RADIUS;
    const y = ARC_BASE_Y + Math.cos(angle) * 0.05;
    const z = -Math.abs(Math.cos(angle)) * 0.06;

    const mark = template.clone(true);
    applyMarkMaterial(mark);
    mark.position.set(x, y, z);
    const s = 1.35 + Math.sin(t * Math.PI) * 0.25;
    mark.scale.multiplyScalar(s);
    mark.userData.phase = i * 0.9;
    mark.userData.basePos = new THREE.Vector3(x, y, z);
    root.add(mark);
    marks.push(mark);
  }
  return marks;
}

let loadPromise: Promise<QuestionMarksKit> | null = null;

export function preloadQuestionMarks(): Promise<QuestionMarksKit> {
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        MARK_URL,
        (gltf) => {
          const template = normalizeMarkTemplate(gltf.scene);
          const root = new THREE.Group();
          root.name = "question-marks";
          const marks = layoutMarks(root, template);
          root.visible = false;
          resolve({ root, marks });
        },
        undefined,
        reject
      );
    });
  }
  return loadPromise;
}

export function mountQuestionMarks(kit: QuestionMarksKit, scene: THREE.Scene): void {
  if (!kit.root.parent) scene.add(kit.root);
}

export function setQuestionMarksVisible(kit: QuestionMarksKit, visible: boolean): void {
  kit.root.visible = visible;
}

/** Y-axis billboard so the GLB stays upright and readable. */
function faceCameraYaw(mark: THREE.Object3D, camPos: THREE.Vector3): void {
  mark.updateMatrixWorld(true);
  const world = new THREE.Vector3();
  mark.getWorldPosition(world);
  const dx = camPos.x - world.x;
  const dz = camPos.z - world.z;
  if (Math.hypot(dx, dz) < 1e-5) return;
  mark.rotation.set(0, Math.atan2(dx, dz), 0);
}

export function updateQuestionMarks(
  kit: QuestionMarksKit,
  elapsed: number,
  anchor: THREE.Vector3,
  camera: THREE.Camera
): void {
  if (!kit.root.visible) return;
  kit.root.position.copy(anchor);

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);

  for (const mark of kit.marks) {
    const base = mark.userData.basePos as THREE.Vector3;
    const phase = (mark.userData.phase as number) ?? 0;
    const t = elapsed * 2.2 + phase;
    mark.position.set(base.x, base.y + Math.sin(t) * 0.035, base.z);
    faceCameraYaw(mark, camPos);
  }
}
