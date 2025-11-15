"use strict";

function exportImage() {
  if (!state.image) {
    console.warn("exportImage: no image loaded");
    return;
  }

  const wInput = document.getElementById("export-w");
  const hInput = document.getElementById("export-h");

  if (!wInput || !hInput) {
    console.error("exportImage: missing export inputs");
    return;
  }

  const w = parseInt(wInput.value, 10);
  const h = parseInt(hInput.value, 10);

  if (!(w > 0 && h > 0)) {
    console.warn("exportImage: invalid export dimensions");
    alert("Please enter valid export dimensions");
    return;
  }

  validatePixelDimension(w);
  validatePixelDimension(h);

  const sourceImage = state.fullImage || state.image;
  const { x, y, w: cropW, h: cropH } = state.crop;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = w;
  exportCanvas.height = h;

  const ctx = exportCanvas.getContext("2d");
  if (!ctx) {
    console.error("exportImage: failed to get canvas context");
    return;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(sourceImage, x, y, cropW, cropH, 0, 0, w, h);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const g = gcd(w, h);
  const aspectW = w / g;
  const aspectH = h / g;
  const filename = `crop_${w}x${h}_${aspectW}-${aspectH}_${timestamp}.png`;

  exportCanvas.toBlob((blob) => {
    if (!blob) {
      console.error("exportImage: failed to create blob");
      alert("Export failed");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, "image/png");
}
