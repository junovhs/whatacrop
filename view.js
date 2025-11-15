"use strict";

function initAppView() {
  const app = document.getElementById("app");
  assert(app, "initAppView: missing #app container");
  app.innerHTML = createDropZone();
  bindDropZone();
}

function renderLoadingView() {
  const app = document.getElementById("app");
  assert(app, "renderLoadingView: missing #app container");
  app.innerHTML = `<div class="loading-view">Processing...</div>`;
}

function createDropZone() {
  return `
    <div class="drop-zone" id="drop-zone">
      <input type="file" id="file-input" accept="image/*" class="hidden">
      <div>Drop image here</div>
    </div>
  `;
}

function bindDropZone() {
  const zone = document.getElementById("drop-zone");
  const input = document.getElementById("file-input");
  assert(zone, "bindDropZone: missing drop zone");
  assert(input, "bindDropZone: missing file input");

  zone.onclick = () => input.click();
  input.onchange = (e) => {
    if (e.target.files && e.target.files.length)
      loadImageFile(e.target.files[0]);
  };
  zone.ondragover = (e) => {
    e.preventDefault();
    zone.classList.add("dragging");
  };
  zone.ondragleave = () => zone.classList.remove("dragging");
  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove("dragging");
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      loadImageFile(e.dataTransfer.files[0]);
    }
  };
}

function renderCropView() {
  assert(state.image, "renderCropView: no image");
  const app = document.getElementById("app");
  assert(app, "renderCropView: missing #app container");
  app.innerHTML = createCropView();
  bindCropView();
  const viewport = document.getElementById("viewport");
  assert(viewport, "renderCropView: missing viewport");
  const observer = new ResizeObserver(onViewportResize);
  observer.observe(viewport);
  onViewportResize();
}

function createCropView() {
  return `
    <div class="viewport" id="viewport">
      <canvas id="canvas"></canvas>
      <div class="crop-overlay" id="crop-overlay">
        <div class="crop-area" id="crop-area"></div>
        <div class="handle nw" data-handle="nw"></div><div class="handle ne" data-handle="ne"></div>
        <div class="handle sw" data-handle="sw"></div><div class="handle se" data-handle="se"></div>
        <div class="edge n" data-handle="n"></div><div class="edge s" data-handle="s"></div>
        <div class="edge w" data-handle="w"></div><div class="edge e" data-handle="e"></div>
        <canvas id="grid-canvas" class="grid-canvas"></canvas>
      </div>
      ${createCropMetadata()}
      ${createAspectTools()}
      ${createExportTools()}
    </div>
    ${createTopBar()}
    ${createBottomBar()}
  `;
}

