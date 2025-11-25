import { initAppView } from './ui/init';
import { setAspect } from './ui/aspect';
import { exportImage } from './ui/export';
import { resetCropToFull } from './logic/file-load';
import { state } from './state';
import { zoomToFit, setZoom } from './logic/transform';

// Expose globals for HTML event handlers (legacy support during refactor)
(window as any).app = {
  setAspect,
  exportImage,
  resetCrop: () => state.image && resetCropToFull(state.image),
  toggleGrid: () => { state.showGrid = !state.showGrid; },
  zoomToFit,
  zoomToActual: () => setZoom(state.previewScale / state.baseScale, { x: state.viewport.w/2, y: state.viewport.h/2 }),
  newImage: () => location.reload(), // Simplified
  onExportInput: (dim: string, val: string) => {
    if (dim === 'w') state.exportW = val;
    else state.exportH = val;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initAppView();
});