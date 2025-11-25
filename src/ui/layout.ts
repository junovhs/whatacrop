import { createAspectTools } from './aspect';
import { createExportTools } from './export';

export function createCropView(): string {
  // Ensure we call createAspectTools() which now definitely includes the preset dropdowns
  return `
    <div class="viewport" id="viewport">
      <canvas id="canvas"></canvas>
      <div class="crop-overlay" id="crop-overlay">
        <div class="crop-area" id="crop-area"></div>
        ${createHandles()}
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

function createHandles(): string {
  return `
    <div class="handle nw" data-handle="nw"></div><div class="handle ne" data-handle="ne"></div>
    <div class="handle sw" data-handle="sw"></div><div class="handle se" data-handle="se"></div>
    <div class="edge n" data-handle="n"></div><div class="edge s" data-handle="s"></div>
    <div class="edge w" data-handle="w"></div><div class="edge e" data-handle="e"></div>
  `;
}

function createTopBar(): string {
  return `
    <div class="top-bar">
      <div class="top-bar-left">
        <div class="info-pill" id="source-info">-</div>
        <div class="info-pill" id="crop-info">-</div>
      </div>
      <div class="top-bar-right">
        <button class="tool-btn" onclick="window.app.newImage()" title="New Image">N</button>
      </div>
    </div>
  `;
}

function createBottomBar(): string {
  return `
    <div class="bottom-bar">
      <button class="tool-btn" onclick="window.app.toggleGrid()" title="Grid">G</button>
      <div class="zoom-group">
        <button class="tool-btn" onclick="window.app.zoomToFit()" title="Fit">Fit</button>
        <input type="range" id="zoom-slider" min="0" max="1000" step="1">
        <div id="zoom-indicator">100%</div>
        <button class="tool-btn" onclick="window.app.zoomToActual()" title="1:1">1:1</button>
      </div>
      <button class="tool-btn" onclick="window.app.resetCrop()" title="Reset">R</button>
    </div>
  `;
}

function createCropMetadata(): string {
  return `
    <div class="crop-metadata" id="crop-metadata">
      <div class="metadata-value" id="crop-dimensions">-</div>
      <div class="metadata-arrow"></div>
      <div class="metadata-value" id="export-dimensions">-</div>
      <div class="metadata-note" id="scale-note"></div>
    </div>
  `;
}