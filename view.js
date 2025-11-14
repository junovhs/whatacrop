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
    </div>
    ${createContextHud()}
    ${createControlPanel()}
  `;
}

function createContextHud() {
  return `
    <div class="context-hud" id="context-hud">
        <div>
            <div class="hud-label">Source</div>
            <div class="hud-value" id="hud-src-info">—</div>
        </div>
        <div>
            <div class="hud-label">Crop</div>
            <div class="hud-value" id="hud-crop-info">—</div>
        </div>
        <div id="hud-scale-indicator"></div>
    </div>
  `;
}

function createControlPanel() {
  return `
    <div class="control-panel">
        <div class="panel-row">
            <div class="aspect-section">
                ${createAspectButtons()}
                ${createCustomAspectControl()}
            </div>
            <div class="divider"></div>
            <div class="preset-section">
                ${createTopCenterPresets()}
            </div>
            <div class="divider"></div>
            <div class="export-section">
                ${createExportControls()}
            </div>
        </div>
        <div class="panel-row">
            <div class="control-section">
                <button class="btn" onclick="toggleGrid()">Grid</button>
                ${createZoomControls()}
                <button class="btn" onclick="resetCrop()">Reset</button>
                <button class="btn" onclick="newImage()">New</button>
            </div>
        </div>
    </div>
  `;
}

function createExportControls() {
  return `
    <div class="custom-input-group">
        <input type="text" id="export-w" class="custom-input" inputmode="numeric" oninput="onExportInput('w', this.value)">
        <span>×</span>
        <input type="text" id="export-h" class="custom-input" inputmode="numeric" oninput="onExportInput('h', this.value)">
    </div>
    <button class="btn btn-primary" onclick="exportImage()">Export</button>
    <div id="scale-indicator"></div>
  `;
}

function createZoomControls() {
  return `
    <button class="btn" onclick="zoomToFit()">Fit</button>
    <input type="range" id="zoom-slider" min="0" max="1000" step="1">
    <div id="zoom-indicator">100%</div>
    <button class="btn" onclick="zoomToActual()">100%</button>
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

  syncExportInputsToCrop();
  updatePresetTriggers();
  document.addEventListener("click", closeAllPresetMenus);
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

  updateInfoDisplays();
  updatePresetTriggers();
  syncExportInputsToCrop();
  updateZoomUI();
}

function updateAspectBar() {
  // No-op in new layout - aspect buttons are static
}

function updateInfoDisplays() {
  const w = Math.round(state.crop.w);
  const h = Math.round(state.crop.h);

  const hudCropInfo = document.getElementById("hud-crop-info");
  if (hudCropInfo) hudCropInfo.textContent = `${w} × ${h}`;

  const hudSrcInfo = document.getElementById("hud-src-info");
  if (hudSrcInfo) {
    const fullW = state.fullImage?.naturalWidth || state.image.naturalWidth;
    const fullH = state.fullImage?.naturalHeight || state.image.naturalHeight;
    hudSrcInfo.textContent = `${fullW} × ${fullH}`;
  }

  updateScaleIndicator();
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
