"use strict";

const MAX_HISTORY = 50;

function initHistory() {
  state.history = [];
  state.historyIndex = -1;
}

function pushHistory(label) {
  // If we are in the middle of the stack (undid some steps),
  // chop off the future. We are creating a new timeline.
  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }

  const snapshot = createSnapshot();

  // Deduplication: Don't push if it's identical to the current tip
  // This happens sometimes with minor mouse jitters or rapid clicks
  if (state.historyIndex >= 0) {
    const current = state.history[state.historyIndex];
    if (areSnapshotsEqual(current, snapshot)) return;
  }

  state.history.push(snapshot);

  // Bound the stack size (Circular buffer-ish behavior)
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  } else {
    state.historyIndex++;
  }

  console.log(
    `[History] Pushed: ${label} (${state.historyIndex + 1}/${state.history.length})`,
  );
}

function undo() {
  if (state.historyIndex <= 0) {
    console.warn("[History] Nothing to undo");
    return;
  }

  state.historyIndex--;
  const prev = state.history[state.historyIndex];
  restoreSnapshot(prev);
  requestRender();
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) {
    console.warn("[History] Nothing to redo");
    return;
  }

  state.historyIndex++;
  const next = state.history[state.historyIndex];
  restoreSnapshot(next);
  requestRender();
}

function createSnapshot() {
  // Deep copy only what affects the visual output
  return {
    crop: { ...state.crop },
    imageTransform: { ...state.imageTransform },
    mode: state.mode,
    aspectRatio: state.aspectRatio,
    exportW: state.exportW,
    exportH: state.exportH,
    activePresetKey: state.activePresetKey,
    // We don't track zoom/pan in history usually, but we DO track
    // imageTransform if we want to undo pans. Let's track it all.
    timestamp: Date.now(),
  };
}

function restoreSnapshot(snap) {
  if (!snap) return;

  state.crop = { ...snap.crop };
  state.imageTransform = { ...snap.imageTransform };

  // Restore modes and flags
  state.mode = snap.mode;
  state.aspectRatio = snap.aspectRatio;
  state.exportW = snap.exportW;
  state.exportH = snap.exportH;
  state.activePresetKey = snap.activePresetKey;

  // Re-run validation to ensure UI stays synced
  validateCrop(state.crop);

  // UI Updates
  updateAspectUI();
  updatePresetTriggers();
  syncExportInputsToCrop();

  // Trigger a smooth re-center if the crop jumped significantly
  // or just let renderFrame handle it. For undo, instant is usually better.
}

function areSnapshotsEqual(a, b) {
  // Fast comparison for critical values
  return (
    Math.abs(a.crop.x - b.crop.x) < EPSILON &&
    Math.abs(a.crop.y - b.crop.y) < EPSILON &&
    Math.abs(a.crop.w - b.crop.w) < EPSILON &&
    Math.abs(a.crop.h - b.crop.h) < EPSILON &&
    a.mode === b.mode &&
    Math.abs(a.aspectRatio - b.aspectRatio) < EPSILON
  );
}
