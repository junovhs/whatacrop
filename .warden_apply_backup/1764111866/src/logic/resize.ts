import { state } from '../state';
import { assert, clamp, hasChanged } from '../utils';
import { Mode, MIN_CROP } from '../constants';
import { Rect } from '../types';

export function moveCrop(next: Rect, dx: number, dy: number): void {
  const img = state.fullImage || state.image;
  if (!img) return;

  const maxX = Math.max(0, img.naturalWidth - next.w);
  const maxY = Math.max(0, img.naturalHeight - next.h);

  next.x = clamp(next.x + dx, 0, maxX);
  next.y = clamp(next.y + dy, 0, maxY);
}

export function resizeCrop(next: Rect, start: Rect, handle: string, dx: number, dy: number): void {
  const img = state.fullImage || state.image;
  if (!img) return;

  const locked = [Mode.ASPECT_RATIO, Mode.PIXEL_PRESET, Mode.CUSTOM_PIXEL].includes(state.mode);
  const r = locked ? state.aspectRatio : 0;

  if (!locked || r <= 0) {
    resizeFree(next, start, handle, dx, dy, img);
  } else if (handle.length === 2) {
    resizeCornerLocked(next, start, handle, dx, dy, img, r);
  } else {
    resizeEdgeLocked(next, start, handle, dx, dy, img, r);
  }
}

function resizeFree(next: Rect, start: Rect, handle: string, dx: number, dy: number, img: HTMLImageElement): void {
  let { x, y, w, h } = start;

  if (handle.includes("e")) {
    w = clamp(start.w + dx, MIN_CROP, img.naturalWidth - start.x);
  }
  if (handle.includes("w")) {
    const right = start.x + start.w;
    // Ensure we don't drag past the right edge minus min width
    const maxDx = start.w - MIN_CROP;
    const safeDx = Math.min(dx, maxDx);
    x = clamp(start.x + safeDx, 0, right - MIN_CROP);
    w = right - x;
  }
  if (handle.includes("s")) {
    h = clamp(start.h + dy, MIN_CROP, img.naturalHeight - start.y);
  }
  if (handle.includes("n")) {
    const bottom = start.y + start.h;
    const maxDy = start.h - MIN_CROP;
    const safeDy = Math.min(dy, maxDy);
    y = clamp(start.y + safeDy, 0, bottom - MIN_CROP);
    h = bottom - y;
  }

  if (hasChanged(start, x, y, w, h)) Object.assign(next, { x, y, w, h });
}

function resizeCornerLocked(next: Rect, start: Rect, handle: string, dx: number, dy: number, img: HTMLImageElement, r: number): void {
  const startRight = start.x + start.w;
  const startBottom = start.y + start.h;

  const ax = handle.includes("w") ? startRight : start.x; // Anchor X
  const ay = handle.includes("n") ? startBottom : start.y; // Anchor Y

  // 1. Calculate ideal width based on mouse delta
  const rawDx = handle.includes("w") ? -dx : dx;
  let w = Math.max(MIN_CROP, start.w + rawDx);
  let h = w / r;

  // 2. Initial position
  let x = handle.includes("w") ? ax - w : ax;
  let y = handle.includes("n") ? ay - h : ay;

  // 3. Boundary Checks & Corrections
  // Check Horizontal bounds
  if (x < 0) {
    w = ax; 
    h = w / r;
    x = 0;
    y = handle.includes("n") ? ay - h : ay;
  } else if (x + w > img.naturalWidth) {
    w = img.naturalWidth - x;
    h = w / r;
    // If we hit right edge, x stays same (if dragging east). 
    // If dragging west, x is calculated from ax - w.
    // However, if we are here, x+w > width. 
    // If handle is 'ne' or 'se', ax is start.x. x=ax. w is limited.
    // If handle is 'nw' or 'sw', ax is right side. x = ax - w. 
    // Correcting logic:
    if (handle.includes("e")) {
      w = img.naturalWidth - ax;
    } else {
      // West handle, but somehow we are too wide? 
      // This implies ax > image width (impossible) or we calculated x wrong.
      // Re-clamping x usually solves this.
       x = img.naturalWidth - w;
    }
    h = w / r;
    y = handle.includes("n") ? ay - h : ay;
  }

  // Check Vertical bounds
  if (y < 0) {
    h = ay;
    w = h * r;
    y = 0;
    x = handle.includes("w") ? ax - w : ax;
  } else if (y + h > img.naturalHeight) {
    if (handle.includes("s")) {
      h = img.naturalHeight - ay;
    } else {
      // North handle
      y = img.naturalHeight - h;
    }
    w = h * r;
    x = handle.includes("w") ? ax - w : ax;
  }

  // 4. Final Safety Clamp (prevents aspect drift due to double clamping)
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > img.naturalWidth) w = img.naturalWidth - x;
  if (y + h > img.naturalHeight) h = img.naturalHeight - y;
  
  // Recalculate based on stricter constraint
  // If we clamped W, adjust H. If we clamped H, adjust W.
  // This is a simplification; ideally we check which bound is "tighter".
  if (w / r > h) w = h * r;
  else h = w / r;

  if (hasChanged(start, x, y, w, h)) Object.assign(next, { x, y, w, h });
}

function resizeEdgeLocked(next: Rect, start: Rect, handle: string, dx: number, dy: number, img: HTMLImageElement, r: number): void {
  const cx = start.x + start.w / 2;
  const cy = start.y + start.h / 2;
  const startRight = start.x + start.w;
  const startBottom = start.y + start.h;

  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;

  if (handle === "e" || handle === "w") {
    // Horizontal Resize -> Vertical adjusts to match
    const sign = handle === "e" ? 1 : -1;
    let potentialW = start.w + dx * sign;
    
    // Bounds for Width
    const maxW_Img = handle === "e" ? img.naturalWidth - start.x : startRight;
    // Bounds for Height (centered)
    // The height grows from center, so max height is 2 * min distance to top/bottom
    const maxH_Available = 2 * Math.min(cy, img.naturalHeight - cy);
    const maxW_HeightConstrained = maxH_Available * r;

    const maxW = Math.min(maxW_Img, maxW_HeightConstrained);
    w = clamp(potentialW, MIN_CROP, maxW);
    h = w / r;
    y = cy - h / 2;
    x = handle === "e" ? start.x : startRight - w;

  } else if (handle === "n" || handle === "s") {
    // Vertical Resize -> Horizontal adjusts to match
    const sign = handle === "s" ? 1 : -1;
    let potentialH = start.h + dy * sign;

    const maxH_Img = handle === "s" ? img.naturalHeight - start.y : startBottom;
    const maxW_Available = 2 * Math.min(cx, img.naturalWidth - cx);
    const maxH_WidthConstrained = maxW_Available / r;

    const maxH = Math.min(maxH_Img, maxH_WidthConstrained);
    h = clamp(potentialH, MIN_CROP, maxH);
    w = h * r;
    x = cx - w / 2;
    y = handle === "s" ? start.y : startBottom - h;
  }

  if (hasChanged(start, x, y, w, h)) Object.assign(next, { x, y, w, h });
}