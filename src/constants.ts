export const MIN_CROP = 20;
export const COMMIT_DELAY = 350;
export const CENTER_MARGIN = 0.15;
export const TRANSITION_MS = 500;
export const MAX_CANVAS_DIM = 16384;
export const EPSILON = 0.001;
export const MAX_ASPECT_VALUE = 100;
export const MAX_PIXEL_DIM = 50000;
export const PREVIEW_MAX_DIM = 4096;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 32.0;

export enum Mode {
  NONE = "none",
  ASPECT_RATIO = "aspect-ratio",
  PIXEL_PRESET = "pixel-preset",
  CUSTOM_PIXEL = "custom-pixel",
}