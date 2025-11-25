import { state } from '../state';
import { Mode } from '../constants';
import { createExportBlob, generateFilename } from '../logic/export';

export function createExportTools(): string {
  // We apply inline styles here to forcibly override any existing CSS causing the "Huge Top" issue,
  // and to position it in the bottom right as requested.
  const style = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    opacity: 1;
    pointer-events: auto;
    background: rgba(18, 18, 20, 0.95);
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #2a2a2c;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 500;
    transform: none;
    top: auto;
    left: auto;
  `;

  return `
    <div class="export-tools" style="${style}">
      <div class="export-label">Export Size</div>
      <div class="export-size-inputs">
        <input id="export-w" class="size-input" oninput="window.app.onExportInput('w', this.value)">
        <span>x</span>
        <input id="export-h" class="size-input" oninput="window.app.onExportInput('h', this.value)">
      </div>
      <button class="export-action" onclick="window.app.exportImage()">Export</button>
    </div>
  `;
}

export function syncExportInputsToCrop(): void {
  const ew = document.getElementById("export-w") as HTMLInputElement;
  const eh = document.getElementById("export-h") as HTMLInputElement;
  if (!ew || !eh) return;
  
  // Only auto-update if we are not in a locked preset mode that dictates specific text,
  // or if we just want to show current crop dimensions.
  // Generally, if the user hasn't typed a custom override, show the crop size.
  if (state.mode === Mode.NONE || state.mode === Mode.ASPECT_RATIO) {
    if (document.activeElement !== ew) ew.value = Math.round(state.crop.w).toString();
    if (document.activeElement !== eh) eh.value = Math.round(state.crop.h).toString();
  } else if (state.mode === Mode.PIXEL_PRESET) {
    if (document.activeElement !== ew) ew.value = state.exportW;
    if (document.activeElement !== eh) eh.value = state.exportH;
  }
}

export function exportImage(): void {
  const w = parseInt(state.exportW) || Math.round(state.crop.w);
  const h = parseInt(state.exportH) || Math.round(state.crop.h);
  
  createExportBlob(w, h).then(blob => {
    if (!blob) return alert("Export failed");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateFilename(w, h);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  });
}