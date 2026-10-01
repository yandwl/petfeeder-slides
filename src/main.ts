import { preloadCat } from "./catAsset";
import { createFeeder } from "./feeder";
import { createPartsKit } from "./parts";
import { preloadQuestionMarks } from "./questionMarks";
import { SlidePresentation } from "./SlidePresentation";
import { createDemoSlides } from "./demoSlides";

const canvas = document.getElementById("webgl");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas #webgl not found");
}

const presentation = new SlidePresentation(canvas);
presentation.setFeeder(createFeeder());
presentation.setParts(createPartsKit());

void Promise.all([preloadCat(), preloadQuestionMarks()])
  .then(([cat, questionMarks]) => {
    presentation.setCat(cat);
    presentation.setQuestionMarks(questionMarks);
    presentation.addSlides(createDemoSlides());
  })
  .catch((err) => {
    console.error("Failed to load assets:", err);
    presentation.addSlides(createDemoSlides());
  });
