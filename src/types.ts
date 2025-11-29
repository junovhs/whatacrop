export type Result<T, E = Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export interface Point {
	x: number;
	y: number;
}

export interface Size {
	w: number;
	h: number;
}

export interface Rect extends Point, Size {}

export interface Viewport extends Size {}

export interface ImageTransform {
	tx: number;
	ty: number;
}

export interface DragState {
	handle: string;
	startScreen: Point;
	startCrop: Rect;
	startTransform: ImageTransform;
}
