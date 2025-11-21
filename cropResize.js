"use strict";

function moveCrop(crop, dx, dy) {
  const img = state.fullImage || state.image;
  assert(img, "moveCrop: no image");
  assert(typeof crop.x === "number", "moveCrop: invalid crop x");

  crop.x = clamp(crop.x + dx, 0, img.naturalWidth - crop.w);
  crop.y = clamp(crop.y + dy, 0, img.naturalHeight - crop.h);

  validateCrop(crop);
}

function resizeCrop(crop, handle, dx, dy, aspectRatio) {
  const img = state.fullImage || state.image;
  assert(img, "resizeCrop: no image");
  assert(typeof handle === "string", "resizeCrop: handle must be string");
  assert(typeof aspectRatio === "number", "resizeCrop: aspect must be number");

  const locked = aspectRatio > 0;
  const limits = { mw: img.naturalWidth, mh: img.naturalHeight };

  if (locked) {
    if (handle.length === 2) {
      resizeLockedCorner(crop, handle, dx, dy, aspectRatio, limits);
    } else {
      resizeLockedEdge(crop, handle, dx, dy, aspectRatio, limits);
    }
  } else {
    resizeFree(crop, handle, dx, dy, limits);
  }

  validateCrop(crop);
}

function resizeFree(crop, handle, dx, dy, limits) {
  const { mw, mh } = limits;

  if (handle.includes("n")) {
    const newH = clamp(crop.h - dy, MIN_CROP, crop.y + crop.h);
    crop.y += crop.h - newH;
    crop.h = newH;
  }
  if (handle.includes("s")) {
    crop.h = clamp(crop.h + dy, MIN_CROP, mh - crop.y);
  }
  if (handle.includes("w")) {
    const newW = clamp(crop.w - dx, MIN_CROP, crop.x + crop.w);
    crop.x += crop.w - newW;
    crop.w = newW;
  }
  if (handle.includes("e")) {
    crop.w = clamp(crop.w + dx, MIN_CROP, mw - crop.x);
  }
}

function resizeLockedCorner(crop, handle, dx, dy, aspect, limits) {
  // 1. Determine direction signs (-1 or 1)
  const dirX = handle.includes("w") ? -1 : 1;
  const dirY = handle.includes("n") ? -1 : 1;

  // 2. Vector Projection: Project the mouse delta onto the Aspect Ratio Diagonal.
  // This prevents jitter/axis-switching by using both dx and dy contributions.
  // Formula: deltaW = (dx*dirX + dy*dirY/aspect) / (1 + 1/aspect^2)

  // Terms derived from dot product of MouseVector and DiagonalVector
  const numerator = dx * dirX + (dy * dirY) / aspect;
  const denominator = 1 + 1 / (aspect * aspect);

  const wChange = numerator / denominator;

  const proposedW = Math.max(MIN_CROP, crop.w + wChange);
  const proposedH = proposedW / aspect;

  applyLockedConstraint(crop, proposedW, proposedH, dirX, dirY, limits, aspect);
}

function resizeLockedEdge(crop, handle, dx, dy, aspect, limits) {
  // For edges, we don't need projection because movement is 1D.
  // dirX/dirY define the "Growth Direction" relative to center.
  // 0 means it grows symmetrically from center on that axis.
  let dirX = 0;
  let dirY = 0;
  let proposedW = crop.w;
  let proposedH = crop.h;

  if (handle === "n") {
    dirY = -1; // Grows Up
    proposedH = Math.max(MIN_CROP, crop.h - dy);
    proposedW = proposedH * aspect;
  } else if (handle === "s") {
    dirY = 1; // Grows Down
    proposedH = Math.max(MIN_CROP, crop.h + dy);
    proposedW = proposedH * aspect;
  } else if (handle === "w") {
    dirX = -1; // Grows Left
    proposedW = Math.max(MIN_CROP, crop.w - dx);
    proposedH = proposedW / aspect;
  } else if (handle === "e") {
    dirX = 1; // Grows Right
    proposedW = Math.max(MIN_CROP, crop.w + dx);
    proposedH = proposedW / aspect;
  }

  applyLockedConstraint(crop, proposedW, proposedH, dirX, dirY, limits, aspect);
}

function applyLockedConstraint(
  crop,
  proposedW,
  proposedH,
  dirX,
  dirY,
  limits,
  aspect,
) {
  const { mw, mh } = limits;

  // 1. Calculate Available Space based on the Anchor Point.
  // The "Anchor" is the side/point of the box that DOESN'T move.
  // crop.x/y/w/h here are from the START of the drag (stable reference).

  let maxAvailableW = Infinity;
  let maxAvailableH = Infinity;

  // X Constraints
  if (dirX === -1) {
    // Anchor is Right Edge. Max Width = Right Edge position.
    maxAvailableW = crop.x + crop.w;
  } else if (dirX === 1) {
    // Anchor is Left Edge. Max Width = Image Width - Left Edge position.
    maxAvailableW = mw - crop.x;
  } else {
    // Anchor is Center. Max Width = 2 * (Distance from Center to nearest vertical edge).
    const cx = crop.x + crop.w / 2;
    maxAvailableW = Math.min(cx, mw - cx) * 2;
  }

  // Y Constraints
  if (dirY === -1) {
    maxAvailableH = crop.y + crop.h;
  } else if (dirY === 1) {
    maxAvailableH = mh - crop.y;
  } else {
    const cy = crop.y + crop.h / 2;
    maxAvailableH = Math.min(cy, mh - cy) * 2;
  }

  // 2. Determine Limiting Dimension
  // The box must fit within BOTH maxAvailableW and maxAvailableH.
  // We normalize maxAvailableH to width-units to find the bottleneck.
  const maxW_from_H = maxAvailableH * aspect;
  const maxW = Math.min(maxAvailableW, maxW_from_H);

  // 3. Clamp proposed size
  let finalW = Math.min(proposedW, maxW);
  let finalH = finalW / aspect;

  // 4. Calculate Final Position
  let newX = crop.x;
  let newY = crop.y;

  if (dirX === -1)
    newX = crop.x + crop.w - finalW; // Anchor Right
  else if (dirX === 1)
    newX = crop.x; // Anchor Left
  else newX = crop.x + crop.w / 2 - finalW / 2; // Anchor Center

  if (dirY === -1)
    newY = crop.y + crop.h - finalH; // Anchor Bottom
  else if (dirY === 1)
    newY = crop.y; // Anchor Top
  else newY = crop.y + crop.h / 2 - finalH / 2; // Anchor Center

  // 5. Commit
  // We use strict clamping at the very end to correct any tiny float errors
  crop.w = finalW;
  crop.h = finalH;
  crop.x = clamp(newX, 0, mw - finalW);
  crop.y = clamp(newY, 0, mh - finalH);
}
