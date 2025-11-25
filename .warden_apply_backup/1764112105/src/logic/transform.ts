import { state } from '../state';
import { CENTER_MARGIN, TRANSITION_MS, MIN_ZOOM, MAX_ZOOM, COMMIT_DELAY, EPSILON } from '../constants';
import { clamp } from '../utils';
import { requestRender } from '../ui/render';

export function fitImageToViewport(): void {
  const img = state.image;
  if (!img) return;

  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const marginW = state.viewport.w * CENTER_MARGIN * 2;
  const marginH = state.viewport.h * CENTER_MARGIN * 2;

  const scale = Math.min(
    1,
    (state.viewport.w - marginW) / imgW,
    (state.viewport.h - marginH) / imgH,
  );
  
  state.baseScale = scale;
  state.zoom = 1.0;
  state.imageTransform.tx = (state.viewport.w - imgW * scale) / 2;
  state.imageTransform.ty = (state.viewport.h - imgH * scale) / 2;
}

export function recalculateLayout(): void {
  if (!state.image) return;
  const oldVpW = state.viewport.w;
  const oldVpH = state.viewport.h;
  const oldZoom = state.zoom;

  const viewport = document.getElementById("viewport");
  if (!viewport) return;
  state.viewport.w = viewport.clientWidth;
  state.viewport.h = viewport.clientHeight;

  const oldScale = state.baseScale * oldZoom;
  const cx = (oldVpW / 2 - state.imageTransform.tx) / oldScale;
  const cy = (oldVpH / 2 - state.imageTransform.ty) / oldScale;

  fitImageToViewport(); // Recalculates baseScale and center transform
  
  // Re-apply zoom to keep center
  const newBaseScale = state.baseScale;
  const newScale = newBaseScale * oldZoom;
  const newTx = state.viewport.w / 2 - cx * newScale;
  const newTy = state.viewport.h / 2 - cy * newScale;

  animateToTransform({ tx: newTx, ty: newTy, zoom: oldZoom }, true);
}

export function computeCenteredTransform(): { tx: number; ty: number } | null {
  const img = state.image;
  if (!img) return null;

  const { x, y, w, h } = state.crop;
  const { tx, ty } = state.imageTransform;
  const currentScale = state.baseScale * state.zoom;
  
  const cropCxScreen = tx + ((x + w / 2) / state.previewScale) * currentScale;
  const cropCyScreen = ty + ((y + h / 2) / state.previewScale) * currentScale;

  const dx = (state.viewport.w / 2) - cropCxScreen;
  const dy = (state.viewport.h / 2) - cropCyScreen;

  return { tx: tx + dx, ty: ty + dy };
}

export function animateToTransform(target: { tx?: number; ty?: number; zoom?: number }, immediate = false): void {
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

export function setZoom(targetZoom: number, focalPoint: { x: number; y: number }): void {
  const newZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
  if (Math.abs(newZoom - state.zoom) < EPSILON) return;

  const s1 = state.baseScale * state.zoom;
  const s2 = state.baseScale * newZoom;
  const { tx: tx1, ty: ty1 } = state.imageTransform;
  
  const ix = (focalPoint.x - tx1) / s1;
  const iy = (focalPoint.y - ty1) / s1;

  const tx2 = focalPoint.x - ix * s2;
  const ty2 = focalPoint.y - iy * s2;

  animateToTransform({ tx: tx2, ty: ty2, zoom: newZoom }, true);
}

export function scheduleCommit(): void {
  if (state.commitTimer) clearTimeout(state.commitTimer);
  state.commitTimer = window.setTimeout(() => {
    state.commitTimer = null;
    if (!state.image) return;
    const target = computeCenteredTransform();
    if (target) animateToTransform(target);
  }, COMMIT_DELAY);
}

export function zoomToFit(immediate = false): void {
  if (!state.image) return;
  const { w: cropW, h: cropH } = state.crop;
  const cropDisplayW = cropW / state.previewScale;
  const cropDisplayH = cropH / state.previewScale;

  const marginW = state.viewport.w * CENTER_MARGIN * 2;
  const marginH = state.viewport.h * CENTER_MARGIN * 2;

  if (cropDisplayW === 0 || cropDisplayH === 0) return;

  const targetZoom = Math.min(
    (state.viewport.w - marginW) / cropDisplayW / state.baseScale,
    (state.viewport.h - marginH) / cropDisplayH / state.baseScale,
  );

  const target = computeCenteredTransform();
  if (target) {
    animateToTransform({ ...target, zoom: targetZoom }, immediate);
  }
}