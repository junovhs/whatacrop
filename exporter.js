"use strict";

function onExportInput(dim, val) {
  if (!state.image || !state.crop.w || !state.crop.h) return;
  assert(dim === "w" || dim === "h", "onExportInput: invalid dimension");

  const cleanVal = val.trim();

  if (state.mode === MODE.PIXEL_PRESET) {
    setMode(MODE.CUSTOM_PIXEL);
  }

  let w = parseInt(state.exportW, 10) || 0;
  let h = parseInt(state.exportH, 10) || 0;
  const nv = parseInt(cleanVal, 10);

  if (dim === "w") w = nv || 0;
  else h = nv || 0;

  if (w > MAX_PIXEL_DIM || h > MAX_PIXEL_DIM) return;

  const aspectIsLocked =
    state.mode === MODE.ASPECT_RATIO ||
    state.mode === MODE.PIXEL_PRESET ||
    state.mode === MODE.CUSTOM_PIXEL;
  if (aspectIsLocked && state.aspectRatio > 0) {
    const r = state.aspectRatio;
    if (dim === "w" && w > 0) h = Math.round(w / r);
    else if (dim === "h" && h > 0) w = Math.round(h * r);
  }

  state.exportW = w > 0 ? String(w) : "";
  state.exportH = h > 0 ? String(h) : "";

  if (state.mode === MODE.CUSTOM_PIXEL) {
    markPresetActive("custom-pixel", `Custom ${w || "W"}×${h || "H"}`);
  }

  syncExportInputsToCrop();
  updateInfoDisplays();
}

function syncExportInputsToCrop() {
  const ew = document.getElementById("export-w");
  const eh = document.getElementById("export-h");
  if (!ew || !eh) return;

  const cropW = Math.round(state.crop.w);
  const cropH = Math.round(state.crop.h);
  let wStr = state.exportW;
  let hStr = state.exportH;

  if (state.mode === MODE.PIXEL_PRESET) {
    // Dimensions are fixed by the preset
  } else if (state.mode === MODE.CUSTOM_PIXEL) {
    // User-defined, do nothing
  } else if (state.mode === MODE.ASPECT_RATIO) {
    let w = cropW;
    let h = Math.round(w / state.aspectRatio);
    if (h > cropH) {
      h = cropH;
      w = Math.round(h * state.aspectRatio);
    }
    wStr = String(w);
    hStr = String(h);
  } else {
    // MODE.NONE
    wStr = String(cropW);
    hStr = String(cropH);
  }

  state.exportW = wStr;
  state.exportH = hStr;

  if (document.activeElement !== ew) ew.value = wStr;
  if (document.activeElement !== eh) eh.value = hStr;
}

function updateScaleIndicator() {
  const el = document.getElementById("scale-indicator");
  const hudEl = document.getElementById("hud-scale-indicator");
  if (!el || !hudEl) return;

  const showIndicator =
    state.mode === MODE.CUSTOM_PIXEL || state.mode === MODE.PIXEL_PRESET;

  const w = parseInt(state.exportW, 10);
  const cropW = state.crop.w;

  if (!showIndicator || !(w > 0) || !(cropW > 0)) {
    el.innerHTML = "";
    hudEl.innerHTML = "";
    return;
  }

  const scale = cropW / w;
  const level = scale < 1 ? "bad" : scale < 1.5 ? "warn" : "ok";
  const pct = (scale * 100).toFixed(0);
  const text = scale < 1 ? "UPSCALING" : `${pct}%`;

  const indicatorHTML = `<div class="scale-indicator ${level}">${text}</div>`;
  el.innerHTML = indicatorHTML;

  const hudIndicatorHTML = `
    <div class="hud-label">Quality</div>
    <div class="hud-value">${indicatorHTML}</div>`;
  hudEl.innerHTML = hudIndicatorHTML;
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

  const { x: srcX, y: srcY, w: srcW, h: srcH } = state.crop;
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
