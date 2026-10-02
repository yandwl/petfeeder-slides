import * as THREE from "three";
import {
  getCatCameraView,
  isCatEating,
  mountCat,
  playCatClip,
  resetCatToHome,
  setCatVisible,
  startCatMealWalk,
  startCatWalkIn,
} from "./catAsset";
import {
  getFeederCameraView,
  mountFeeder,
  setFeederVisible,
  type FeederAsset,
  type FeederCameraPreset,
} from "./feeder";
import { createPartSlides, setPartsVisible } from "./parts";
import {
  onFeedingLogicArrive,
  resetFeedingLogic,
  setFeedingLogicMode,
  type FeedingLogicMode,
} from "./feedingLogic";
import type { Slide, SlideContext } from "./types";

function hideParts(ctx: { parts?: import("./parts").PartsKit }): void {
  if (ctx.parts) setPartsVisible(ctx.parts, false);
}

const FINALE_ORBIT_DELAY = 2;

let finaleOrbitAngle: number | null = null;
let finaleEatingElapsed = 0;

function updateFinaleOrbit(ctx: import("./types").SlideContext, dt: number): void {
  if (!ctx.cat || !ctx.feeder || !ctx.setCameraPose) return;

  if (!isCatEating(ctx.cat)) {
    finaleOrbitAngle = null;
    finaleEatingElapsed = 0;
    return;
  }

  finaleEatingElapsed += dt;
  if (finaleEatingElapsed < FINALE_ORBIT_DELAY) return;

  const center = new THREE.Vector3().lerpVectors(
    ctx.feeder.frame.center,
    ctx.cat.root.position,
    0.42
  );
  const lookAt = center.clone();
  lookAt.y += 0.06;

  if (finaleOrbitAngle === null) {
    const dx = ctx.camera.position.x - center.x;
    const dz = ctx.camera.position.z - center.z;
    finaleOrbitAngle = Math.atan2(dx, dz);
  }

  finaleOrbitAngle += dt * 0.34;
  const radius = 0.92;
  const height = center.y + 0.36;
  const position = new THREE.Vector3(
    center.x + Math.sin(finaleOrbitAngle) * radius,
    height,
    center.z + Math.cos(finaleOrbitAngle) * radius
  );
  ctx.setCameraPose(position, lookAt);
}

const emptyCameraFallback = {
  position: new THREE.Vector3(0, -0.75, 1.1),
  lookAt: new THREE.Vector3(0, -0.92, 0),
};

function catSlideCamera(ctx: { cat?: import("./catAsset").CatAsset }) {
  return ctx.cat
    ? getCatCameraView(ctx.cat.frame, "front")
    : emptyCameraFallback;
}

function prepareFeederOnly(ctx: SlideContext): boolean {
  hideParts(ctx);
  if (ctx.cat) {
    setCatVisible(ctx.cat, false);
    resetCatToHome(ctx.cat);
  }
  if (!ctx.feeder) return false;
  mountFeeder(ctx.feeder, ctx.scene);
  setFeederVisible(ctx.feeder, true);
  return true;
}

function feedingLogicSlide(
  id: string,
  title: string,
  blurb: string,
  preset: FeederCameraPreset,
  anim: FeedingLogicMode,
  callout: (f: FeederAsset) => THREE.Vector3 | null,
  options?: { onArriveExtra?: (ctx: SlideContext) => void }
): Slide {
  return {
    id,
    overlayHtml: `
      <h1>${title}</h1>
      <p>${blurb}</p>
    `,
    camera: (ctx) =>
      ctx.feeder ? getFeederCameraView(ctx.feeder, preset) : emptyCameraFallback,
    onEnter(ctx) {
      if (!prepareFeederOnly(ctx)) return;
      setFeedingLogicMode(anim, ctx.feeder);
      ctx.callout?.setTarget(ctx.feeder ? callout(ctx.feeder) : null);
    },
    onArrive(ctx) {
      if (!ctx.feeder) return;
      onFeedingLogicArrive(ctx.feeder);
      options?.onArriveExtra?.(ctx);
    },
    onLeave(ctx) {
      ctx.callout?.setTarget(null);
      if (ctx.feeder) resetFeedingLogic(ctx.feeder);
    },
  };
}

