"use strict";

function moveCrop(next, dx, dy) {
  // Always use the full-res image for boundary calculations
  const img = state.fullImage || state.image;
  assert(img, "moveCrop: no image");
  assert(typeof dx === "number", "moveCrop: dx must be number");
  assert(typeof dy === "number", "moveCrop: dy must be number");

  const maxX = img.naturalWidth - next.w;
  const maxY = img.naturalHeight - next.h;

  next.x = clamp(next.x + dx, 0, Math.max(0, maxX));
  next.y = clamp(next.y + dy, 0, Math.max(0, maxY));

  validateCrop(next);
}

function resizeCrop(next, start, handle, dx, dy) {
  // Always use the full-res image for boundary calculations
  const img = state.fullImage || state.image;
  assert(img, "resizeCrop: no image");
  assert(typeof handle === "string", "resizeCrop: handle must be string");
  assert(handle.length > 0, "resizeCrop: handle cannot be empty");

  const locked =
    state.mode === MODE.ASPECT_RATIO ||
    state.mode === MODE.PIXEL_PRESET ||
    state.mode === MODE.CUSTOM_PIXEL;

  const r = locked ? state.aspectRatio : 0;

  if (!locked || !r || r <= 0) {
    resizeFree(next, start, handle, dx, dy, img);
  } else if (handle.length === 2) {
    resizeCornerLocked(next, start, handle, dx, dy, img, r);
  } else {
    resizeEdgeLocked(next, start, handle, dx, dy, img, r);
  }

  validateCrop(next);
}

function resizeFree(next, start, handle, dx, dy, img) {
  assert(img, "resizeFree: no image");
  assert(handle, "resizeFree: no handle");

  let { x, y, w, h } = start;

  // Horizontal resizing
  if (handle.includes("e")) {
    const newW = start.w + dx;
    w = clamp(newW, MIN_CROP, img.naturalWidth - start.x);
  }
  if (handle.includes("w")) {
    const rightEdge = start.x + start.w;
    const newX = start.x + dx;
    x = clamp(newX, 0, rightEdge - MIN_CROP);
    w = rightEdge - x;
  }

  // Vertical resizing
  if (handle.includes("s")) {
    const newH = start.h + dy;
    h = clamp(newH, MIN_CROP, img.naturalHeight - start.y);
  }
  if (handle.includes("n")) {
    const bottomEdge = start.y + start.h;
    const newY = start.y + dy;
    y = clamp(newY, 0, bottomEdge - MIN_CROP);
    h = bottomEdge - y;
  }

  if (!hasChanged(start, x, y, w, h)) return;

  next.x = x;
  next.y = y;
  next.w = w;
  next.h = h;
}

function resizeCornerLocked(next, start, handle, dx, dy, img, r) {
  assert(img, "resizeCornerLocked: no image");
  assert(r > 0, "resizeCornerLocked: ratio must be positive");
  assert(handle.length === 2, "resizeCornerLocked: handle must be 2 chars");

  const startRight = start.x + start.w;
  const startBottom = start.y + start.h;

  const ax = handle.includes("w") ? startRight : start.x;
  const ay = handle.includes("n") ? startBottom : start.y;

  const sx = handle.includes("w") ? start.x : startRight;
  const sy = handle.includes("n") ? start.y : startBottom;

  const mx = sx + dx;
  const my = sy + dy;

  let w = Math.max(Math.abs(mx - ax), MIN_CROP);
  let h = w / r;

  // Clamp to image bounds while maintaining aspect ratio
  let x = handle.includes("w") ? ax - w : ax;
  let y = handle.includes("n") ? ay - h : ay;

  // Check horizontal bounds
  if (x < 0) {
    w = ax;
    h = w / r;
    x = 0;
    y = handle.includes("n") ? ay - h : ay;
  }
  if (x + w > img.naturalWidth) {
    w = img.naturalWidth - x;
    h = w / r;
    y = handle.includes("n") ? ay - h : ay;
    x = handle.includes("w") ? img.naturalWidth - w : x;
  }

  // Check vertical bounds
  if (y < 0) {
    h = ay;
    w = h * r;
    y = 0;
    x = handle.includes("w") ? ax - w : ax;
  }
  if (y + h > img.naturalHeight) {
    h = img.naturalHeight - y;
    w = h * r;
    y = handle.includes("n") ? img.naturalHeight - h : y;
    x = handle.includes("w") ? ax - w : ax;
  }

  // Final enforcement of MIN_CROP
  w = Math.max(w, MIN_CROP);
  h = Math.max(h, MIN_CROP);
  if (handle.includes("w")) x = ax - w;
  if (handle.includes("n")) y = ay - h;

  if (!hasChanged(start, x, y, w, h)) return;

  next.x = x;
  next.y = y;
  next.w = w;
  next.h = h;
}

function resizeEdgeLocked(next, start, handle, dx, dy, img, r) {
  assert(img, "resizeEdgeLocked: no image");
  assert(r > 0, "resizeEdgeLocked: ratio must be positive");
  assert(handle.length === 1, "resizeEdgeLocked: handle must be 1 char");

  const startRight = start.x + start.w;
  const startBottom = start.y + start.h;
  const cx = start.x + start.w / 2;
  const cy = start.y + start.h / 2;

  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;

  if (handle === "e" || handle === "w") {
    const result = resizeHorizontalEdge(
      handle,
      start,
      dx,
      cy,
      img,
      r,
      startRight,
    );
    x = result.x;
    y = result.y;
    w = result.w;
    h = result.h;
  } else if (handle === "n" || handle === "s") {
    const result = resizeVerticalEdge(
      handle,
      start,
      dy,
      cx,
      img,
      r,
      startBottom,
    );
    x = result.x;
    y = result.y;
    w = result.w;
    h = result.h;
  }

  if (!hasChanged(start, x, y, w, h)) return;

  next.x = x;
  next.y = y;
  next.w = w;
  next.h = h;
}

function resizeHorizontalEdge(handle, start, dx, cy, img, r, startRight) {
  const sign = handle === "e" ? 1 : -1;
  const potentialW = start.w + dx * sign;

  const maxW_X = handle === "e" ? img.naturalWidth - start.x : startRight;
  const maxW_Y = 2 * r * Math.min(cy, img.naturalHeight - cy);
  const maxW = Math.min(maxW_X, maxW_Y);
  const minW = Math.max(MIN_CROP, MIN_CROP * r);
  const w = clamp(potentialW, minW, maxW);
  const h = w / r;
  const x = handle === "e" ? start.x : startRight - w;
  const y = cy - h / 2;

  return { x, y, w, h };
}

function resizeVerticalEdge(handle, start, dy, cx, img, r, startBottom) {
  const sign = handle === "s" ? 1 : -1;
  const potentialH = start.h + dy * sign;

  const maxH_Y = handle === "s" ? img.naturalHeight - start.y : startBottom;
  const maxH_X = (2 / r) * Math.min(cx, img.naturalWidth - cx);
  const maxH = Math.min(maxH_X, maxH_Y);
  const minH = Math.max(MIN_CROP, MIN_CROP / r);
  const h = clamp(potentialH, minH, maxH);
  const w = h * r;
  const y = handle === "s" ? start.y : startBottom - h;
  const x = cx - w / 2;

  return { x, y, w, h };
}

function hasChanged(start, x, y, w, h) {
  const threshold = 0.25;
  return (
    Math.abs(start.x - x) >= threshold ||
    Math.abs(start.y - y) >= threshold ||
    Math.abs(start.w - w) >= threshold ||
    Math.abs(start.h - h) >= threshold
  );
}
