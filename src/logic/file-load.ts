import { MAX_CANVAS_DIM, PREVIEW_MAX_DIM } from "../constants";
import { clearAllSelections, state, validateCrop } from "../state";
import { Err, Ok, type Result } from "../types";
import { renderCropView, renderLoadingView } from "../ui/init";
import { requestRender } from "../ui/render";
import { recalculateLayout } from "./transform";

export function loadImageFile(file: File): void {
	if (!file) return;
	renderLoadingView();

	const reader = new FileReader();
	reader.onload = (e) => {
		if (typeof e.target?.result !== "string") return;
		const img = new Image();
		img.onload = () => handleImageLoaded(img);
		img.onerror = () => alert("Failed to load image");
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

function handleImageLoaded(img: HTMLImageElement): void {
	const valid = validateImageDimensions(img);
	if (!valid.ok) {
		alert(valid.error);
		return;
	}

	const fullImage = img;
	const maxDim = Math.max(fullImage.naturalWidth, fullImage.naturalHeight);

	if (maxDim > PREVIEW_MAX_DIM) {
		createPreview(fullImage).then(({ preview, scale }) => {
			finalizeLoad(fullImage, preview, scale);
		});
	} else {
		finalizeLoad(fullImage, fullImage, 1);
	}
}

function validateImageDimensions(
	img: HTMLImageElement,
): Result<boolean, string> {
	if (img.naturalWidth <= 0 || img.naturalHeight <= 0)
		return Err("Invalid dimensions");
	if (img.naturalWidth > MAX_CANVAS_DIM || img.naturalHeight > MAX_CANVAS_DIM)
		return Err("Image too large");
	return Ok(true);
}

function createPreview(
	full: HTMLImageElement,
): Promise<{ preview: HTMLImageElement; scale: number }> {
	return new Promise((resolve) => {
		const scale =
			PREVIEW_MAX_DIM / Math.max(full.naturalWidth, full.naturalHeight);
		const w = Math.round(full.naturalWidth * scale);
		const h = Math.round(full.naturalHeight * scale);

		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (ctx) ctx.drawImage(full, 0, 0, w, h);

		const preview = new Image();
		preview.onload = () =>
			resolve({ preview, scale: full.naturalWidth / preview.naturalWidth });
		preview.src = canvas.toDataURL();
	});
}

function finalizeLoad(
	full: HTMLImageElement,
	preview: HTMLImageElement,
	scale: number,
): void {
	state.fullImage = full;
	state.image = preview;
	state.previewScale = scale;

	resetCropToFull(full);
	clearAllSelections();
	state.committing = false;

	renderCropView();
	requestAnimationFrame(() => {
		// CRITICAL FIX: Ensure viewport is measured before first fit
		recalculateLayout();
		requestRender();
	});
}

export function resetCropToFull(img: HTMLImageElement): void {
	state.crop = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
	validateCrop(state.crop);
}
