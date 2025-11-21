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
  // 1. Determine direction (-1 for Left/Top, 1 for Right/Bottom)
  const dirX = handle.includes("w") ? -1 : 1;
  const dirY = handle.includes("n") ? -1 : 1;

  // 2. Calculate proposed change relative to box size (positive = growing)
  const localDx = dx * dirX;
  const localDy = dy * dirY;

  // 3. Determine dominant axis to prevent "stuck" feeling
  const xIsDominant = Math.abs(localDx) > Math.abs(localDy * aspect);

  let proposedW, proposedH;

  if (xIsDominant) {
    proposedW = Math.max(MIN_CROP, crop.w + localDx);
    proposedH = proposedW / aspect;
  } else {
    proposedH = Math.max(MIN_CROP, crop.h + localDy);
    proposedW = proposedH * aspect;
  }

  applyLockedConstraint(crop, proposedW, proposedH, dirX, dirY, limits, aspect);
}

function resizeLockedEdge(crop, handle, dx, dy, aspect, limits) {
  // Locked edges expand the perpendicular dimension to maintain ratio.
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
  // The "Anchor" is the side of the box that DOESN'T move.
  // If dirX is -1 (growing Left), Anchor is Right Edge.
  // If dirX is 0 (Center), Anchor is Center X.

  let maxAvailableW = Infinity;
  let maxAvailableH = Infinity;

  // X Constraints
  if (dirX === -1) {
    // Anchor is Right Edge (crop.x + crop.w). Space to Left is that value.
    maxAvailableW = crop.x + crop.w;
  } else if (dirX === 1) {
    // Anchor is Left Edge (crop.x). Space to Right is mw - crop.x.
    maxAvailableW = mw - crop.x;
  } else {
    // Anchor is Center. Max Width is 2x distance to nearest edge.
    const cx = crop.x + crop.w / 2;
    maxAvailableW = Math.min(cx, mw - cx) * 2;
  }

  // Y Constraints
  if (dirY === -1) {
    // Anchor is Bottom Edge.
    maxAvailableH = crop.y + crop.h;
  } else if (dirY === 1) {
    // Anchor is Top Edge.
    maxAvailableH = mh - crop.y;
  } else {
    // Anchor is Center.
    const cy = crop.y + crop.h / 2;
    maxAvailableH = Math.min(cy, mh - cy) * 2;
  }

  // 2. Determine Limiting Dimension (Geometry + Aspect Ratio)
  // We must fit in `maxAvailableW` AND `maxAvailableH`.
  // Convert height-limit to width-limit using aspect ratio to compare.
  const wAllowedByH = maxAvailableH * aspect;
  const maxW = Math.min(maxAvailableW, wAllowedByH);

  // 3. Clamp
  // Use the smaller of: the user's desired size OR the max geometric size
  let finalW = Math.min(proposedW, maxW);
  let finalH = finalW / aspect;

  // 4. Calculate Final Position
  // Now we apply the clamped size relative to the anchors.
  let newX = crop.x;
  let newY = crop.y;

  if (dirX === -1)
    newX = crop.x + crop.w - finalW; // Right - W
  else if (dirX === 1)
    newX = crop.x; // Left stays
  else newX = crop.x + crop.w / 2 - finalW / 2; // Center - W/2

  if (dirY === -1)
    newY = crop.y + crop.h - finalH; // Bottom - H
  else if (dirY === 1)
    newY = crop.y; // Top stays
  else newY = crop.y + crop.h / 2 - finalH / 2; // Center - H/2

  // 5. Final Safety Clamp (floating point errors)
  crop.w = finalW;
  crop.h = finalH;
  crop.x = clamp(newX, 0, mw - finalW);
  crop.y = clamp(newY, 0, mh - finalH);
}