function createTopBar() {
  return `
    <div class="top-bar">
      <div class="top-bar-left">
        <div class="info-pill" id="source-info">—</div>
        <div class="info-pill" id="crop-info">—</div>
      </div>
      <div class="top-bar-right">
        <button class="tool-btn" onclick="newImage()" title="New Image (N)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <path d="M8 5v6M5 8h6"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function createBottomBar() {
  return `
    <div class="bottom-bar">
      <button class="tool-btn" onclick="toggleGrid()" title="Grid (G)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M5.5 2v12M10.5 2v12M2 5.5h12M2 10.5h12"/>
        </svg>
      </button>
      <div class="zoom-group">
        <button class="tool-btn" onclick="zoomToFit()" title="Fit (F)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="10" height="10" rx="1"/>
            <path d="M6 6l4 4M10 6l-4 4"/>
          </svg>
        </button>
        <input type="range" id="zoom-slider" min="0" max="1000" step="1">
        <div id="zoom-indicator">100%</div>
        <button class="tool-btn" onclick="zoomToActual()" title="100% (1)">1:1</button>
      </div>
      <button class="tool-btn" onclick="resetCrop()" title="Reset (R)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 8a6 6 0 0112 0M14 8a6 6 0 01-12 0"/>
          <path d="M2 4v4h4M14 12v-4h-4"/>
        </svg>
      </button>
    </div>
  `;
}

function createCropMetadata() {
  return `
    <div class="crop-metadata" id="crop-metadata">
      <div class="metadata-value" id="crop-dimensions">—</div>
      <div class="metadata-arrow">→</div>
      <div class="metadata-value" id="export-dimensions">—</div>
      <div class="metadata-note" id="scale-note"></div>
    </div>
  `;
}

function createAspectTools() {
  return `
    <div class="aspect-tools" id="aspect-tools">
      <div class="aspect-pills">
        <button class="aspect-pill" data-aspect="0" onclick="setAspectFromButton(0)">Free</button>
        <button class="aspect-pill" data-aspect="1" onclick="setAspectFromButton(1)">1:1</button>
        <button class="aspect-pill" data-aspect="${4 / 3}" onclick="setAspectFromButton(${4 / 3})">4:3</button>
        <button class="aspect-pill" data-aspect="${3 / 2}" onclick="setAspectFromButton(${3 / 2})">3:2</button>
        <button class="aspect-pill" data-aspect="${16 / 9}" onclick="setAspectFromButton(${16 / 9})">16:9</button>
        <button class="aspect-pill" data-aspect="${9 / 16}" onclick="setAspectFromButton(${9 / 16})">9:16</button>
        <div class="divider-h"></div>
        ${createCustomAspectControl()}
        <div class="divider-h"></div>
        ${createPresetDropdowns()}
      </div>
    </div>
  `;
}

function createCustomAspectControl() {
  const isActive = state.customAspectActive;
  const hasCustom =
    state.mode === MODE.ASPECT_RATIO && state.customAspectLabel !== "Custom";
  const label = hasCustom ? state.customAspectLabel : "Custom";
  const btnClass = `aspect-pill ${isActive || hasCustom ? "active" : ""} ${isActive ? "pulsing" : ""}`;

  if (isActive) {
    return `
      <div class="custom-aspect-form">
        <input id="custom-aspect-w" type="number" min="1" placeholder="W" class="aspect-input" value="${state.customAspectW || ""}">
        <span>:</span>
        <input id="custom-aspect-h" type="number" min="1" placeholder="H" class="aspect-input" value="${state.customAspectH || ""}">
        <button class="btn-apply" onclick="applyCustomAspectInline()">✓</button>
        <button class="btn-cancel" onclick="toggleCustomAspectActive()">✕</button>
      </div>
    `;
  }
  return `<button class="${btnClass}" onclick="toggleCustomAspectActive()">${label}</button>`;
}

function createPresetDropdowns() {
  return `
    <div class="preset-group">
      <button class="aspect-pill preset-trigger ${state.activePresetKey === "social" ? "active" : ""}" onclick="togglePresetMenu(event, 'social')">
        <span>${state.presetLabels.social}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3"/></svg>
      </button>
      <div id="preset-menu-social" class="preset-menu">
        ${createSocialPresets()}
      </div>
    </div>
    <div class="preset-group">
      <button class="aspect-pill preset-trigger ${state.activePresetKey === "docs" ? "active" : ""}" onclick="togglePresetMenu(event, 'docs')">
        <span>${state.presetLabels.docs}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3"/></svg>
      </button>
      <div id="preset-menu-docs" class="preset-menu">
        ${createDocsPresets()}
      </div>
    </div>
    <div class="preset-group">
      <button class="aspect-pill preset-trigger ${state.activePresetKey === "custom-pixel" ? "active" : ""} ${state.customPixelActive ? "pulsing" : ""}" onclick="togglePresetMenu(event, 'custom-pixel')">
        <span>${state.presetLabels["custom-pixel"]}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3"/></svg>
      </button>
      <div id="preset-menu-custom-pixel" class="preset-menu ${state.customPixelActive ? "visible" : ""}">
        ${createCustomPixelControl()}
      </div>
    </div>
  `;
}

function createSocialPresets() {
  return `
    <div class="preset-group-label">Instagram</div>
    <button class="preset-item" onclick="selectPixelPreset('social','IG Square',1080,1080)">Square 1080×1080</button>
    <button class="preset-item" onclick="selectPixelPreset('social','IG Portrait',1080,1350)">Portrait 1080×1350</button>
    <button class="preset-item" onclick="selectPixelPreset('social','IG Landscape',1080,566)">Landscape 1080×566</button>
    <button class="preset-item" onclick="selectPixelPreset('social','IG Story',1080,1920)">Story 1080×1920</button>
    <div class="preset-group-label">Facebook</div>
    <button class="preset-item" onclick="selectPixelPreset('social','FB Link',1200,630)">Link 1200×630</button>
    <button class="preset-item" onclick="selectPixelPreset('social','FB Post',1080,1080)">Post 1080×1080</button>
    <button class="preset-item" onclick="selectPixelPreset('social','FB Cover',820,312)">Cover 820×312</button>
    <div class="preset-group-label">X / Twitter</div>
    <button class="preset-item" onclick="selectPixelPreset('social','X Post',1600,900)">Post 1600×900</button>
    <button class="preset-item" onclick="selectPixelPreset('social','X Header',1500,500)">Header 1500×500</button>
    <div class="preset-group-label">YouTube</div>
    <button class="preset-item" onclick="selectPixelPreset('social','YT Thumb',1280,720)">Thumbnail 1280×720</button>
    <button class="preset-item" onclick="selectPixelPreset('social','YT Frame',1920,1080)">Frame 1920×1080</button>
  `;
}

function createDocsPresets() {
  return `
    <div class="preset-group-label">Print @300dpi</div>
    <button class="preset-item" onclick="selectPixelPreset('docs','A4',2480,3508)">A4 2480×3508</button>
    <button class="preset-item" onclick="selectPixelPreset('docs','Letter',2550,3300)">Letter 2550×3300</button>
    <button class="preset-item" onclick="selectPixelPreset('docs','A5',1748,2480)">A5 1748×2480</button>
  `;
}

function createCustomPixelControl() {
  return `
    <div class="preset-group-label">Custom Output Size</div>
    <div class="custom-pixel-form">
      <input id="custom-pixel-w" type="number" min="1" placeholder="W" class="aspect-input" value="${state.customPixelW || ""}">
      <span>×</span>
      <input id="custom-pixel-h" type="number" min="1" placeholder="H" class="aspect-input" value="${state.customPixelH || ""}">
      <button class="btn-apply" onclick="applyCustomPixelPreset()">✓ Apply</button>
    </div>
  `;
}

function createExportTools() {
  return `
    <div class="export-tools" id="export-tools">
      <div class="export-label">Export Size</div>
      <div class="export-size-inputs">
        <input type="text" id="export-w" class="size-input" inputmode="numeric" oninput="onExportInput('w', this.value)">
        <span class="size-separator">×</span>
        <input type="text" id="export-h" class="size-input" inputmode="numeric" oninput="onExportInput('h', this.value)">
      </div>
      <div id="scale-indicator-export" class="scale-indicator"></div>
      <button class="export-action" onclick="exportImage()">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 10l4 4 4-4M10 3v11"/>
          <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2"/>
        </svg>
        <span>Export</span>
      </button>
    </div>
  `;
}

function bindCropView() {
  document
    .querySelectorAll("[data-handle]")
    .forEach((h) => (h.onmousedown = (e) => startDrag(e, h.dataset.handle)));

  const area = document.getElementById("crop-area");
  assert(area, "bindCropView: missing crop area");
  area.onmousedown = (e) => startDrag(e, "move");

  const viewport = document.getElementById("viewport");
  viewport.onwheel = handleWheelZoom;
  viewport.onmousedown = (e) => {
    if (e.target === viewport) startDrag(e, "pan-image");
  };

  document.getElementById("zoom-slider").oninput = handleSliderZoom;
  document.addEventListener("keydown", handleKeyboard);
  document.addEventListener("click", closeAllPresetMenusGlobal);

  syncExportInputsToCrop();
  updateAspectUI();
  updateCropInfoUI();
}

function setAspectFromButton(ratio) {
  if (!state.image) return;
  clearAllSelections();
  if (ratio === 0) {
    setMode(MODE.NONE);
    state.aspectRatio = 0;
  } else {
    setMode(MODE.ASPECT_RATIO);
    state.aspectRatio = ratio;
    applyAspectToCrop(ratio);
  }
  updateAspectUI();
  requestRender();
  scheduleCommit();
}

function togglePresetMenu(e, key) {
  e.stopPropagation();
  const menu = document.getElementById(`preset-menu-${key}`);
  if (!menu) return;
  const wasVisible = menu.classList.contains("visible");
  closeAllPresetMenus();
  if (!wasVisible) menu.classList.add("visible");
}

function closeAllPresetMenusGlobal(e) {
  if (e && e.target.closest(".preset-group")) return;
  document
    .querySelectorAll(".preset-menu.visible")
    .forEach((m) => m.classList.remove("visible"));
}

function handleKeyboard(e) {
  if (e.target.tagName === "INPUT") return;
  if (e.key === "g") toggleGrid();
  else if (e.key === "r") resetCrop();
  else if (e.key === "f") zoomToFit();
  else if (e.key === "1") zoomToActual();
  else if (e.key === "n") newImage();
  else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") exportImage();
}

function onViewportResize() {
  if (!state.image) return;
  if (state.drag || state.committing) return;
  recalculateLayout();
  requestRender();
}

function handleWheelZoom(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -1 : 1;
  const zoomFactor = 1.1;
  const newZoom = state.zoom * (delta > 0 ? zoomFactor : 1 / zoomFactor);
  const rect = e.currentTarget.getBoundingClientRect();
  const focalPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  setZoom(newZoom, focalPoint);
}

function handleSliderZoom(e) {
  const sliderValue = e.target.value / 1000;
  const logMin = Math.log(MIN_ZOOM);
  const logMax = Math.log(MAX_ZOOM);
  const newZoom = Math.exp(logMin + (logMax - logMin) * sliderValue);
  const focalPoint = { x: state.viewport.w / 2, y: state.viewport.h / 2 };
  setZoom(newZoom, focalPoint);
}

function updateCropInfoUI() {
  const srcInfo = document.getElementById("source-info");
  const cropInfo = document.getElementById("crop-info");
  const cropDimensions = document.getElementById("crop-dimensions");
  const exportDimensions = document.getElementById("export-dimensions");
  const scaleNote = document.getElementById("scale-note");

  if (!state.image) return;

  const srcW = state.fullImage?.naturalWidth || state.image.naturalWidth;
  const srcH = state.fullImage?.naturalHeight || state.image.naturalHeight;
  if (srcInfo) srcInfo.textContent = `${srcW}×${srcH}`;

  const { w, h } = state.crop;
  const actualW = Math.round(w);
  const actualH = Math.round(h);
  if (cropInfo) cropInfo.textContent = `${actualW}×${actualH}`;

  if (cropDimensions) {
    const g = gcd(actualW, actualH);
    const aspectW = actualW / g;
    const aspectH = actualH / g;
    cropDimensions.textContent = `${actualW}×${actualH} (${aspectW}:${aspectH})`;
  }

  const exportW =
    parseInt(document.getElementById("export-w")?.value) || actualW;
  const exportH =
    parseInt(document.getElementById("export-h")?.value) || actualH;

  if (exportDimensions) {
    exportDimensions.textContent = `${exportW}×${exportH}`;
  }

  updateScaleIndicator();
}

function updateScaleIndicator() {
  const scaleNote = document.getElementById("scale-note");
  const scaleExport = document.getElementById("scale-indicator-export");

  const { w, h } = state.crop;
  const actualW = Math.round(w);
  const actualH = Math.round(h);

  const exportW =
    parseInt(document.getElementById("export-w")?.value) || actualW;
  const exportH =
    parseInt(document.getElementById("export-h")?.value) || actualH;

  const scaleX = exportW / actualW;
  const scaleY = exportH / actualH;
  const scale = Math.min(scaleX, scaleY);

  let text, className;
  if (Math.abs(scale - 1) < 0.1) {
    text = "1:1";
    className = "ok";
  } else if (scale < 1) {
    text = `↓${Math.round((1 - scale) * 100)}%`;
    className = "ok";
  } else if (scale <= 1.5) {
    text = `↑${Math.round((scale - 1) * 100)}%`;
    className = "ok";
  } else if (scale <= 2) {
    text = `↑${Math.round((scale - 1) * 100)}%`;
    className = "warn";
  } else {
    text = `↑${Math.round((scale - 1) * 100)}%`;
    className = "bad";
  }

  if (scaleNote) {
    scaleNote.textContent = text;
    scaleNote.className = `metadata-note ${className}`;
  }
  if (scaleExport) {
    scaleExport.textContent = text;
    scaleExport.className = `scale-indicator ${className}`;
  }
}

function updateAspectUI() {
  document.querySelectorAll(".aspect-pill[data-aspect]").forEach((btn) => {
    const ratio = parseFloat(btn.dataset.aspect);
    const isActive =
      (state.mode === MODE.NONE && ratio === 0) ||
      (state.mode === MODE.ASPECT_RATIO &&
        Math.abs(state.aspectRatio - ratio) < EPSILON);
    btn.classList.toggle("active", isActive);
  });
  updatePresetTriggers();
}

function renderFrame() {
  if (!state.image) return;
  const canvas = document.getElementById("canvas");
  const overlay = document.getElementById("crop-overlay");
  if (!canvas || !overlay) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = state.image;
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

  const screenPixelsPerImagePixel = currentScale / state.previewScale;
  canvas.style.imageRendering =
    screenPixelsPerImagePixel > 2.5 ? "pixelated" : "auto";

  canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${currentScale})`;
  canvas.className = state.committing ? "canvas-committing" : "";
  overlay.className = state.committing
    ? "crop-overlay committing"
    : state.drag
      ? "crop-overlay dragging"
      : "crop-overlay";

  const previewX = x / state.previewScale;
  const previewY = y / state.previewScale;
  const previewW = w / state.previewScale;
  const previewH = h / state.previewScale;
  const cropLeft = tx + previewX * currentScale;
  const cropTop = ty + previewY * currentScale;
  const cropW = previewW * currentScale;
  const cropH = previewH * currentScale;

  overlay.style.left = `${cropLeft}px`;
  overlay.style.top = `${cropTop}px`;
  overlay.style.width = `${cropW}px`;
  overlay.style.height = `${cropH}px`;

  const gridCanvas = document.getElementById("grid-canvas");
  if (gridCanvas) renderGrid(gridCanvas, cropW, cropH);

  updateCropInfoUI();
  updatePresetTriggers();
  syncExportInputsToCrop();
  updateZoomUI();
}

