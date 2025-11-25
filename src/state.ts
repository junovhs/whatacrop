import { Mode, MIN_CROP, EPSILON } from './constants';
import { Rect, Viewport, ImageTransform, DragState, Result, Ok, Err } from './types';

export interface Snapshot {
  crop: Rect;
  imageTransform: ImageTransform;
  mode: Mode;
  aspectRatio: number;
  exportW: string;
  exportH: string;
  activePresetKey: string | null;
  timestamp: number;
}

export interface AppState {
  image: HTMLImageElement | null;
  fullImage: HTMLImageElement | null;
  previewScale: number;
  crop: Rect;
  viewport: Viewport;
  imageTransform: ImageTransform;
  baseScale: number;
  zoom: number;
  drag: DragState | null;
  committing: boolean;
  commitTimer: number | null;
  needsRender: boolean;
  mode: Mode;
  aspectRatio: number;
  exportW: string;
  exportH: string;
  activePresetKey: string | null;
  presetLabels: Record<string, string>;
  customAspectActive: boolean;
  customAspectW: string;
  customAspectH: string;
  customAspectLabel: string;
  customPixelActive: boolean;
  customPixelW: string;
  customPixelH: string;
  showGrid: boolean;
  scaleFactor: number;
  scaleLevel: string;
  
  // History
  history: Snapshot[];
  historyIndex: number;
}

export const state: AppState = {
  image: null,
  fullImage: null,
  previewScale: 1,
  crop: { x: 0, y: 0, w: 0, h: 0 },
  viewport: { w: 0, h: 0 },
  imageTransform: { tx: 0, ty: 0 },
  baseScale: 1,
  zoom: 1,
  drag: null,
  committing: false,
  commitTimer: null,
  needsRender: false,
  mode: Mode.NONE,
  aspectRatio: 0,
  exportW: "",
  exportH: "",
  activePresetKey: null,
  presetLabels: {
    social: "Social Media",
    docs: "Documents",
    "custom-pixel": "Custom Pixels",
  },
  customAspectActive: false,
  customAspectW: "",
  customAspectH: "",
  customAspectLabel: "Custom",
  customPixelActive: false,
  customPixelW: "",
  customPixelH: "",
  showGrid: true,
  scaleFactor: 1,
  scaleLevel: "ok",
  
  history: [],
  historyIndex: -1,
};

export function validateCrop(crop: Rect): Result<boolean, string> {
  if (crop.x < -EPSILON) return Err("x must be >= 0");
  if (crop.y < -EPSILON) return Err("y must be >= 0");
  if (crop.w < MIN_CROP) return Err("w too small");
  if (crop.h < MIN_CROP) return Err("h too small");
  return Ok(true);
}

export function setMode(newMode: Mode): void {
  state.mode = newMode;
}

export function clearAllSelections(): void {
  state.mode = Mode.NONE;
  state.aspectRatio = 0;
  state.exportW = "";
  state.exportH = "";
  state.activePresetKey = null;
  state.customAspectActive = false;
  state.customAspectW = "";
  state.customAspectH = "";
  state.customAspectLabel = "Custom";
  state.customPixelActive = false;
  state.customPixelW = "";
  state.customPixelH = "";
  state.presetLabels.social = "Social Media";
  state.presetLabels.docs = "Documents";
  state.presetLabels["custom-pixel"] = "Custom Pixels";
}

export function markPresetActive(key: string, label: string): void {
  if (key in state.presetLabels) {
    state.activePresetKey = key;
    state.presetLabels[key] = label;
  }
}