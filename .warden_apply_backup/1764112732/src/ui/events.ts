import { state } from '../state';
import { requestRender } from './render';
import { moveCrop, resizeCrop } from '../logic/resize';
import { scheduleCommit, setZoom, fitImageToViewport } from '../logic/transform';
import { resetCropToFull } from '../logic/file-load';
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
  
  // Ensure we have a valid start state
  const startScreen = { x: e.clientX, y: e.clientY };
  
  state.drag = {
    handle,
    startScreen,
    startCrop: { ...state.crop },
    startTransform: { ...state.imageTransform }
  };
  
  const overlay = document.getElementById("crop-overlay");
  if (overlay) overlay.classList.add("dragging");

  requestRender();
}

function handleDrag(e: MouseEvent): void {
  if (!state.drag || !state.image) return;
  const { handle, startScreen, startCrop, startTransform } = state.drag;
  
  const currentScale = state.baseScale * state.zoom;
  if (currentScale <= 0) return;

  const dx = e.clientX - startScreen.x;
  const dy = e.clientY - startScreen.y;

  if (handle === "pan-image") {
    state.imageTransform.tx = startTransform.tx + dx;
    state.imageTransform.ty = startTransform.ty + dy;
  } else {
    // Convert screen pixels to full image pixels
    // Formula: ScreenDelta * (FullImageSize / ScreenImageSize)
    // ScreenImageSize = PreviewImageSize * currentScale
    // Factor = (Full / Preview) / currentScale = previewScale / currentScale
    const scaleFactor = state.previewScale / currentScale;
    const dxImg = dx * scaleFactor;
    const dyImg = dy * scaleFactor;
    
    const next = { ...startCrop };
    
    if (handle === "move") {
      moveCrop(next, dxImg, dyImg);
    } else {
      resizeCrop(next, startCrop, handle, dxImg, dyImg);
    }
    
    state.crop = next;
  }
  requestRender();
}

function endDrag(): void {
  if (!state.drag) return;
  
  const overlay = document.getElementById("crop-overlay");
  if (overlay) overlay.classList.remove("dragging");

  if (state.drag.handle !== "pan-image") {
    scheduleCommit();
  }
  
  state.drag = null;
  requestRender();
}

function handleKeyboard(e: KeyboardEvent): void {
  if ((e.target as HTMLElement).tagName === "INPUT") return;
  
  switch (e.key) {
    case "g": 
      state.showGrid = !state.showGrid; 
      requestRender(); 
      break;
    case "r": 
      if (state.image) { 
        resetCropToFull(state.fullImage || state.image); 
        scheduleCommit(); 
      } 
      break;
    case "f": 
      fitImageToViewport(); 
      requestRender();
      break;
    case "Enter": 
      if (e.metaKey || e.ctrlKey) exportImage(); 
      break;
  }
}

function handleWheelZoom(e: WheelEvent): void {
  if (!state.image) return;
  e.preventDefault();
  
  // Standardize wheel delta
  const delta = e.deltaY > 0 ? -1 : 1;
  const zoomFactor = 1.1;
  const newZoom = state.zoom * (delta > 0 ? zoomFactor : 1 / zoomFactor);
  
  const rect = (e.currentTarget as Element).getBoundingClientRect();
  const focalPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  
  setZoom(newZoom, focalPoint);
}

function handleSliderZoom(e: Event): void {
  if (!state.image) return;
  const val = parseInt((e.target as HTMLInputElement).value, 10);
  
  // Logarithmic zoom slider mapping
  const minLog = Math.log(0.1);
  const maxLog = Math.log(32.0);
  const scale = (maxLog - minLog) / 1000;
  const newZoom = Math.exp(minLog + scale * val);
  
  setZoom(newZoom, { x: state.viewport.w / 2, y: state.viewport.h / 2 });
}