function feederFocusSlide(
  id: string,
  title: string,
  blurb: string,
  preset: FeederCameraPreset,
  target: (feeder: FeederAsset) => THREE.Vector3
): Slide {
  return {
    id,
    overlayHtml: `
      <h1 data-callout-from>${title}</h1>
      <p>${blurb}</p>
    `,
    camera: (ctx) =>
      ctx.feeder ? getFeederCameraView(ctx.feeder, preset) : emptyCameraFallback,
    onEnter(ctx: SlideContext) {
      hideParts(ctx);
      if (ctx.cat) {
        setCatVisible(ctx.cat, false);
        resetCatToHome(ctx.cat);
      }
      if (!ctx.feeder) return;
      mountFeeder(ctx.feeder, ctx.scene);
      setFeederVisible(ctx.feeder, true);
      ctx.callout?.setTarget(target(ctx.feeder));
    },
    onLeave(ctx) {
      ctx.callout?.setTarget(null);
    },
  };
}

export function createDemoSlides(): Slide[] {
  return [
    {
      id: "blank",
      overlayHtml: `
        <ul class="authors">
          <li>Nessim Boustani</li>
          <li>Zackaria Marzouki</li>
          <li>Yanis Dewel</li>
          <li>Adam Chelkha</li>
        </ul>
      `,
      camera: catSlideCamera,
      onEnter(ctx) {
        hideParts(ctx);
        if (ctx.feeder) setFeederVisible(ctx.feeder, false);
        if (!ctx.cat) return;
        mountCat(ctx.cat, ctx.scene);
        resetCatToHome(ctx.cat);
        setCatVisible(ctx.cat, false);
      },
    },
    {
      id: "cat-arrival",
      overlayHtml: `
        <h1>Hello, cat</h1>
        <p>We want to make a project with cats.</p>
      `,
      camera: catSlideCamera,
      onEnter(ctx) {
        hideParts(ctx);
        if (ctx.feeder) setFeederVisible(ctx.feeder, false);
        if (!ctx.cat) return;
        mountCat(ctx.cat, ctx.scene);
        resetCatToHome(ctx.cat);
        setCatVisible(ctx.cat, false);
      },
      onArrive(ctx) {
        if (!ctx.cat) return;
        startCatWalkIn(ctx.cat);
      },
      onLeave(ctx) {
        if (!ctx.cat) return;
        setCatVisible(ctx.cat, false);
        resetCatToHome(ctx.cat);
      },
    },
    {
      id: "cat-angry",
      overlayHtml: `
        <h1>I'm very hungry</h1>
        <p>Where’s dinner?</p>
      `,
      camera: (ctx) =>
        ctx.cat
          ? getCatCameraView(ctx.cat.frame, "angry")
          : emptyCameraFallback,
      onEnter(ctx) {
        hideParts(ctx);
        if (ctx.feeder) setFeederVisible(ctx.feeder, false);
        if (!ctx.cat) return;
        mountCat(ctx.cat, ctx.scene);
        resetCatToHome(ctx.cat);
        setCatVisible(ctx.cat, true);
        playCatClip(ctx.cat, "Headbutt", 0.25, true);
      },
      onLeave(ctx) {
        if (!ctx.cat) return;
        setCatVisible(ctx.cat, false);
        resetCatToHome(ctx.cat);
      },
    },
    {
      id: "feeder",
      overlayHtml: `
        <h1>The feeder</h1>
        <p>Hopper, Bowl and dispenser, automatically feeds the cat.</p>
      `,
      camera: (ctx) =>
        ctx.feeder
          ? getFeederCameraView(ctx.feeder)
          : emptyCameraFallback,
      onEnter(ctx) {
        hideParts(ctx);
        if (ctx.cat) {
          setCatVisible(ctx.cat, false);
          resetCatToHome(ctx.cat);
        }
        if (!ctx.feeder) return;
        mountFeeder(ctx.feeder, ctx.scene);
        setFeederVisible(ctx.feeder, true);
        ctx.callout?.setTarget(null);
      },
    },
    {
      id: "food-hopper",
      overlayHtml: `
        <h1 data-callout-from>Food hopper</h1>
        <p>Dry food is stored here. It flows down toward the bowl.</p>
      `,
      camera: (ctx) =>
        ctx.feeder
          ? getFeederCameraView(ctx.feeder, "food")
          : emptyCameraFallback,
      onEnter(ctx) {
        hideParts(ctx);
        if (ctx.cat) {
          setCatVisible(ctx.cat, false);
          resetCatToHome(ctx.cat);
        }
        if (!ctx.feeder) return;
        mountFeeder(ctx.feeder, ctx.scene);
        setFeederVisible(ctx.feeder, true);
        resetFeedingLogic(ctx.feeder);
        ctx.callout?.setTarget(ctx.feeder.foodCenter);
      },
      onLeave(ctx) {
        ctx.callout?.setTarget(null);
      },
    },
    feederFocusSlide(
      "food-bowl",
      "Food bowl",
      "Where each meal lands for the cat.",
      "foodBowl",
      (f) => f.foodBowlCenter
    ),
    feederFocusSlide(
      "food-dispenser",
      "Food dispenser",
      "One portion of food drops from here into the bowl.",
      "foodDispenser",
      (f) => f.foodDispenserCenter
    ),
    feederFocusSlide(
      "feeder-box",
      "Enclosure",
      "The brain of the feeder lives inside, out of sight.",
      "box",
      (f) => f.bodyCenter
    ),
    feedingLogicSlide(
      "logic-timer",
      "Every 6 hours",
      "The machine wakes on the timer and starts the feeding check.",
      "box",
      "wake",
      (f) => {
        const p = new THREE.Vector3();
        f.led.getWorldPosition(p);
        return p;
      }
    ),
    feedingLogicSlide(
      "logic-check",
      "Is the bowl full?",
      "A distance sensor measures the level of dry food. Here the bowl is not full yet.",
      "foodBowl",
      "check",
      (f) => f.foodBowlCenter.clone()
    ),
    feedingLogicSlide(
      "logic-dispense",
      "Dispense one portion",
      "If the bowl isn’t full, the geared motor turns the endless screw to push one portion into the bowl.",
      "foodDispenser",
      "dispense",
      (f) => f.foodDispenserCenter.clone()
    ),
    feedingLogicSlide(
      "logic-restart",
      "Timer restarts",
      "Whether it fed or skipped, the 6 h countdown starts again for the next check.",
      "overview",
      "restart",
      () => null
    ),
    feedingLogicSlide(
      "logic-hopper-low",
      "Hopper running low",
      "A distance sensor measures the level of dry food. Only a small amount remains.",
      "food",
      "hopper-low-level",
      (f) => f.foodCenter.clone()
    ),
    feedingLogicSlide(
      "logic-hopper-alert",
      "Red light pulses",
      "When the hopper is low, the red status LED pulses until you refill the reservoir.",
      "box",
      "hopper-low-alert",
      (f) => {
        const p = new THREE.Vector3();
        f.led.getWorldPosition(p);
        return p;
      }
    ),
    ...createPartSlides(),
    {
      id: "finale",
      overlayHtml: `
        <h1>Dinner time</h1>
        <p>The cat walks up to the feeder and eats.</p>
      `,
      camera: (ctx) =>
        ctx.feeder
          ? getFeederCameraView(ctx.feeder, "meal")
          : emptyCameraFallback,
      onEnter(ctx) {
        finaleOrbitAngle = null;
        finaleEatingElapsed = 0;
        hideParts(ctx);
        ctx.callout?.setTarget(null);
        if (ctx.feeder) {
          mountFeeder(ctx.feeder, ctx.scene);
          setFeederVisible(ctx.feeder, true);
        }
        if (!ctx.cat) return;
        mountCat(ctx.cat, ctx.scene);
        resetCatToHome(ctx.cat);
        setCatVisible(ctx.cat, false);
      },
      onArrive(ctx) {
        if (!ctx.cat) return;
        startCatMealWalk(ctx.cat);
      },
      onLeave(ctx) {
        finaleOrbitAngle = null;
        finaleEatingElapsed = 0;
        if (!ctx.cat) return;
        setCatVisible(ctx.cat, false);
        resetCatToHome(ctx.cat);
      },
      update(ctx, dt) {
        updateFinaleOrbit(ctx, dt);
      },
    },
  ];
}
