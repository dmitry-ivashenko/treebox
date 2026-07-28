import type { EasingType } from "../tabs/types";

export const linear = (t: number): number => t;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInCubic = (t: number): number => t * t * t;

export function getEasingFn(type?: EasingType): (t: number) => number {
  switch (type) {
    case "linear": return linear;
    case "ease-in": return easeInCubic;
    case "ease-out": return easeOutCubic;
    case "ease-in-out": return easeInOutCubic;
    default: return easeInOutCubic;
  }
}
