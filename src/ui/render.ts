import { state } from "../state";
import { syncExportInputsToCrop } from "./export";
import { updatePresetTriggers } from "./presets";
import { updateCropInfoUI, updateZoomUI } from "./updates";

export function requestRender(): void {
	if (state.needsRender) return;
	state.needsRender = true;
	requestAnimationFrame(() => {
		state.needsRender = false;
		renderFrame();
	});
}

function renderFrame(): void {
	const img = state.image;
	if (!img) return;

	const canvas = document.getElementById("canvas") as HTMLCanvasElement;
	const overlay = document.getElementById("crop-overlay");
	if (!canvas || !overlay) return;

	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	if (
		canvas.width !== img.naturalWidth ||
		canvas.height !== img.naturalHeight
	) {
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		ctx.drawImage(img, 0, 0);
	}

	const { tx, ty } = state.imageTransform;
	const { x, y, w, h } = state.crop;
	const currentScale = state.baseScale * state.zoom;

	// CRITICAL FIX: Add image rendering logic for sharp/crisp edges when zoomed
	const screenPixelsPerImagePixel = currentScale / state.previewScale;
	canvas.style.imageRendering =
		screenPixelsPerImagePixel > 2.5 ? "pixelated" : "auto";

	canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${currentScale})`;
	canvas.className = state.committing ? "canvas-committing" : "";
	overlay.className = getOverlayClass();

	updateOverlayStyle(overlay, x, y, w, h, tx, ty, currentScale);

	const gridCanvas = document.getElementById(
		"grid-canvas",
	) as HTMLCanvasElement;
	if (gridCanvas)
		renderGrid(
			gridCanvas,
			(w * currentScale) / state.previewScale,
			(h * currentScale) / state.previewScale,
		);

	updateCropInfoUI();
	updatePresetTriggers();
	syncExportInputsToCrop();
	updateZoomUI();
}

function getOverlayClass(): string {
	if (state.committing) return "crop-overlay committing";
	if (state.drag) return "crop-overlay dragging";
	return "crop-overlay";
}

function updateOverlayStyle(
	overlay: HTMLElement,
	x: number,
	y: number,
	w: number,
	h: number,
	tx: number,
	ty: number,
	scale: number,
) {
	const pScale = state.previewScale;
	const l = tx + (x / pScale) * scale;
	const t = ty + (y / pScale) * scale;
	overlay.style.left = `${l}px`;
	overlay.style.top = `${t}px`;
	overlay.style.width = `${(w / pScale) * scale}px`;
	overlay.style.height = `${(h / pScale) * scale}px`;
}

function renderGrid(canvas: HTMLCanvasElement, w: number, h: number): void {
	if (!state.showGrid) {
		canvas.style.display = "none";
		return;
	}
	canvas.style.display = "block";
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
	}
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	ctx.clearRect(0, 0, w, h);
	ctx.strokeStyle = "rgba(255,255,255,0.25)";
	ctx.lineWidth = 1;
	ctx.beginPath();

	ctx.moveTo(w / 3, 0);
	ctx.lineTo(w / 3, h);
	ctx.moveTo((2 * w) / 3, 0);
	ctx.lineTo((2 * w) / 3, h);
	ctx.moveTo(0, h / 3);
	ctx.lineTo(w, h / 3);
	ctx.moveTo(0, (2 * h) / 3);
	ctx.lineTo(w, (2 * h) / 3);

	ctx.stroke();
}
