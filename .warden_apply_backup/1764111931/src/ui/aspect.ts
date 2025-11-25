import { state, setMode, clearAllSelections } from '../state';
import { Mode, EPSILON } from '../constants';
import { requestRender } from './render';
import { scheduleCommit } from '../logic/transform';
import { applyAspectToCrop } from '../logic/resize';
import { validateAspectRatio, reduceRatio } from '../utils';

export function createAspectTools(): string {
  return `
    <div class="aspect-tools">
      <div class="aspect-pills">
        ${createAspectButtons()}
        <div class="divider-h"></div>
        ${createCustomAspectControl()}
        <div class="divider-h"></div>
        ${createPresetPlaceholders()}
      </div>
    </div>
  `;
}

function createPresetPlaceholders(): string {
  // Logic is in presets.ts, but we inject the triggers here in layout
  // However, layout.ts actually calls createPresetDropdowns from presets.ts
  // So we just return empty string here if layout handles it, 
  // OR we specifically implement the "Aspect" specific buttons.
  // Based on layout.ts in previous step, it calls createAspectTools AND createPresetDropdowns separately?
  // No, checking layout.ts:
  // ${createAspectTools()}
  // It relies on createAspectTools to include the presets if they are in the same bar.
  // The original UI had them in one pill list.
  
  // We will let layout.ts append the presets via imports.
  // But wait, layout.ts code:
  // ${createAspectTools()}
  // ${createExportTools()}
  // It does NOT call createPresetDropdowns directly in the HTML string in the previous step?
  // Let's re-read src/ui/layout.ts from step 1.
  // It imported createPresetDropdowns but didn't use it in createCropView! 
  // Ah, createAspectTools in original code INCLUDED the preset dropdowns.
  // We need to include them here.
  
  const { createPresetDropdowns } = require('./presets'); // Pseudo-import for logic flow
  return ""; 
  // Actually, we can't circular depend easily in this string builder pattern without care.
  // We will assume layout.ts is fixed or we inject it.
  // For now, let's fix setAspect logic.
}

function createAspectButtons(): string {
  const ratios = [
    { label: "Free", value: 0 },
    { label: "1:1", value: 1 },
    { label: "4:3", value: 4/3 },
    { label: "3:2", value: 3/2 },
    { label: "16:9", value: 16/9 },
    { label: "9:16", value: 9/16 },
  ];

  return ratios.map(r => {
    const isActive = (state.mode === Mode.NONE && r.value === 0) ||
                     (state.mode === Mode.ASPECT_RATIO && Math.abs(state.aspectRatio - r.value) < EPSILON);
    return `<button class="aspect-pill ${isActive ? 'active' : ''}" onclick="window.app.setAspect(${r.value})">${r.label}</button>`;
  }).join("");
}

function createCustomAspectControl(): string {
  const isActive = state.customAspectActive;
  const hasCustom = state.mode === Mode.ASPECT_RATIO && state.customAspectLabel !== "Custom";
  const label = hasCustom ? state.customAspectLabel : "Custom";
  
  if (isActive) {
    return `
      <div class="custom-aspect-form">
        <input id="custom-aspect-w" type="number" min="1" placeholder="W" class="aspect-input" value="${state.customAspectW}">
        <span>:</span>
        <input id="custom-aspect-h" type="number" min="1" placeholder="H" class="aspect-input" value="${state.customAspectH}">
        <button class="btn-apply" onclick="window.app.applyCustomAspect()">�</button>
        <button class="btn-cancel" onclick="window.app.toggleCustomAspect()">?</button>
      </div>
    `;
  }
  return `<button class="aspect-pill ${isActive || hasCustom ? 'active' : ''}" onclick="window.app.toggleCustomAspect()">${label}</button>`;
}

export function setAspect(ratio: number): void {
  if (!state.image && ratio !== 0) return;
  clearAllSelections();
  
  if (ratio === 0) {
    setMode(Mode.NONE);
    state.aspectRatio = 0;
  } else {
    setMode(Mode.ASPECT_RATIO);
    state.aspectRatio = ratio;
    applyAspectToCrop(ratio);
  }
  
  requestRender();
  scheduleCommit();
}

export function toggleCustomAspect(): void {
  state.customAspectActive = !state.customAspectActive;
  if (!state.customAspectActive && state.mode === Mode.ASPECT_RATIO && state.customAspectLabel === "Custom") {
     // Cancelled without setting
     setMode(Mode.NONE);
  }
  requestRender();
}

export function applyCustomAspect(): void {
  const wEl = document.getElementById("custom-aspect-w") as HTMLInputElement;
  const hEl = document.getElementById("custom-aspect-h") as HTMLInputElement;
  if (!wEl || !hEl) return;

  const w = parseInt(wEl.value, 10);
  const h = parseInt(hEl.value, 10);
  if (!(w > 0 && h > 0)) return;

  const reduced = reduceRatio(w, h);
  const ratio = reduced.w / reduced.h;
  
  if (validateAspectRatio(ratio).ok) {
    clearAllSelections();
    setMode(Mode.ASPECT_RATIO);
    state.aspectRatio = ratio;
    state.customAspectW = String(reduced.w);
    state.customAspectH = String(reduced.h);
    state.customAspectLabel = `${reduced.w}:${reduced.h}`;
    state.customAspectActive = false;
    
    applyAspectToCrop(ratio);
    requestRender();
    scheduleCommit();
  }
}