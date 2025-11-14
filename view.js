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
  const fullW = state.fullImage?.naturalWidth || state.image.naturalWidth;
  const fullH = state.fullImage?.naturalHeight || state.image.naturalHeight;
  const srcText = `Src: ${fullW}×${fullH}`;
  const cropText = `Crop: ${Math.round(state.crop.w)}×${Math.round(state.crop.h)}`;

  return `
    <div class="viewport" id="viewport">
      <canvas id="canvas"></canvas>
      <div class="crop-overlay" id="crop-overlay">
        <div class="crop-area" id="crop-area"></div>
        ${createHandles()}
        ${createEdges()}
        <canvas id="grid-canvas" class="grid-canvas"></canvas>
      </div>
    </div>
    ${createTopLeft()}
    ${createTopCenterPresets()}
    ${createTopRight()}
    ${createBottomCenter(srcText, cropText)}
  `;
}

function createHandles() {
  return `<div class="handle nw" data-handle="nw"></div><div class="handle ne" data-handle="ne"></div><div class="handle sw" data-handle="sw"></div><div class="handle se" data-handle="se"></div>`;
}
function createEdges() {
  return `<div class="edge n" data-handle="n"></div><div class="edge s" data-handle="s"></div><div class="edge w" data-handle="w"></div><div class="edge e" data-handle="e"></div>`;
}
function createTopLeft() {
  return `<div class="top-left"><button class="btn" onclick="resetCrop()">Reset</button><button class="btn" onclick="newImage()">New</button><label class="grid-toggle"><input type="checkbox" id="grid-toggle-input" checked onchange="toggleGrid(this.checked)"><span>Grid</span></label></div>`;
}
function createTopRight() {
  return `<div class="top-right"><div class="top-right-label">Export</div><div class="dim-field"><span class="dim-caption">Width</span><input type="number" id="export-w" class="export-input" inputmode="numeric" oninput="onExportInput('w', this.value)"></div><span style="color:#555;">×</span><div class="dim-field"><span class="dim-caption">Height</span><input type="number" id="export-h" class="export-input" inputmode="numeric" oninput="onExportInput('h', this.value)"></div><button class="btn btn-primary" onclick="exportImage()">Export</button><div id="scale-indicator" class="scale-indicator hidden"></div></div>`;
}

function createBottomCenter(srcText, cropText) {
  return `
    <div class="bottom-center">
      <div class="info"><div id="src-info">${srcText}</div><div id="crop-info">${cropText}</div></div>
      <div class="aspect-btns" id="aspect-btns">${createAspectButtons()}${createCustomAspectControl()}</div>
      <div class="zoom-controls">
        <button class="btn" onclick="zoomToFit()">Fit</button>
        <input type="range" id="zoom-slider" min="0" max="1000" step="1">
        <div id="zoom-indicator">100%</div>
        <button class="btn" onclick="zoomToActual()">100%</button>
      </div>
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
  const gridToggle = document.getElementById("grid-toggle-input");
  if (gridToggle) gridToggle.checked = state.showGrid;

  syncExportInputsToCrop();
  updatePresetTriggers();
  document.addEventListener("click", closeAllPresetMenus);
}

function onViewportResize() {
  if (!state.image) return;
  if (state.drag || state.committing) return; // Don't reflow during interaction

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

  updateCropInfo();
  updatePresetTriggers();
  syncExportInputsToCrop();
  updateScaleIndicator();
  updateAspectBar();
  updateZoomUI();
}

function updateCropInfo() {
  const cropInfo = document.getElementById("crop-info");
  if (cropInfo)
    cropInfo.textContent = `Crop: ${Math.round(state.crop.w)}×${Math.round(state.crop.h)}`;
}

function updateAspectBar() {
  const aspectBar = document.getElementById("aspect-btns");
  if (aspectBar)
    aspectBar.innerHTML = createAspectButtons() + createCustomAspectControl();
}

function renderGrid(gridCanvas, cropW, cropH) {
  if (!state.showGrid || cropW <= 0 || cropH <= 0) {
    gridCanvas.width = 0;
    gridCanvas.height = 0;
    return;
  }
  gridCanvas.width = cropW;
  gridCanvas.height = cropH;
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

function toggleGrid(on) {
  state.showGrid = !!on;
  requestRender();
}
