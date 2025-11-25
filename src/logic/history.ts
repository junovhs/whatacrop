import { state, Snapshot, validateCrop } from '../state';
import { requestRender } from '../ui/render';
import { updatePresetTriggers } from '../ui/presets';
import { syncExportInputsToCrop } from '../ui/export';
import { EPSILON } from '../constants';

const MAX_HISTORY = 50;

export function initHistory(): void {
  state.history = [];
  state.historyIndex = -1;
}

export function pushHistory(label: string): void {
  // If we are in the middle of the stack, chop off the future
  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }

  const snapshot = createSnapshot();

  // Deduplication
  if (state.historyIndex >= 0) {
    const current = state.history[state.historyIndex];
    if (areSnapshotsEqual(current, snapshot)) return;
  }

  state.history.push(snapshot);

  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  } else {
    state.historyIndex++;
  }
  
  console.log(`[History] Pushed: ${label}`);
}

export function undo(): void {
  if (state.historyIndex <= 0) return;

  state.historyIndex--;
  const prev = state.history[state.historyIndex];
  restoreSnapshot(prev);
  requestRender();
}

export function redo(): void {
  if (state.historyIndex >= state.history.length - 1) return;

  state.historyIndex++;
  const next = state.history[state.historyIndex];
  restoreSnapshot(next);
  requestRender();
}

function createSnapshot(): Snapshot {
  return {
    crop: { ...state.crop },
    imageTransform: { ...state.imageTransform },
    mode: state.mode,
    aspectRatio: state.aspectRatio,
    exportW: state.exportW,
    exportH: state.exportH,
    activePresetKey: state.activePresetKey,
    timestamp: Date.now(),
  };
}

function restoreSnapshot(snap: Snapshot | undefined): void {
  if (!snap) return;

  state.crop = { ...snap.crop };
  state.imageTransform = { ...snap.imageTransform };
  state.mode = snap.mode;
  state.aspectRatio = snap.aspectRatio;
  state.exportW = snap.exportW;
  state.exportH = snap.exportH;
  state.activePresetKey = snap.activePresetKey;

  validateCrop(state.crop);

  updatePresetTriggers();
  syncExportInputsToCrop();
}

function areSnapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  return (
    Math.abs(a.crop.x - b.crop.x) < EPSILON &&
    Math.abs(a.crop.y - b.crop.y) < EPSILON &&
    Math.abs(a.crop.w - b.crop.w) < EPSILON &&
    Math.abs(a.crop.h - b.crop.h) < EPSILON &&
    a.mode === b.mode &&
    Math.abs(a.aspectRatio - b.aspectRatio) < EPSILON
  );
}