"use strict";

function fitImageToViewport() {
  const img = state.image;
  assert(img, "fitImageToViewport: no image");
  assert(state.viewport.w > 0, "fitImageToViewport: invalid viewport width");
  assert(state.viewport.h > 0, "fitImageToViewport: invalid viewport height");

  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const marginW = state.viewport.w * CENTER_MARGIN * 2;
  const marginH = state.viewport.h * CENTER_MARGIN * 2;

  const scale = Math.min(
    1,
    (state.viewport.w - marginW) / imgW,
    (state.viewport.h - marginH) / imgH,
  );
  const tx = (state.viewport.w - imgW * scale) / 2;
  const ty = (state.viewport.h - imgH * scale) / 2;

  assert(scale > 0, "fitImageToViewport: scale must be positive");

  state.baseScale = scale;
  state.zoom = 1.0;
  state.imageTransform.tx = tx;
  state.imageTransform.ty = ty;
}

function recalculateLayout() {
  if (!state.image) return;
  const { w: oldVpW, h: oldVpH } = state.viewport;
  const { tx: oldTx, ty: oldTy } = state.imageTransform;
  const oldBaseScale = state.baseScale;
  const oldZoom = state.zoom;

  const viewport = document.getElementById("viewport");
  if (!viewport) return;
  state.viewport.w = viewport.clientWidth;
  state.viewport.h = viewport.clientHeight;

  // Get the image coordinate that was at the center of the old viewport
  const oldScale = oldBaseScale * oldZoom;
  const centerX_img = (oldVpW / 2 - oldTx) / oldScale;
  const centerY_img = (oldVpH / 2 - oldTy) / oldScale;

  // Recalculate baseScale based on the new viewport size
  const img = state.image;
  const marginW = state.viewport.w * CENTER_MARGIN * 2;
  const marginH = state.viewport.h * CENTER_MARGIN * 2;
  const newBaseScale = Math.min(
    1,
    (state.viewport.w - marginW) / img.naturalWidth,
    (state.viewport.h - marginH) / img.naturalHeight,
  );
  state.baseScale = newBaseScale;

  // Calculate the new transform to keep the same image coordinate at the new center
  const newScale = newBaseScale * oldZoom;
  const newTx = state.viewport.w / 2 - centerX_img * newScale;
  const newTy = state.viewport.h / 2 - centerY_img * newScale;

  animateToTransform({ tx: newTx, ty: newTy }, true);
}

function computeCenteredTransform() {
  const img = state.image;
  if (!img || !state.viewport.w || !state.viewport.h) return null;

  const { x, y, w, h } = state.crop;
  const { tx, ty } = state.imageTransform;
  const currentScale = state.baseScale * state.zoom;

  assert(currentScale > 0, "computeCenteredTransform: invalid scale");
  validateCrop(state.crop);

  const cropCxOnPreview = (x + w / 2) / state.previewScale;
  const cropCyOnPreview = (y + h / 2) / state.previewScale;
  const cropCxScreen = tx + cropCxOnPreview * currentScale;
  const cropCyScreen = ty + cropCyOnPreview * currentScale;

  const viewportCx = state.viewport.w / 2;
  const viewportCy = state.viewport.h / 2;

  let dx = viewportCx - cropCxScreen;
  let dy = viewportCy - cropCyScreen;

  const marginX = state.viewport.w * CENTER_MARGIN;
  const marginY = state.viewport.h * CENTER_MARGIN;
  const left = tx + (x / state.previewScale) * currentScale + dx;
  const top = ty + (y / state.previewScale) * currentScale + dy;
  const right = left + (w / state.previewScale) * currentScale;
  const bottom = top + (h / state.previewScale) * currentScale;

  if (left < marginX) dx += marginX - left;
  if (right > state.viewport.w - marginX)
    dx -= right - (state.viewport.w - marginX);
  if (top < marginY) dy += marginY - top;
  if (bottom > state.viewport.h - marginY)
    dy -= bottom - (state.viewport.h - marginY);

  return { tx: tx + dx, ty: ty + dy };
}

