import type * as THREE from "three";

export type SetCameraPose = (
  position: THREE.Vector3,
  lookAt: THREE.Vector3
) => void;

export type CameraKeyframe = {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
};

export type Slide = {
  id: string;
  /** HTML string for the overlay (kept simple for the demo) */
  overlayHtml: string;
  camera: CameraKeyframe | ((ctx: SlideContext) => CameraKeyframe);
  /** Called once when the slide is registered */
  setup?(scene: THREE.Scene): void;
  /** When navigation completes and this slide becomes active */
  onEnter?(ctx: SlideContext): void;
  /** After camera transition finishes (or immediately if there is none) */
  onArrive?(ctx: SlideContext): void;
  /** When leaving this slide (transition starts) */
  onLeave?(ctx: SlideContext): void;
  /** Per-frame while this slide is active or during transition */
  update?(ctx: SlideContext, dt: number): void;
};

export type SlideContext = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  objects: Map<string, THREE.Object3D>;
  /** Set when cat GLB has finished loading */
  cat?: import("./catAsset").CatAsset;
  feeder?: import("./feeder").FeederAsset;
  parts?: import("./parts").PartsKit;
  questionMarks?: import("./questionMarks").QuestionMarksKit;
  callout?: import("./callout").Callout;
  setCameraPose?: SetCameraPose;
};
