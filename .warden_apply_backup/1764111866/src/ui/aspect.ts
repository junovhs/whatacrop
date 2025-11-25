import { state, setMode, clearAllSelections } from '../state';
import { Mode } from '../constants';
import { applyAspectToCrop } from './presets'; // Assuming shared logic
import { requestRender } from './render';
import { scheduleCommit } from '../logic/transform';

export function createAspectTools(): string {
  return `
    <div class="aspect-tools">
      <div class="aspect-pills">
        <button class="aspect-pill" onclick="window.app.setAspect(0)">Free</button>
        <button class="aspect-pill" onclick="window.app.setAspect(1)">1:1</button>
        <button class="aspect-pill" onclick="window.app.setAspect(1.77)">16:9</button>
      </div>
    </div>
  `;
}

export function setAspect(ratio: number): void {
  clearAllSelections();
  if (ratio === 0) {
    setMode(Mode.NONE);
    state.aspectRatio = 0;
  } else {
    setMode(Mode.ASPECT_RATIO);
    state.aspectRatio = ratio;
    // apply logic to crop
  }
  requestRender();
  scheduleCommit();
}