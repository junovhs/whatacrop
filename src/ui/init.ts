import { assert } from '../utils';
import { loadImageFile } from '../logic/file-load';
import { createCropView } from './layout';
import { bindCropView } from './events';
import { recalculateLayout } from '../logic/transform';

export function initAppView(): void {
  const app = document.getElementById("app");
  assert(!!app, "Missing #app");
  if (app) {
    app.innerHTML = createDropZone();
    bindDropZone();
  }
}

export function renderLoadingView(): void {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="loading-view">Processing...</div>`;
}

export function renderCropView(): void {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = createCropView();
    bindCropView();
    const vp = document.getElementById("viewport");
    if (vp) new ResizeObserver(() => recalculateLayout()).observe(vp);
  }
}

function createDropZone(): string {
  return `
    <div class="drop-zone" id="drop-zone">
      <input type="file" id="file-input" accept="image/*" class="hidden">
      <div>Drop image here</div>
    </div>
  `;
}

function bindDropZone(): void {
  const zone = document.getElementById("drop-zone");
  const input = document.getElementById("file-input") as HTMLInputElement;
  if (!zone || !input) return;

  zone.onclick = () => input.click();
  input.onchange = (e: any) => {
    if (e.target.files?.length) loadImageFile(e.target.files[0]);
  };
  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add("dragging"); };
  zone.ondragleave = () => zone.classList.remove("dragging");
  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove("dragging");
    if (e.dataTransfer?.files.length) loadImageFile(e.dataTransfer.files[0]);
  };
}