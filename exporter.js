"use strict";

function onExportInput(dim, val) {
  if (!state.image || !state.crop.w || !state.crop.h) return;
  assert(dim === "w" || dim === "h", "onExportInput: invalid dimension");
  assert(typeof val === "string", "onExportInput: val must be string");

  // If user edits dimensions while a fixed preset is active,
  // gracefully switch them to a custom pixel mode.
  if (state.mode === MODE.PIXEL_PRESET) {
    setMode(MODE.CUSTOM_PIXEL);
  }

  let w = parseInt(state.exportW, 10) || Math.round(state.crop.w);
  let h = parseInt(state.exportH, 10) || Math.round(state.crop.h);
  const nv = parseInt(val, 10);
  if (!(nv > 0)) return;

  if (dim === "w") w = nv;
  else h = nv;

  if (w > MAX_PIXEL_DIM || h > MAX_PIXEL_DIM) return;

  // Recalculate the other dimension if aspect is locked
  const aspectIsLocked =
    state.mode === MODE.ASPECT_RATIO ||
    state.mode === MODE.PIXEL_PRESET ||
    state.mode === MODE.CUSTOM_PIXEL;
  if (aspectIsLocked) {
    const r = state.aspectRatio || getCropAspect() || 1;
    validateAspectRatio(r);
    if (dim === "w") h = Math.round(w / r);
    else w = Math.round(h * r);
  }

  state.exportW = String(w);
  state.exportH = String(h);

  // Update the UI label for the custom preset
  if (state.mode === MODE.CUSTOM_PIXEL) {
    markPresetActive("custom-pixel", `Custom ${w}×${h}`);
  }

  syncExportInputsToCrop();
  updateScaleIndicator();
}

function syncExportInputsToCrop() {
  const ew = document.getElementById("export-w");
  const eh = document.getElementById("export-h");
  if (!ew || !eh) return;
  if (!state.crop.w || !state.crop.h) return;

  const cropW = Math.round(state.crop.w);
  const cropH = Math.round(state.crop.h);
  let w = parseInt(state.exportW, 10);
  let h = parseInt(state.exportH, 10);

  // CORE FIX: For pixel presets, the export dimensions are FIXED and should NOT change.
  if (state.mode === MODE.PIXEL_PRESET) {
    w = parseInt(state.exportW, 10);
    h = parseInt(state.exportH, 10);
  } else if (state.mode === MODE.CUSTOM_PIXEL) {
    if (!(w > 0 && h > 0)) {
      w = cropW;
      h = cropH;
    }
  } else if (state.mode === MODE.ASPECT_RATIO) {
    const r = state.aspectRatio || getCropAspect() || 1;
    if (!(w > 0 && h > 0)) {
      w = cropW;
      h = Math.round(w / r);
    }
    if (w > cropW) w = cropW;
    h = Math.round(w / r);
    if (h > cropH) {
      h = cropH;
      w = Math.round(h * r);
    }
  } else {
    // MODE.NONE
    w = cropW;
    h = cropH;
  }

  if (!(w > 0 && h > 0)) {
    w = cropW;
    h = cropH;
  }
  state.exportW = String(w);
  state.exportH = String(h);
  ew.value = w;
  eh.value = h;
}

function updateScaleIndicator() {
  const el = document.getElementById("scale-indicator");
  if (!el) return;

  const showIndicator =
    state.mode === MODE.CUSTOM_PIXEL || state.mode === MODE.PIXEL_PRESET;
  if (!showIndicator) {
    el.className = "scale-indicator hidden";
    return;
  }

  const cropW = state.crop.w;
  const w = parseInt(state.exportW, 10);
  if (!(cropW > 0 && w > 0)) {
    el.className = "scale-indicator hidden";
    return;
  }

  const scale = cropW / w;
  state.scaleFactor = scale;

  let level = "ok";
  if (scale < 1) level = "bad";
  else if (scale < 1.5) level = "warn";
  state.scaleLevel = level;

  const pct = (scale * 100).toFixed(0);
  let text = `${pct}%`;

  if (level === "ok") text += " (Detail)";
  else if (level === "warn") text += " (Native)";
  else text += " (UPSCALING)";

  el.textContent = text;
  el.className = `scale-indicator ${level}`;
}

function exportImage() {
  if (!state.image) {
    alert("No image loaded");
    return;
  }
  validateCrop(state.crop);

  const w = parseInt(state.exportW, 10) || Math.round(state.crop.w);
  const h = parseInt(state.exportH, 10) || Math.round(state.crop.h);
  if (!(w > 0 && h > 0)) {
    alert("Invalid export dimensions");
    return;
  }
  if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
    alert(`Export dimensions exceed maximum (${MAX_CANVAS_DIM}px)`);
    return;
  }

  const offCanvas = document.createElement("canvas");
  offCanvas.width = w;
  offCanvas.height = h;
  const ctx = offCanvas.getContext("2d");
  if (!ctx) {
    alert("Failed to create export canvas");
    return;
  }

  const srcX = state.crop.x;
  const srcY = state.crop.y;
  const srcW = state.crop.w;
  const srcH = state.crop.h;

  const fullImg = state.fullImage || state.image;
  const maxX = Math.max(0, fullImg.naturalWidth - srcW);
  const maxY = Math.max(0, fullImg.naturalHeight - srcH);
  const clampedX = clamp(srcX, 0, maxX);
  const clampedY = clamp(srcY, 0, maxY);

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(fullImg, clampedX, clampedY, srcW, srcH, 0, 0, w, h);

  offCanvas.toBlob(
    (blob) => {
      if (!blob) {
        alert("Failed to create image blob");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = generateFilename(w, h);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    },
    "image/png",
    1.0,
  );
}

function generateFilename(w, h) {
  const ratio = reduceRatio(w, h);
  const ar = `${ratio.w}-${ratio.h}`;
  const timestamp = Date.now();
  return `crop_${ar}_${w}x${h}_${timestamp}.png`;
}
