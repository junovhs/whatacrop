"use strict";

function loadImageFile(file) {
  if (!file) {
    console.error("loadImageFile: no file provided");
    return;
  }

  assert(file instanceof File, "loadImageFile: not a File object");

  const hadPrev = !!state.image;
  const prev = hadPrev
    ? {
        x: state.crop.x,
        y: state.crop.y,
        w: state.crop.w,
        h: state.crop.h,
        imgW: state.fullImage?.naturalWidth || state.image.naturalWidth,
        imgH: state.fullImage?.naturalHeight || state.image.naturalHeight,
      }
    : null;

  const reader = new FileReader();

  reader.onerror = () => {
    console.error("loadImageFile: FileReader error", reader.error);
    alert("Failed to read file");
  };

  reader.onload = (e) => {
    const img = new Image();

    img.onerror = () => {
      console.error("loadImageFile: Image load error");
      alert("Failed to load image");
    };

    img.onload = () => {
      assert(img.naturalWidth > 0, "loadImageFile: invalid image width");
      assert(img.naturalHeight > 0, "loadImageFile: invalid image height");
      assert(
        img.naturalWidth <= MAX_CANVAS_DIM,
        "loadImageFile: image width exceeds max",
      );
      assert(
        img.naturalHeight <= MAX_CANVAS_DIM,
        "loadImageFile: image height exceeds max",
      );

      const fullImage = img;
      const maxDim = Math.max(fullImage.naturalWidth, fullImage.naturalHeight);

      const finishLoad = (displayImage, scale) => {
        state.fullImage = fullImage;
        state.image = displayImage;
        state.previewScale = scale;

        // FIXED: Initialize crop in full image coordinates
        if (hadPrev && prev && prev.imgW > 0 && prev.imgH > 0) {
          preserveRelativeCrop(prev, fullImage);
        } else {
          resetCropToFull(fullImage);
        }

        clearAllSelections();
        state.committing = false;
        if (state.commitTimer) {
          clearTimeout(state.commitTimer);
          state.commitTimer = null;
        }

        renderCropView();
        fitImageToViewport();
        requestRender();
      };

      // Create preview if image is too large
      if (maxDim > PREVIEW_MAX_DIM) {
        const scale = PREVIEW_MAX_DIM / maxDim;
        const previewW = Math.round(fullImage.naturalWidth * scale);
        const previewH = Math.round(fullImage.naturalHeight * scale);

        const previewCanvas = document.createElement("canvas");
        previewCanvas.width = previewW;
        previewCanvas.height = previewH;
        const pctx = previewCanvas.getContext("2d");
        pctx.drawImage(fullImage, 0, 0, previewW, previewH);

        const previewImg = new Image();
        previewImg.onload = () => finishLoad(previewImg, scale);
        previewImg.onerror = () => {
          console.error("loadImageFile: Preview creation failed");
          alert("Failed to process large image");
        };
        previewImg.src = previewCanvas.toDataURL("image/png");
        return; // Wait for preview
      }

      // Use full image directly
      finishLoad(fullImage, 1);
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

function preserveRelativeCrop(prev, img) {
  assert(prev, "preserveRelativeCrop: no prev");
  assert(img, "preserveRelativeCrop: no img");

  const relX = prev.x / prev.imgW;
  const relY = prev.y / prev.imgH;
  const relW = prev.w / prev.imgW;
  const relH = prev.h / prev.imgH;

  const newW = relW * img.naturalWidth;
  const newH = relH * img.naturalHeight;
  const newX = relX * img.naturalWidth;
  const newY = relY * img.naturalHeight;

  state.crop = {
    x: clamp(newX, 0, Math.max(0, img.naturalWidth - newW)),
    y: clamp(newY, 0, Math.max(0, img.naturalHeight - newH)),
    w: Math.max(MIN_CROP, Math.min(newW, img.naturalWidth)),
    h: Math.max(MIN_CROP, Math.min(newH, img.naturalHeight)),
  };

  validateCrop(state.crop);
}

function resetCropToFull(img) {
  assert(img, "resetCropToFull: no img");

  state.crop = {
    x: 0,
    y: 0,
    w: img.naturalWidth,
    h: img.naturalHeight,
  };

  validateCrop(state.crop);
}

function startDrag(e, handle) {
  if (!state.image) {
    console.warn("startDrag: no image loaded");
    return;
  }
  if (!handle) {
    console.error("startDrag: no handle provided");
    return;
  }

  assert(typeof handle === "string", "startDrag: handle must be string");

  e.preventDefault();
  e.stopPropagation();

  beginInteract();

  state.drag = {
    handle,
    startScreen: { x: e.clientX, y: e.clientY },
    startCrop: { ...state.crop },
  };

  assert(state.drag.startScreen.x !== undefined, "startDrag: invalid clientX");
  assert(state.drag.startScreen.y !== undefined, "startDrag: invalid clientY");

  window.addEventListener("mousemove", handleDrag);
  window.addEventListener("mouseup", endDrag);
}

function handleDrag(e) {
  if (!state.drag || !state.image) return;

  const { scale } = state.imageTransform;
  assert(scale > 0, "handleDrag: invalid scale");

  const dx = (e.clientX - state.drag.startScreen.x) / scale;
  const dy = (e.clientY - state.drag.startScreen.y) / scale;

  assert(Number.isFinite(dx), "handleDrag: dx not finite");
  assert(Number.isFinite(dy), "handleDrag: dy not finite");

  const next = { ...state.drag.startCrop };

  if (state.drag.handle === "move") {
    moveCrop(next, dx, dy);
  } else {
    resizeCrop(next, state.drag.startCrop, state.drag.handle, dx, dy);
  }

  state.crop = next;
  requestRender();
}

function endDrag() {
  if (!state.drag) return;

  state.drag = null;
  window.removeEventListener("mousemove", handleDrag);
  window.removeEventListener("mouseup", endDrag);

  scheduleCommit();
}

function resetCrop() {
  if (!state.image) {
    console.warn("resetCrop: no image loaded");
    return;
  }

  beginInteract();

  // FIXED: Use fullImage if available
  const targetImg = state.fullImage || state.image;
  state.crop = {
    x: 0,
    y: 0,
    w: targetImg.naturalWidth,
    h: targetImg.naturalHeight,
  };

  validateCrop(state.crop);
  clearAllSelections();

  fitImageToViewport();
  requestRender();
  scheduleCommit();
}

function newImage() {
  if (state.commitTimer) {
    clearTimeout(state.commitTimer);
    state.commitTimer = null;
  }

  state.image = null;
  state.fullImage = null;
  state.previewScale = 1;
  clearAllSelections();
  state.committing = false;

  initAppView();
}
