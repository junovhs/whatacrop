import { Mode } from "../constants";
import { createExportBlob, generateFilename } from "../logic/export";
import { state } from "../state";

export function createExportTools(): string {
	// Styles moved to CSS
	return `
    <div class="export-tools">
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

	if (state.mode === Mode.NONE || state.mode === Mode.ASPECT_RATIO) {
		if (document.activeElement !== ew)
			ew.value = Math.round(state.crop.w).toString();
		if (document.activeElement !== eh)
			eh.value = Math.round(state.crop.h).toString();
	} else if (state.mode === Mode.PIXEL_PRESET) {
		if (document.activeElement !== ew) ew.value = state.exportW;
		if (document.activeElement !== eh) eh.value = state.exportH;
	}
}

export function exportImage(): void {
	const w = parseInt(state.exportW) || Math.round(state.crop.w);
	const h = parseInt(state.exportH) || Math.round(state.crop.h);

	createExportBlob(w, h).then((blob) => {
		if (!blob) return alert("Export failed");
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = generateFilename(w, h);
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 100);
	});
}
