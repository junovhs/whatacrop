import { MAX_CANVAS_DIM } from "../constants";
import { state, validateCrop } from "../state";
import { assert, clamp, reduceRatio } from "../utils";

export function generateFilename(w: number, h: number): string {
	const ratio = reduceRatio(w, h);
	return `crop_${ratio.w}-${ratio.h}_${w}x${h}_${Date.now()}.png`;
}

export function createExportBlob(w: number, h: number): Promise<Blob | null> {
	return new Promise((resolve) => {
		if (!state.image) return resolve(null);
		validateCrop(state.crop);

		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) return resolve(null);

		const fullImg = state.fullImage || state.image;
		const { x, y, w: sw, h: sh } = state.crop;

		const sx = clamp(x, 0, fullImg.naturalWidth - sw);
		const sy = clamp(y, 0, fullImg.naturalHeight - sh);

		ctx.drawImage(fullImg, sx, sy, sw, sh, 0, 0, w, h);
		canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
	});
}
