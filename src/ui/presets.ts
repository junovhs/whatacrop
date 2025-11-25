import { state, setMode, clearAllSelections, markPresetActive } from '../state';
import { Mode } from '../constants';
import { applyAspectToCrop } from '../logic/resize';
import { requestRender } from './render';
import { scheduleCommit } from '../logic/transform';
import { validatePixelDimension, validateAspectRatio } from '../utils';

export function createPresetDropdowns(): string {
  // We need to replicate the HTML structure for the 3 menus: Social, Docs, Custom Pixel
  return `
    <div class="preset-group">
      <button id="preset-social-trigger" class="aspect-pill preset-trigger" onclick="window.app.togglePreset('social', event)">
        <span>${state.presetLabels.social}</span> ?
      </button>
      <div id="preset-menu-social" class="preset-menu">
        ${createSocialItems()}
      </div>
    </div>

    <div class="preset-group">
      <button id="preset-docs-trigger" class="aspect-pill preset-trigger" onclick="window.app.togglePreset('docs', event)">
        <span>${state.presetLabels.docs}</span> ?
      </button>
      <div id="preset-menu-docs" class="preset-menu">
        ${createDocsItems()}
      </div>
    </div>

    <div class="preset-group">
      <button id="preset-custom-trigger" class="aspect-pill preset-trigger" onclick="window.app.togglePreset('custom-pixel', event)">
        <span>${state.presetLabels["custom-pixel"]}</span> ?
      </button>
      <div id="preset-menu-custom-pixel" class="preset-menu ${state.customPixelActive ? 'visible' : ''}">
        ${createCustomPixelForm()}
      </div>
    </div>
  `;
}

function createSocialItems(): string {
  return `
    <div class="preset-group-label">Instagram</div>
    ${btn('social', 'IG Square', 1080, 1080)}
    ${btn('social', 'IG Portrait', 1080, 1350)}
    ${btn('social', 'IG Landscape', 1080, 566)}
    ${btn('social', 'IG Story', 1080, 1920)}
    <div class="preset-group-label">Facebook</div>
    ${btn('social', 'FB Post', 1080, 1080)}
    ${btn('social', 'FB Cover', 820, 312)}
    <div class="preset-group-label">YouTube</div>
    ${btn('social', 'YT Thumb', 1280, 720)}
  `;
}

function createDocsItems(): string {
  return `
    <div class="preset-group-label">Print @300dpi</div>
    ${btn('docs', 'A4', 2480, 3508)}
    ${btn('docs', 'Letter', 2550, 3300)}
  `;
}

function btn(key: string, label: string, w: number, h: number): string {
  return `<button class="preset-item" onclick="window.app.selectPreset('${key}', '${label}', ${w}, ${h})">${label} ${w}x${h}</button>`;
}

function createCustomPixelForm(): string {
  return `
    <div class="preset-group-label">Custom Size</div>
    <div class="custom-pixel-form">
      <input id="custom-pixel-w" type="number" placeholder="W" class="aspect-input" value="${state.customPixelW}">
      <span>x</span>
      <input id="custom-pixel-h" type="number" placeholder="H" class="aspect-input" value="${state.customPixelH}">
      <button class="btn-apply" onclick="window.app.applyCustomPixel()">Apply</button>
    </div>
  `;
}

export function togglePreset(key: string, e: Event): void {
  e.stopPropagation();
  const menu = document.getElementById(`preset-menu-${key}`);
  const wasVisible = menu?.classList.contains("visible");
  
  // Close all
  document.querySelectorAll(".preset-menu").forEach(el => el.classList.remove("visible"));
  
  if (!wasVisible && menu) {
    menu.classList.add("visible");
    if (key === 'custom-pixel') state.customPixelActive = true;
  } else {
    state.customPixelActive = false;
  }
  requestRender();
}

export function selectPreset(key: string, label: string, w: number, h: number): void {
  if (!state.image) return;
  
  clearAllSelections();
  setMode(Mode.PIXEL_PRESET);
  markPresetActive(key, label);
  
  // Close menus
  document.querySelectorAll(".preset-menu").forEach(el => el.classList.remove("visible"));

  state.exportW = String(w);
  state.exportH = String(h);
  
  const ratio = w / h;
  state.aspectRatio = ratio;
  
  applyAspectToCrop(ratio);
  requestRender();
  scheduleCommit();
}

export function applyCustomPixel(): void {
  const wEl = document.getElementById("custom-pixel-w") as HTMLInputElement;
  const hEl = document.getElementById("custom-pixel-h") as HTMLInputElement;
  if (!wEl || !hEl) return;
  
  const w = parseInt(wEl.value, 10);
  const h = parseInt(hEl.value, 10);
  if (!(w > 0 && h > 0)) return;

  clearAllSelections();
  setMode(Mode.CUSTOM_PIXEL);
  state.customPixelW = String(w);
  state.customPixelH = String(h);
  markPresetActive('custom-pixel', `Custom ${w}x${h}`);
  
  document.querySelectorAll(".preset-menu").forEach(el => el.classList.remove("visible"));
  state.customPixelActive = false;

  state.exportW = String(w);
  state.exportH = String(h);
  state.aspectRatio = w / h;

  applyAspectToCrop(state.aspectRatio);
  requestRender();
  scheduleCommit();
}

export function updatePresetTriggers(): void {
  const map: Record<string, string> = {
    social: "preset-social-trigger",
    docs: "preset-docs-trigger",
    "custom-pixel": "preset-custom-trigger",
  };
  
  Object.entries(map).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    const span = el.querySelector("span");
    if (span) span.textContent = state.presetLabels[key] || "Preset";
    
    if (state.activePresetKey === key) el.classList.add("active");
    else el.classList.remove("active");
  });
}