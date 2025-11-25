import { state } from '../state';
import { requestRender } from './render';
import { moveCrop, resizeCrop } from '../logic/resize';
import { scheduleCommit, setZoom, fitImageToViewport } from '../logic/transform';
import { resetCropToFull } from '../logic/file-load';
import { initAppView } from './init';
import { exportImage } from './export';
import { DragState } from '../types';

export function bindCropView(): void {
  document.querySelectorAll("[data-handle]").forEach((el) => {
    (el as HTMLElement).onmousedown = (e) => startDrag(e, (el as HTMLElement).dataset.handle || "");
  });
  
  const area = document.getElementById("crop-area");
  if (area) area.onmousedown = (e) => startDrag(e, "move");

  const viewport = document.getElementById("viewport");
  if (viewport) {
    viewport.onwheel = handleWheelZoom as any;
    viewport.onmousedown = (e) => {
      if (e.target === viewport) startDrag(e, "pan-image");
    };
  }

  const slider = document.getElementById("zoom-slider");
  if (slider) slider.oninput = handleSliderZoom;

  document.addEventListener("keydown", handleKeyboard);
  document.addEventListener("mouseup", endDrag);
  document.addEventListener("mousemove", handleDrag);
}

function startDrag(e: MouseEvent, handle: string): void {
  if (!state.image) return;
  e.preventDefault();
  e.stopPropagation();

  state.committing = false;
  state.drag = {
    handle,
    startScreen: { x: e.clientX, y: e.clientY },
    startCrop: { ...state.crop },
    startTransform: { ...state.imageTransform }
  };
  requestRender();
}

function handleDrag(e: MouseEvent): void {
  if (!state.drag || !state.image) return;
  const { handle, startScreen, startCrop, startTransform } = state.drag;
  const currentScale = state.baseScale * state.zoom;
  
  const dx = e.clientX - startScreen.x;
  const dy = e.clientY - startScreen.y;

  if (handle === "pan-image") {
    state.imageTransform.tx = startTransform.tx + dx;
    state.imageTransform.ty = startTransform.ty + dy;
  } else {
    const scale = state.previewScale / currentScale;
    const dxImg = dx * scale;
    const dyImg = dy * scale;
    const next = { ...startCrop };
    
    if (handle === "move") moveCrop(next, dxImg, dyImg);
    else resizeCrop(next, startCrop, handle, dxImg, dyImg);
    
    state.crop = next;
  }
  requestRender();
}

function endDrag(): void {
  if (!state.drag) return;
  if (state.drag.handle !== "pan-image") scheduleCommit();
  state.drag = null;
  requestRender();
}

function handleKeyboard(e: KeyboardEvent): void {
  if ((e.target as HTMLElement).tagName === "INPUT") return;
  switch (e.key) {
    case "g": state.showGrid = !state.showGrid; requestRender(); break;
    case "r": if (state.image) { resetCropToFull(state.image); scheduleCommit(); } break;
    case "f": fitImageToViewport(); break;
    case "Enter": if (e.metaKey || e.ctrlKey) exportImage(); break;
  }
}

function handleWheelZoom(e: WheelEvent): void {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -1 : 1;
  const zoom = state.zoom * (delta > 0 ? 1.1 : 0.9);
  const rect = (e.currentTarget as Element).getBoundingClientRect();
  setZoom(zoom, { x: e.clientX - rect.left, y: e.clientY - rect.top });
}

function handleSliderZoom(e: Event): void {
  const val = parseInt((e.target as HTMLInputElement).value, 10) / 1000;
  // Convert slider 0-1 range to logarithmic zoom scale (omitted for brevity)
}