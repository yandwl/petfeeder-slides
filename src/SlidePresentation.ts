import * as THREE from "three";
import { easeInOutCubic, lerpVector3 } from "./math";
import { updateCat, type CatAsset } from "./catAsset";
import { Callout } from "./callout";
import { updateFeedingLogic } from "./feedingLogic";
import { updateFeeder, type FeederAsset } from "./feeder";
import type { PartsKit } from "./parts";
import {
  updateQuestionMarks,
  type QuestionMarksKit,
} from "./questionMarks";
import type { CameraKeyframe, Slide, SlideContext } from "./types";

const TRANSITION_MS = 650;

export class SlidePresentation {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private slides: Slide[] = [];
  private index = 0;
  private ctx: SlideContext;
  private overlayEl: HTMLElement;
  private indicatorEl: HTMLElement;
  private jumpInput: HTMLInputElement;

  private transitionT = 1;
  private pendingArrive = false;
  private fromCam: CameraKeyframe;
  private toCam: CameraKeyframe;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();

  private keys = new Set<string>();
  private keyLock = false;
  private clock = new THREE.Clock();
  private raf = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a0f, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.035);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    this.ctx = {
      scene: this.scene,
      camera: this.camera,
      objects: new Map(),
      cat: undefined,
      feeder: undefined,
      parts: undefined,
      questionMarks: undefined,
      callout: new Callout(),
      setCameraPose: (position, lookAt) => {
        this.camera.position.copy(position);
        this.lookTarget.copy(lookAt);
        this.camera.lookAt(lookAt);
      },
    };

    const overlay = document.getElementById("overlay");
    const indicator = document.getElementById("slide-indicator");
    const jumpInput = document.getElementById("jump-input");
    const jumpForm = document.getElementById("jump");
    if (!overlay || !indicator || !(jumpInput instanceof HTMLInputElement) || !jumpForm) {
      throw new Error("Missing overlay DOM");
    }
    this.overlayEl = overlay;
    this.indicatorEl = indicator;
    this.jumpInput = jumpInput;

    jumpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.jumpToNumber(this.jumpInput.value);
    });

    const first = new THREE.Vector3(0, 2, 6);
    const firstLook = new THREE.Vector3(0, 0, 0);
    this.fromCam = { position: first.clone(), lookAt: firstLook.clone() };
    this.toCam = { position: first.clone(), lookAt: firstLook.clone() };

    this.addLights();
    this.bindInput();
    window.addEventListener("resize", () => this.onResize());
    this.onResize();
  }

  setCat(cat: CatAsset): void {
    this.ctx.cat = cat;
  }

  setFeeder(feeder: FeederAsset): void {
    this.ctx.feeder = feeder;
  }

  setParts(parts: PartsKit): void {
    this.ctx.parts = parts;
  }

  setQuestionMarks(kit: QuestionMarksKit): void {
    this.ctx.questionMarks = kit;
  }

  addSlides(slides: Slide[]): void {
    this.slides = slides;
    for (const slide of slides) {
      slide.setup?.(this.scene);
    }
    this.jumpInput.max = String(slides.length);
    this.goTo(0, false);
    this.clock.start();
    this.tick();
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x8899ff, 0.5);
    rim.position.set(-3, 2, -4);
    this.scene.add(rim);
  }

  private bindInput(): void {
    window.addEventListener("keydown", (e) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (typing) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        this.next();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        this.prev();
      }
      this.keys.add(e.key);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key));
  }

  private next(): void {
    if (this.index < this.slides.length - 1) this.goTo(this.index + 1, true);
  }

  private prev(): void {
    if (this.index > 0) this.goTo(this.index - 1, true);
  }

  private jumpToNumber(raw: string): void {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    const nextIndex = Math.min(this.slides.length, Math.max(1, n)) - 1;
    this.keyLock = false;
    this.goTo(nextIndex, true);
  }

  private goTo(nextIndex: number, animate: boolean): void {
    if (nextIndex === this.index && animate) return;
    if (this.keyLock) return;

    const prevSlide = this.slides[this.index];
    const nextSlide = this.slides[nextIndex];

    if (animate && prevSlide) prevSlide.onLeave?.(this.ctx);

    this.fromCam = {
      position: this.camera.position.clone(),
      lookAt: this.lookTarget.clone(),
    };
    this.toCam = this.resolveCamera(nextSlide);

    this.index = nextIndex;

    this.renderOverlay(nextSlide.overlayHtml);
    this.indicatorEl.textContent = `${this.index + 1} / ${this.slides.length}`;
    this.jumpInput.value = String(this.index + 1);
    this.jumpInput.max = String(this.slides.length);

    const sameCamera = this.camerasMatch(this.fromCam, this.toCam);
    nextSlide.onEnter?.(this.ctx);

    if (!animate || sameCamera) {
      this.transitionT = 1;
      this.keyLock = false;
      this.pendingArrive = false;
      this.applyCamera(1);
      nextSlide.onArrive?.(this.ctx);
      return;
    }

    this.transitionT = 0;
    this.keyLock = true;
    this.pendingArrive = Boolean(nextSlide.onArrive);
  }

  private renderOverlay(html: string): void {
    if (!html.trim()) {
      this.overlayEl.innerHTML = "";
      return;
    }
    this.overlayEl.innerHTML = `<div class="slide-panel">${html}</div>`;
    requestAnimationFrame(() => {
      const panel = this.overlayEl.querySelector(".slide-panel");
      panel?.classList.add("visible");
    });
  }

  private camerasMatch(a: CameraKeyframe, b: CameraKeyframe): boolean {
    const eps = 0.02;
    return (
      a.position.distanceTo(b.position) < eps &&
      a.lookAt.distanceTo(b.lookAt) < eps
    );
  }

  private resolveCamera(slide: Slide): CameraKeyframe {
    const cam =
      typeof slide.camera === "function"
        ? slide.camera(this.ctx)
        : slide.camera;
    return {
      position: cam.position.clone(),
      lookAt: cam.lookAt.clone(),
    };
  }

  private applyCamera(t: number): void {
    const e = easeInOutCubic(t);
    lerpVector3(this.fromCam.position, this.toCam.position, e, this.camPos);
    lerpVector3(this.fromCam.lookAt, this.toCam.lookAt, e, this.camLook);
    this.camera.position.copy(this.camPos);
    this.lookTarget.copy(this.camLook);
    this.camera.lookAt(this.lookTarget);
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = this.clock.getDelta();
    const slide = this.slides[this.index];

    if (this.transitionT < 1) {
      this.transitionT = Math.min(
        1,
        this.transitionT + dt / (TRANSITION_MS / 1000)
      );
      this.applyCamera(this.transitionT);
      if (this.transitionT >= 1) {
        this.keyLock = false;
        if (this.pendingArrive) {
          this.pendingArrive = false;
          slide.onArrive?.(this.ctx);
        }
      }
    }

    slide.update?.(this.ctx, dt);
    if (this.ctx.cat?.root.visible) updateCat(this.ctx.cat, dt);
    if (this.ctx.feeder) {
      const logicDrivesLed = updateFeedingLogic(
        this.ctx.feeder,
        dt
      );
      if (!logicDrivesLed) {
        updateFeeder(this.ctx.feeder, this.clock.elapsedTime);
      }
    }
    if (this.ctx.questionMarks?.root.visible && this.ctx.cat) {
      const anchor = this.ctx.cat.root.position.clone();
      anchor.y += this.ctx.cat.frame.size.y * 0.92;
      updateQuestionMarks(
        this.ctx.questionMarks,
        this.clock.elapsedTime,
        anchor,
        this.camera
      );
    }
    this.ctx.callout?.update(this.camera);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
  }
}
