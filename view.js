"use strict";

let activePanel = null;

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
    ${createInfoPills()}
    ${createCornerIcons()}
    ${createPanels()}
    ${createBottomBar()}
    ${createShortcutsOverlay()}
  `;
}

function createInfoPills() {
  return `
    <div class="info-pills">
      <div class="info-pill" id="source-info">—</div>
      <div class="info-pill" id="crop-info">—</div>
    </div>
  `;
}

function createCornerIcons() {
  return `
    <button class="corner-icon corner-icon-tl" id="icon-aspect" onclick="togglePanel('aspect')" title="Aspect Ratio">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="14" height="14" rx="2"/>
        <path d="M3 10h14M10 3v14"/>
      </svg>
    </button>
    <button class="corner-icon corner-icon-tr" id="icon-presets" onclick="togglePanel('presets')" title="Presets">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="5" height="5" rx="1"/>
        <rect x="12" y="3" width="5" height="5" rx="1"/>
        <rect x="3" y="12" width="5" height="5" rx="1"/>
        <rect x="12" y="12" width="5" height="5" rx="1"/>
      </svg>
    </button>
    <button class="corner-icon corner-icon-br" id="icon-export" onclick="togglePanel('export')" title="Export">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 10l4 4 4-4M10 3v11"/>
        <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2"/>
      </svg>
    </button>
  `;
}

function createPanels() {
  return `
    <div class="slide-panel panel-aspect" id="panel-aspect">
      ${createAspectContent()}
    </div>
    <div class="slide-panel panel-presets" id="panel-presets">
      ${createPresetsContent()}
    </div>
    <div class="slide-panel panel-export" id="panel-export">
      ${createExportContent()}
    </div>
  `;
}

function createAspectContent() {
  return `
    <div class="aspect-pills">
      <button class="aspect-pill" data-aspect="0" onclick="setAspectFromButton(0)">Free</button>
      <button class="aspect-pill" data-aspect="1" onclick="setAspectFromButton(1)">1:1</button>
      <button class="aspect-pill" data-aspect="${4 / 3}" onclick="setAspectFromButton(${4 / 3})">4:3</button>
      <button class="aspect-pill" data-aspect="${3 / 2}" onclick="setAspectFromButton(${3 / 2})">3:2</button>
      <button class="aspect-pill" data-aspect="${16 / 9}" onclick="setAspectFromButton(${16 / 9})">16:9</button>
      <button class="aspect-pill" data-aspect="${9 / 16}" onclick="setAspectFromButton(${9 / 16})">9:16</button>
    </div>
  `;
}

function createPresetsContent() {
  return `
    <div style="max-height: 400px; overflow-y: auto;">
      <div class="preset-group-label">Instagram</div>
      <button class="preset-item" onclick="selectPixelPreset('social','IG Square',1080,1080)">Square 1080×1080</button>
      <button class="preset-item" onclick="selectPixelPreset('social','IG Portrait',1080,1350)">Portrait 1080×1350</button>
      <button class="preset-item" onclick="selectPixelPreset('social','IG Story',1080,1920)">Story 1080×1920</button>
      <div class="preset-group-label">Facebook</div>
      <button class="preset-item" onclick="selectPixelPreset('social','FB Link',1200,630)">Link 1200×630</button>
      <button class="preset-item" onclick="selectPixelPreset('social','FB Cover',820,312)">Cover 820×312</button>
      <div class="preset-group-label">YouTube</div>
      <button class="preset-item" onclick="selectPixelPreset('social','YT Thumb',1280,720)">Thumbnail 1280×720</button>
      <button class="preset-item" onclick="selectPixelPreset('social','YT Frame',1920,1080)">Frame 1920×1080</button>
      <div class="preset-group-label">Document</div>
      <button class="preset-item" onclick="selectPixelPreset('docs','A4',2480,3508)">A4 2480×3508</button>
      <button class="preset-item" onclick="selectPixelPreset('docs','Letter',2550,3300)">Letter 2550×3300</button>
    </div>
  `;
}

function createExportContent() {
  return `
    <div class="export-size-inputs">
      <input type="text" id="export-w" class="size-input" inputmode="numeric" oninput="onExportInput('w', this.value)">
      <span class="size-separator">×</span>
      <input type="text" id="export-h" class="size-input" inputmode="numeric" oninput="onExportInput('h', this.value)">
    </div>
    <div id="scale-indicator-export" class="scale-indicator" style="margin-bottom: 12px; text-align: center;"></div>
    <button class="export-action" onclick="exportImage()">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 10l4 4 4-4M10 3v11"/>
        <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2"/>
      </svg>
      <span>Export</span>
    </button>
  `;
}

function createBottomBar() {
  return `
    <div class="bottom-bar">
      <div class="tool-group">
        <button class="tool-btn" onclick="undo()" title="Undo (Ctrl+Z)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4.5 7h6a3.5 3.5 0 110 7h-2"/>
            <path d="M7 4.5L4.5 7 7 9.5"/>
          </svg>
        </button>
        <button class="tool-btn" onclick="redo()" title="Redo (Ctrl+Shift+Z / Ctrl+Y)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
             <path d="M11.5 7h-6a3.5 3.5 0 100 7h2"/>
             <path d="M9 4.5L11.5 7 9 9.5"/>
          </svg>
        </button>
      </div>

      <div class="tool-separator"></div>

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

      <div class="tool-separator"></div>

      <button class="tool-btn" onclick="resetCrop()" title="Reset (R)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 8a6 6 0 0112 0M14 8a6 6 0 01-12 0"/>
          <path d="M2 4v4h4M14 12v-4h-4"/>
        </svg>
      </button>

      <button class="tool-btn" onclick="newImage()" title="New (N)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="2" width="12" height="12" rx="2"/>
          <path d="M8 5v6M5 8h6"/>
        </svg>
      </button>

      <div class="tool-separator"></div>

      <button class="tool-btn" onclick="toggleShortcuts()" title="Shortcuts (?)">
        <span style="font-family: var(--font-mono); font-weight: 700;">?</span>
      </button>
    </div>
  `;
}

function createShortcutsOverlay() {
  return `
    <div id="shortcuts-overlay" class="shortcuts-overlay hidden" onclick="toggleShortcuts()">
      <div class="shortcuts-modal" onclick="event.stopPropagation()">
        <div class="shortcuts-header">
          <h3>Keyboard Shortcuts</h3>
          <button class="close-btn" onclick="toggleShortcuts()">×</button>
        </div>
        <div class="shortcuts-list">
          <div class="shortcut-row"><span class="key-desc">Undo</span> <div class="keys"><kbd>Ctrl</kbd> + <kbd>Z</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">Redo</span> <div class="keys"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">Redo (Alt)</span> <div class="keys"><kbd>Ctrl</kbd> + <kbd>Y</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">Toggle Grid</span> <div class="keys"><kbd>G</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">Zoom to Fit</span> <div class="keys"><kbd>F</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">Zoom 1:1</span> <div class="keys"><kbd>1</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">Reset Crop</span> <div class="keys"><kbd>R</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">New Image</span> <div class="keys"><kbd>N</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">Export</span> <div class="keys"><kbd>Ctrl</kbd> + <kbd>Enter</kbd></div></div>
          <div class="shortcut-row"><span class="key-desc">Close Panels</span> <div class="keys"><kbd>Esc</kbd></div></div>
        </div>
      </div>
    </div>
  `;
}

function toggleShortcuts() {
  const overlay = document.getElementById("shortcuts-overlay");
  if (overlay) overlay.classList.toggle("hidden");
}

function togglePanel(panelName) {
  const panel = document.getElementById(`panel-${panelName}`);
  const icon = document.getElementById(`icon-${panelName}`);

  if (activePanel === panelName) {
    panel.classList.remove("visible");
    icon.classList.remove("active");
    activePanel = null;
  } else {
    if (activePanel) {
      document
        .getElementById(`panel-${activePanel}`)
        .classList.remove("visible");
      document.getElementById(`icon-${activePanel}`).classList.remove("active");
    }
    panel.classList.add("visible");
    icon.classList.add("active");
    activePanel = panelName;
  }
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
  pushHistory("Aspect Change");
}

function handleKeyboard(e) {
  if (e.target.tagName === "INPUT") return;

  const cmd = e.metaKey || e.ctrlKey;

  // Undo / Redo Logic
  if (cmd) {
    if (e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (e.key === "y") {
      e.preventDefault();
      redo();
      return;
    }
  }

  // Shortcuts Overlay
  if (e.key === "?") {
    toggleShortcuts();
    return;
  }

  if (e.key === "g") toggleGrid();
  else if (e.key === "r") resetCrop();
  else if (e.key === "f") zoomToFit();
  else if (e.key === "1") zoomToActual();
  else if (e.key === "n") newImage();
  else if (e.key === "Escape") {
    const shortcuts = document.getElementById("shortcuts-overlay");
    if (shortcuts && !shortcuts.classList.contains("hidden")) {
      toggleShortcuts();
    } else if (activePanel) {
      togglePanel(activePanel);
    }
  } else if (cmd && e.key === "Enter") exportImage();
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

  if (!state.image) return;

  const srcW = state.fullImage?.naturalWidth || state.image.naturalWidth;
  const srcH = state.fullImage?.naturalHeight || state.image.naturalHeight;
  if (srcInfo) srcInfo.textContent = `${srcW}×${srcH}`;

  const { w, h } = state.crop;
  const actualW = Math.round(w);
  const actualH = Math.round(h);
  if (cropInfo) cropInfo.textContent = `${actualW}×${actualH}`;

  updateScaleIndicator();
}

function updateScaleIndicator() {
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