function updateZoomUI() {
  const indicator = document.getElementById("zoom-indicator");
  const slider = document.getElementById("zoom-slider");
  if (!indicator || !slider) return;

  const screenPixelsPerImagePixel =
    (state.baseScale * state.zoom) / state.previewScale;
  indicator.textContent = `${(screenPixelsPerImagePixel * 100).toFixed(0)}%`;

  const logMin = Math.log(MIN_ZOOM);
  const logMax = Math.log(MAX_ZOOM);
  const currentVal = Math.log(state.zoom);
  const sliderPos = ((currentVal - logMin) / (logMax - logMin)) * 1000;
  if (document.activeElement !== slider) slider.value = sliderPos;
}

function renderGrid(gridCanvas, cropW, cropH) {
  if (!state.showGrid) {
    gridCanvas.style.display = "none";
    return;
  }
  gridCanvas.style.display = "block";
  if (gridCanvas.width !== cropW || gridCanvas.height !== cropH) {
    gridCanvas.width = cropW;
    gridCanvas.height = cropH;
  }
  const gctx = gridCanvas.getContext("2d");
  if (!gctx) return;
  gctx.clearRect(0, 0, cropW, cropH);
  gctx.strokeStyle = "rgba(255,255,255,0.25)";
  gctx.lineWidth = 1;
  const x1 = cropW / 3,
    x2 = (cropW * 2) / 3,
    y1 = cropH / 3,
    y2 = (cropH * 2) / 3;
  gctx.beginPath();
  gctx.moveTo(x1, 0);
  gctx.lineTo(x1, cropH);
  gctx.moveTo(x2, 0);
  gctx.lineTo(x2, cropH);
  gctx.moveTo(0, y1);
  gctx.lineTo(cropW, y1);
  gctx.moveTo(0, y2);
  gctx.lineTo(cropW, y2);
  gctx.stroke();
}

