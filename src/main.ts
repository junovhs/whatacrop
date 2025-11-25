import { initAppView } from './ui/init';
import { setAspect, toggleCustomAspect, applyCustomAspect } from './ui/aspect';
import { togglePreset, selectPreset, applyCustomPixel } from './ui/presets';
import { exportImage } from './ui/export';
import { resetCropToFull } from './logic/file-load';
import { state } from './state';
import { zoomToFit, setZoom, scheduleCommit } from './logic/transform';
import { requestRender } from './ui/render';

// Expose globals for HTML event handlers
(window as any).app = {
  setAspect,
  toggleCustomAspect,
  applyCustomAspect,
  togglePreset,
  selectPreset,
  applyCustomPixel,
  exportImage,
  
  resetCrop: () => {
    if (state.image) {
      resetCropToFull(state.fullImage || state.image);
      requestRender(); // Fix: Update immediately
      scheduleCommit(); // Fix: Center the image after reset
    }
  },
  
  toggleGrid: () => { 
    state.showGrid = !state.showGrid;
    requestRender(); // Fix: Update immediately
  },
  
  zoomToFit: () => {
    zoomToFit();
    requestRender();
  },
  
  zoomToActual: () => {
    setZoom(state.previewScale / state.baseScale, { x: state.viewport.w/2, y: state.viewport.h/2 });
    requestRender();
  },
  
  newImage: () => location.reload(),
  
  onExportInput: (dim: string, val: string) => {
    if (dim === 'w') state.exportW = val;
    else state.exportH = val;
    requestRender();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initAppView();
});