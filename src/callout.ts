import * as THREE from "three";

export class Callout {
  private svg: SVGSVGElement;
  private line: SVGLineElement;
  private tip: SVGCircleElement;
  private target: THREE.Vector3 | null = null;
  private ndc = new THREE.Vector3();

  constructor() {
    const svg = document.getElementById("callout");
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Missing #callout SVG");
    }
    this.svg = svg;
    const line = svg.querySelector("line");
    const tip = svg.querySelector("circle");
    if (!(line instanceof SVGLineElement) || !(tip instanceof SVGCircleElement)) {
      throw new Error("Callout SVG is missing line/circle");
    }
    this.line = line;
    this.tip = tip;
  }

  setTarget(world: THREE.Vector3 | null): void {
    this.target = world ? world.clone() : null;
    if (!this.target) this.svg.classList.remove("visible");
  }

  update(camera: THREE.Camera): void {
    if (!this.target) return;

    const from = document.querySelector<HTMLElement>("[data-callout-from]");
    if (!from) {
      this.svg.classList.remove("visible");
      return;
    }

    this.ndc.copy(this.target).project(camera);
    if (this.ndc.z > 1) {
      this.svg.classList.remove("visible");
      return;
    }

    const x2 = ((this.ndc.x + 1) / 2) * window.innerWidth;
    const y2 = ((-this.ndc.y + 1) / 2) * window.innerHeight;
    const rect = from.getBoundingClientRect();
    const x1 = rect.right;
    const y1 = rect.top + rect.height / 2;

    this.line.setAttribute("x1", String(x1));
    this.line.setAttribute("y1", String(y1));
    this.line.setAttribute("x2", String(x2));
    this.line.setAttribute("y2", String(y2));
    this.tip.setAttribute("cx", String(x2));
    this.tip.setAttribute("cy", String(y2));
    this.svg.classList.add("visible");
  }
}