function toggleGrid() {
  state.showGrid = !state.showGrid;
  requestRender();
}

function resetCrop() {
  if (!state.image) return;
  clearAllSelections();
  resetCropToFull(state.image);
  requestRender();
  scheduleCommit();
}

function newImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    if (e.target.files && e.target.files.length) {
      loadImageFile(e.target.files[0]);
    }
  };
  input.click();
}

function syncExportInputsToCrop() {
  const wInput = document.getElementById("export-w");
  const hInput = document.getElementById("export-h");
  if (!wInput || !hInput || !state.image) return;

  if (state.exportW && state.exportH) {
    wInput.value = state.exportW;
    hInput.value = state.exportH;
    return;
  }

  const actualW = Math.round(state.crop.w);
  const actualH = Math.round(state.crop.h);
  wInput.value = actualW;
  hInput.value = actualH;
}

function onExportInput(dim, value) {
  const parsed = parseInt(value, 10);
  if (!isNaN(parsed) && parsed > 0) {
    if (dim === "w") {
      state.exportW = String(parsed);
      if (
        state.mode === MODE.ASPECT_RATIO ||
        state.mode === MODE.PIXEL_PRESET ||
        state.mode === MODE.CUSTOM_PIXEL
      ) {
        const newH = Math.round(parsed / state.aspectRatio);
        state.exportH = String(newH);
        document.getElementById("export-h").value = newH;
      }
    } else {
      state.exportH = String(parsed);
      if (
        state.mode === MODE.ASPECT_RATIO ||
        state.mode === MODE.PIXEL_PRESET ||
        state.mode === MODE.CUSTOM_PIXEL
      ) {
        const newW = Math.round(parsed * state.aspectRatio);
        state.exportW = String(newW);
        document.getElementById("export-w").value = newW;
      }
    }
  }
  updateScaleIndicator();
}
