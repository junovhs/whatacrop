import { resetCropToFull } from "./logic/file-load";
import { scheduleCommit, setZoom, zoomToFit } from "./logic/transform";
import { state } from "./state";
import { applyCustomAspect, setAspect, toggleCustomAspect } from "./ui/aspect";
import { exportImage } from "./ui/export";
import { initAppView } from "./ui/init";
import { applyCustomPixel, selectPreset, togglePreset } from "./ui/presets";
import { requestRender } from "./ui/render";

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
		setZoom(state.previewScale / state.baseScale, {
			x: state.viewport.w / 2,
			y: state.viewport.h / 2,
		});
		requestRender();
	},

	newImage: () => location.reload(),

	onExportInput: (dim: string, val: string) => {
		if (dim === "w") state.exportW = val;
		else state.exportH = val;
		requestRender();
	},
};

document.addEventListener("DOMContentLoaded", () => {
	initAppView();
});
