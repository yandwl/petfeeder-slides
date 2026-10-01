import * as THREE from "three";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerpVector3(
  from: THREE.Vector3,
  to: THREE.Vector3,
  t: number,
  out: THREE.Vector3
): THREE.Vector3 {
  out.x = lerp(from.x, to.x, t);
  out.y = lerp(from.y, to.y, t);
  out.z = lerp(from.z, to.z, t);
  return out;
}
