import { state } from '../state';
import { Mode } from '../constants';

export function createPresetDropdowns(): string {
  return `
    <div class="preset-group">
      <button class="aspect-pill" id="preset-social-trigger">Social</button>
    </div>
  `;
}

export function updatePresetTriggers(): void {
  // Update class lists based on state.activePresetKey
}

export function applyAspectToCrop(ratio: number): void {
  const img = state.fullImage || state.image;
  if (!img) return;
  // Calculate center crop with aspect
}