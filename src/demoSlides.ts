import * as THREE from "three";
import {
  getCatCameraView,
  clearCatQAState,
  isCatEating,
  mountCat,
  playCatClip,
  resetCatToHome,
  setCatVisible,
  startCatQAShow,
  startCatMealWalk,
  startCatWalkIn,
  updateCatQAHandoff,
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
import {
  mountQuestionMarks,
  setQuestionMarksVisible,
} from "./questionMarks";
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
  step: string,
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
      <span class="tag">${step}</span>
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
  tag: string,
  title: string,
  blurb: string,
  preset: FeederCameraPreset,
  target: (feeder: FeederAsset) => THREE.Vector3
): Slide {
  return {
    id,
    overlayHtml: `
      <span class="tag">${tag}</span>
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
      overlayHtml: "",
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
        <span class="tag">Scene 2</span>
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
        <span class="tag">Scene 3</span>
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
        <span class="tag">Scene 4</span>
        <h1>The feeder</h1>
        <p>Two hoppers, two bowls. Food on the left, water on the right. Status light on.</p>
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
        <span class="tag">Scene 5</span>
        <h1 data-callout-from>Food hopper</h1>
        <p>Dry food lives here. Gravity feeds the left bowl.</p>
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
        ctx.callout?.setTarget(ctx.feeder.foodCenter);
      },
      onLeave(ctx) {
        ctx.callout?.setTarget(null);
      },
    },
    {
      id: "water-hopper",
      overlayHtml: `
        <span class="tag">Scene 6</span>
        <h1 data-callout-from>Water hopper</h1>
        <p>Fresh water on the right. It fills the other bowl.</p>
      `,
      camera: (ctx) =>
        ctx.feeder
          ? getFeederCameraView(ctx.feeder, "water")
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
        ctx.callout?.setTarget(ctx.feeder.waterCenter);
      },
      onLeave(ctx) {
        ctx.callout?.setTarget(null);
      },
    },
    feederFocusSlide(
      "food-bowl",
      "Scene 7",
      "Food bowl",
      "Gamelle croquettes — le flotteur vérifie qu’elle n’est pas déjà pleine.",
      "foodBowl",
      (f) => f.foodBowlCenter
    ),
    feederFocusSlide(
      "water-bowl",
      "Scene 8",
      "Water bowl",
      "Gamelle d’eau — le niveau est contrôlé avant de relancer la pompe.",
      "waterBowl",
      (f) => f.waterBowlCenter
    ),
    feederFocusSlide(
      "food-dispenser",
      "Scene 9",
      "Food dispenser",
      "Trémie + servo / doseur : une portion tombe dans la gamelle.",
      "foodDispenser",
      (f) => f.foodDispenserCenter
    ),
    feederFocusSlide(
      "water-dispenser",
      "Scene 10",
      "Water dispenser",
      "Chute d’eau depuis le réservoir, commandée par la pompe.",
      "waterDispenser",
      (f) => f.waterDispenserCenter
    ),
    feederFocusSlide(
      "feeder-box",
      "Scene 11",
      "Enclosure",
      "Boîtier : PIC, breadboard, alimentation et câblage à l’intérieur.",
      "box",
      (f) => f.bodyCenter
    ),
    feedingLogicSlide(
      "logic-timer",
      "Logic · 1/4",
      "Every 6 hours",
      "The PIC wakes on the timer — status LED pulses while the cycle starts.",
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
      "Logic · 2/4",
      "Is the bowl full?",
      "The float sensor reads the food bowl. Here it’s low — not full yet.",
      "foodBowl",
      "check",
      (f) => f.foodBowlCenter.clone()
    ),
    feedingLogicSlide(
      "logic-dispense",
      "Logic · 3/4",
      "Dispense one portion",
      "If the bowl isn’t full, the auger drops a measured portion into the bowl.",
      "foodDispenser",
      "dispense",
      (f) => f.foodDispenserCenter.clone()
    ),
    feedingLogicSlide(
      "logic-restart",
      "Logic · 4/4",
      "Timer restarts",
      "Whether it fed or skipped, the 6 h countdown starts again for the next check.",
      "overview",
      "restart",
      () => null
    ),
    ...createPartSlides(),
    {
      id: "finale",
      overlayHtml: `
        <span class="tag">Finale</span>
        <h1>Dinner time</h1>
        <p>Le chat arrive à la machine et mange.</p>
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
    {
      id: "qa",
      overlayHtml: `
        <span class="tag">Q&amp;A</span>
        <h1>Any questions?</h1>
        <p>Merci — on passe aux questions.</p>
      `,
      camera: catSlideCamera,
      onEnter(ctx) {
        hideParts(ctx);
        ctx.callout?.setTarget(null);
        if (ctx.feeder) setFeederVisible(ctx.feeder, false);
        if (ctx.questionMarks) {
          mountQuestionMarks(ctx.questionMarks, ctx.scene);
          setQuestionMarksVisible(ctx.questionMarks, true);
        }
        if (!ctx.cat) return;
        mountCat(ctx.cat, ctx.scene);
        resetCatToHome(ctx.cat);
        setCatVisible(ctx.cat, false);
      },
      onArrive(ctx) {
        if (!ctx.cat) return;
        startCatQAShow(ctx.cat);
      },
      onLeave(ctx) {
        if (ctx.questionMarks) setQuestionMarksVisible(ctx.questionMarks, false);
        if (!ctx.cat) return;
        clearCatQAState(ctx.cat);
        setCatVisible(ctx.cat, false);
        resetCatToHome(ctx.cat);
      },
      update(ctx) {
        if (ctx.cat?.root.visible) updateCatQAHandoff(ctx.cat);
      },
    },
  ];
}
