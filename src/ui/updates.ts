import { state } from '../state';
import { gcd } from '../utils';

export function updateCropInfoUI(): void {
  const info = document.getElementById("crop-dimensions");
  const exportDim = document.getElementById("export-dimensions");
  
  if (!state.image) return;

  const w = Math.round(state.crop.w);
  const h = Math.round(state.crop.h);
  
  if (info) {
    const g = gcd(w, h);
    info.textContent = `${w}x${h} (${w/g}:${h/g})`;
  }

  if (exportDim) {
    const ew = parseInt(state.exportW) || w;
    const eh = parseInt(state.exportH) || h;
    exportDim.textContent = `${ew}x${eh}`;
  }
}

export function updateZoomUI(): void {
  const ind = document.getElementById("zoom-indicator");
  if (ind) ind.textContent = `${Math.round(state.zoom * 100)}%`;
}