function animateToTransform(target, immediate = false) {
  if (!target) return;
  if (immediate) {
    if (target.tx !== undefined) state.imageTransform.tx = target.tx;
    if (target.ty !== undefined) state.imageTransform.ty = target.ty;
    if (target.zoom !== undefined) state.zoom = target.zoom;
    requestRender();
    return;
  }

  state.committing = true;
  requestRender();

  setTimeout(() => {
    if (target.tx !== undefined) state.imageTransform.tx = target.tx;
    if (target.ty !== undefined) state.imageTransform.ty = target.ty;
    if (target.zoom !== undefined) state.zoom = target.zoom;
    requestRender();

    setTimeout(() => {
      state.committing = false;
      requestRender();
    }, TRANSITION_MS + 30);
  }, 16);
}

function scheduleCommit() {
  if (state.commitTimer) clearTimeout(state.commitTimer);

  state.commitTimer = setTimeout(() => {
    state.commitTimer = null;
    if (!state.image) return;
    const target = computeCenteredTransform();
    animateToTransform(target);
  }, COMMIT_DELAY);
}

function setZoom(targetZoom, focalPoint) {
  const newZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
  if (Math.abs(newZoom - state.zoom) < EPSILON) return;

  const s1 = state.baseScale * state.zoom;
  const s2 = state.baseScale * newZoom;
  const { tx: tx1, ty: ty1 } = state.imageTransform;
  const { x: fx, y: fy } = focalPoint;

  const ix = (fx - tx1) / s1;
  const iy = (fy - ty1) / s1;

  const tx2 = fx - ix * s2;
  const ty2 = fy - iy * s2;

  animateToTransform({ tx: tx2, ty: ty2, zoom: newZoom }, true);
}

function zoomToFit(immediate = false) {
  if (!state.image) return;
  const img = state.image;
  const marginW = state.viewport.w * CENTER_MARGIN * 2;
  const marginH = state.viewport.h * CENTER_MARGIN * 2;
  const newBaseScale = Math.min(
    1,
    (state.viewport.w - marginW) / img.naturalWidth,
    (state.viewport.h - marginH) / img.naturalHeight,
  );

  state.baseScale = newBaseScale;
  const targetZoom = 1.0;

  const targetTx = (state.viewport.w - img.naturalWidth * newBaseScale) / 2;
  const targetTy = (state.viewport.h - img.naturalHeight * newBaseScale) / 2;

  animateToTransform(
    { tx: targetTx, ty: targetTy, zoom: targetZoom },
    immediate,
  );
}

function zoomToActual(immediate = false) {
  if (!state.image) return;

  // CRITICAL FIX: The correct zoom multiplier to achieve a 1:1 pixel mapping.
  const targetZoom = state.previewScale / state.baseScale;

  const focalPoint = { x: state.viewport.w / 2, y: state.viewport.h / 2 };
  const s1 = state.baseScale * state.zoom;
  const s2 = state.baseScale * targetZoom;
  const { tx: tx1, ty: ty1 } = state.imageTransform;
  const { x: fx, y: fy } = focalPoint;
  const ix = (fx - tx1) / s1;
  const iy = (fy - ty1) / s1;
  const targetTx = fx - ix * s2;
  const targetTy = fy - iy * s2;

  animateToTransform(
    { tx: targetTx, ty: targetTy, zoom: targetZoom },
    immediate,
  );
}

function beginInteract() {
  if (state.commitTimer) clearTimeout(state.commitTimer);
  state.committing = false;
  requestRender();
}

function applyAspectToCrop(ratio) {
  const img = state.fullImage || state.image;
  assert(img, "applyAspectToCrop: no image");
  assert(ratio > 0, "applyAspectToCrop: ratio must be positive");
  validateAspectRatio(ratio);

  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  let w, h;
  if (imgW / imgH > ratio) {
    h = imgH;
    w = h * ratio;
  } else {
    w = imgW;
    h = w / ratio;
  }

  assert(w > 0 && w <= imgW, "applyAspectToCrop: invalid width");
  assert(h > 0 && h <= imgH, "applyAspectToCrop: invalid height");

  state.crop = { x: (imgW - w) / 2, y: (imgH - h) / 2, w, h };
  validateCrop(state.crop);
}
