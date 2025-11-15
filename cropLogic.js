"use strict";

function loadImageFile(file) {
  if (!file) {
    console.error("loadImageFile: no file provided");
    return;
  }

  assert(file instanceof File, "loadImageFile: not a File object");

  renderLoadingView();

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
    initAppView();
  };

  reader.onload = (e) => {
    const img = new Image();

    img.onerror = () => {
      console.error("loadImageFile: Image load error");
      alert("Failed to load image");
      initAppView();
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

      const finishLoad = (displayImage, previewScaleFactor) => {
        state.fullImage = fullImage;
        state.image = displayImage;
        state.previewScale = previewScaleFactor;

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

        requestAnimationFrame(() => {
          fitImageToViewport();
          requestRender();
        });
      };

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
        previewImg.onload = () =>
          finishLoad(
            previewImg,
            fullImage.naturalWidth / previewImg.naturalWidth,
          );
        previewImg.onerror = () => {
          console.error("loadImageFile: Preview creation failed");
          alert("Failed to process large image");
          initAppView();
        };
        previewImg.src = previewCanvas.toDataURL();
        return;
      }

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
  if (!state.image) return;
  if (!handle) return;

  assert(typeof handle === "string", "startDrag: handle must be string");

  e.preventDefault();
  e.stopPropagation();

  beginInteract();

  const overlay = document.getElementById("crop-overlay");
  if (overlay) overlay.classList.add("dragging");

  state.drag = {
    handle,
    startScreen: { x: e.clientX, y: e.clientY },
    startCrop: { ...state.crop },
    startTransform: { ...state.imageTransform },
  };

  assert(state.drag.startScreen.x !== undefined, "startDrag: invalid clientX");

  window.addEventListener("mousemove", handleDrag);
  window.addEventListener("mouseup", endDrag);
}

function handleDrag(e) {
  if (!state.drag || !state.image) return;

  const currentScale = state.baseScale * state.zoom;
  assert(currentScale > 0, "handleDrag: invalid scale");

  const dxScreen = e.clientX - state.drag.startScreen.x;
  const dyScreen = e.clientY - state.drag.startScreen.y;

  if (state.drag.handle === "move") {
    const next = { ...state.drag.startCrop };
    const dxImage = (dxScreen / currentScale) * state.previewScale;
    const dyImage = (dyScreen / currentScale) * state.previewScale;
    moveCrop(next, dxImage, dyImage);
    state.crop = next;
  } else if (state.drag.handle.startsWith("pan-")) {
    state.imageTransform.tx = state.drag.startTransform.tx + dxScreen;
    state.imageTransform.ty = state.drag.startTransform.ty + dyScreen;
  } else {
    const next = { ...state.drag.startCrop };
    const dxImage = (dxScreen / currentScale) * state.previewScale;
    const dyImage = (dyScreen / currentScale) * state.previewScale;
    const aspectRatio =
      state.mode === MODE.ASPECT_RATIO ||
      state.mode === MODE.PIXEL_PRESET ||
      state.mode === MODE.CUSTOM_PIXEL
        ? state.aspectRatio
        : 0;
    resizeCrop(next, state.drag.handle, dxImage, dyImage, aspectRatio);
    state.crop = next;
  }

  requestRender();
}

function endDrag() {
  if (!state.drag) return;

  const overlay = document.getElementById("crop-overlay");
  if (overlay) overlay.classList.remove("dragging");

  const handle = state.drag.handle;
  state.drag = null;

  window.removeEventListener("mousemove", handleDrag);
  window.removeEventListener("mouseup", endDrag);

  if (handle !== "pan-image") {
    scheduleCommit();
  }
}

function resetCrop() {
  if (!state.image) return;
  beginInteract();
  const targetImg = state.fullImage || state.image;
  resetCropToFull(targetImg);
  validateCrop(state.crop);
  clearAllSelections();
  zoomToFit(true);
  scheduleCommit();
}

function newImage() {
  if (state.commitTimer) clearTimeout(state.commitTimer);
  state.image = null;
  state.fullImage = null;
  state.previewScale = 1;
  clearAllSelections();
  state.committing = false;
  initAppView();
}
