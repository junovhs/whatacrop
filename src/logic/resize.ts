import { EPSILON, MIN_CROP, Mode } from "../constants";
import { state, validateCrop } from "../state";
import type { Rect } from "../types";
import { assert, clamp, hasChanged } from "../utils";

export function moveCrop(next: Rect, dx: number, dy: number): void {
	const img = state.fullImage || state.image;
	if (!img) return;

	const maxX = Math.max(0, img.naturalWidth - next.w);
	const maxY = Math.max(0, img.naturalHeight - next.h);

	next.x = clamp(next.x + dx, 0, maxX);
	next.y = clamp(next.y + dy, 0, maxY);
}

export function resizeCrop(
	next: Rect,
	start: Rect,
	handle: string,
	dx: number,
	dy: number,
): void {
	const img = state.fullImage || state.image;
	if (!img) return;

	const locked = [
		Mode.ASPECT_RATIO,
		Mode.PIXEL_PRESET,
		Mode.CUSTOM_PIXEL,
	].includes(state.mode);
	const r = locked ? state.aspectRatio : 0;

	if (!locked || r <= 0) {
		resizeFree(next, start, handle, dx, dy, img);
	} else if (handle.length === 2) {
		resizeCornerLocked(next, start, handle, dx, dy, img, r);
	} else {
		resizeEdgeLocked(next, start, handle, dx, dy, img, r);
	}
}

export function applyAspectToCrop(ratio: number): void {
	const img = state.fullImage || state.image;
	if (!img) return;

	// 1. Validate ratio
	if (ratio <= 0) return;

	const imgW = img.naturalWidth;
	const imgH = img.naturalHeight;

	// 2. Calculate max centered crop for this aspect ratio
	let w = imgW;
	let h = w / ratio;

	if (h > imgH) {
		h = imgH;
		w = h * ratio;
	}

	// 3. Update state
	state.crop = {
		x: (imgW - w) / 2,
		y: (imgH - h) / 2,
		w,
		h,
	};

	validateCrop(state.crop);
}

// Internal helpers (same as previous step)
function resizeFree(
	next: Rect,
	start: Rect,
	handle: string,
	dx: number,
	dy: number,
	img: HTMLImageElement,
): void {
	let { x, y, w, h } = start;

	if (handle.includes("e"))
		w = clamp(start.w + dx, MIN_CROP, img.naturalWidth - start.x);
	if (handle.includes("w")) {
		const right = start.x + start.w;
		const maxDx = start.w - MIN_CROP;
		x = clamp(start.x + Math.min(dx, maxDx), 0, right - MIN_CROP);
		w = right - x;
	}
	if (handle.includes("s"))
		h = clamp(start.h + dy, MIN_CROP, img.naturalHeight - start.y);
	if (handle.includes("n")) {
		const bottom = start.y + start.h;
		const maxDy = start.h - MIN_CROP;
		y = clamp(start.y + Math.min(dy, maxDy), 0, bottom - MIN_CROP);
		h = bottom - y;
	}

	if (hasChanged(start, x, y, w, h)) Object.assign(next, { x, y, w, h });
}

function resizeCornerLocked(
	next: Rect,
	start: Rect,
	handle: string,
	dx: number,
	dy: number,
	img: HTMLImageElement,
	r: number,
): void {
	const startRight = start.x + start.w;
	const startBottom = start.y + start.h;
	const ax = handle.includes("w") ? startRight : start.x;
	const ay = handle.includes("n") ? startBottom : start.y;

	const rawDx = handle.includes("w") ? -dx : dx;
	let w = Math.max(MIN_CROP, start.w + rawDx);
	let h = w / r;

	let x = handle.includes("w") ? ax - w : ax;
	let y = handle.includes("n") ? ay - h : ay;

	// Boundary checks
	if (x < 0) {
		w = ax;
		h = w / r;
		x = 0;
	}
	if (y < 0) {
		h = ay;
		w = h * r;
		y = 0;
	}
	if (x + w > img.naturalWidth) {
		w = img.naturalWidth - x;
		h = w / r;
	}
	if (y + h > img.naturalHeight) {
		h = img.naturalHeight - y;
		w = h * r;
	}

	// Double check clamp
	if (x < 0) x = 0;
	if (y < 0) y = 0;
	if (x + w > img.naturalWidth) w = img.naturalWidth - x;
	if (y + h > img.naturalHeight) h = img.naturalHeight - y;

	if (w / r > h) w = h * r;
	else h = w / r;

	if (handle.includes("w")) x = ax - w;
	if (handle.includes("n")) y = ay - h;

	if (hasChanged(start, x, y, w, h)) Object.assign(next, { x, y, w, h });
}

function resizeEdgeLocked(
	next: Rect,
	start: Rect,
	handle: string,
	dx: number,
	dy: number,
	img: HTMLImageElement,
	r: number,
): void {
	const cx = start.x + start.w / 2;
	const cy = start.y + start.h / 2;
	const startRight = start.x + start.w;
	const startBottom = start.y + start.h;

	let x = start.x;
	let y = start.y;
	let w = start.w;
	let h = start.h;

	if (handle === "e" || handle === "w") {
		const sign = handle === "e" ? 1 : -1;
		const potentialW = start.w + dx * sign;
		const maxW_Img = handle === "e" ? img.naturalWidth - start.x : startRight;
		const maxH_Available = 2 * Math.min(cy, img.naturalHeight - cy);
		const maxW = Math.min(maxW_Img, maxH_Available * r);
		w = clamp(potentialW, MIN_CROP, maxW);
		h = w / r;
		y = cy - h / 2;
		x = handle === "e" ? start.x : startRight - w;
	} else if (handle === "n" || handle === "s") {
		const sign = handle === "s" ? 1 : -1;
		const potentialH = start.h + dy * sign;
		const maxH_Img = handle === "s" ? img.naturalHeight - start.y : startBottom;
		const maxW_Available = 2 * Math.min(cx, img.naturalWidth - cx);
		const maxH = Math.min(maxH_Img, maxW_Available / r);
		h = clamp(potentialH, MIN_CROP, maxH);
		w = h * r;
		x = cx - w / 2;
		y = handle === "s" ? start.y : startBottom - h;
	}

	if (hasChanged(start, x, y, w, h)) Object.assign(next, { x, y, w, h });
}
