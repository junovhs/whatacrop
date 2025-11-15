"use strict";

function moveCrop(crop, dx, dy) {
  const img = state.fullImage || state.image;
  assert(img, "moveCrop: no image");

  crop.x = clamp(crop.x + dx, 0, img.naturalWidth - crop.w);
  crop.y = clamp(crop.y + dy, 0, img.naturalHeight - crop.h);

  validateCrop(crop);
}

function resizeCrop(crop, handle, dx, dy, aspectRatio) {
  const img = state.fullImage || state.image;
  assert(img, "resizeCrop: no image");
  assert(typeof handle === "string", "resizeCrop: handle must be string");

  const locked = aspectRatio > 0;
  const maxW = img.naturalWidth;
  const maxH = img.naturalHeight;

  if (handle === "nw") {
    if (locked) {
      const newH = clamp(crop.h - dy, MIN_CROP, crop.y + crop.h);
      const newW = newH * aspectRatio;
      if (newW <= crop.x + crop.w && newW >= MIN_CROP) {
        crop.h = newH;
        crop.w = newW;
        crop.y = crop.y + (crop.h !== newH ? crop.h - newH : 0);
        crop.x = crop.x + crop.w - newW;
      }
    } else {
      const newW = clamp(crop.w - dx, MIN_CROP, crop.x + crop.w);
      const newH = clamp(crop.h - dy, MIN_CROP, crop.y + crop.h);
      crop.x += crop.w - newW;
      crop.y += crop.h - newH;
      crop.w = newW;
      crop.h = newH;
    }
  } else if (handle === "ne") {
    if (locked) {
      const newH = clamp(crop.h - dy, MIN_CROP, crop.y + crop.h);
      const newW = newH * aspectRatio;
      if (crop.x + newW <= maxW && newW >= MIN_CROP) {
        crop.h = newH;
        crop.w = newW;
        crop.y = crop.y + (crop.h !== newH ? crop.h - newH : 0);
      }
    } else {
      const newW = clamp(crop.w + dx, MIN_CROP, maxW - crop.x);
      const newH = clamp(crop.h - dy, MIN_CROP, crop.y + crop.h);
      crop.w = newW;
      crop.y += crop.h - newH;
      crop.h = newH;
    }
  } else if (handle === "sw") {
    if (locked) {
      const newH = clamp(crop.h + dy, MIN_CROP, maxH - crop.y);
      const newW = newH * aspectRatio;
      if (newW <= crop.x + crop.w && newW >= MIN_CROP) {
        crop.h = newH;
        crop.w = newW;
        crop.x = crop.x + crop.w - newW;
      }
    } else {
      const newW = clamp(crop.w - dx, MIN_CROP, crop.x + crop.w);
      const newH = clamp(crop.h + dy, MIN_CROP, maxH - crop.y);
      crop.x += crop.w - newW;
      crop.w = newW;
      crop.h = newH;
    }
  } else if (handle === "se") {
    if (locked) {
      const newH = clamp(crop.h + dy, MIN_CROP, maxH - crop.y);
      const newW = newH * aspectRatio;
      if (crop.x + newW <= maxW && newW >= MIN_CROP) {
        crop.h = newH;
        crop.w = newW;
      }
    } else {
      crop.w = clamp(crop.w + dx, MIN_CROP, maxW - crop.x);
      crop.h = clamp(crop.h + dy, MIN_CROP, maxH - crop.y);
    }
  } else if (handle === "n") {
    if (locked) {
      const newH = clamp(crop.h - dy, MIN_CROP, crop.y + crop.h);
      const newW = newH * aspectRatio;
      const centerX = crop.x + crop.w / 2;
      const newX = centerX - newW / 2;
      if (newX >= 0 && newX + newW <= maxW && newW >= MIN_CROP) {
        crop.h = newH;
        crop.w = newW;
        crop.y = crop.y + (crop.h !== newH ? crop.h - newH : 0);
        crop.x = newX;
      }
    } else {
      const newH = clamp(crop.h - dy, MIN_CROP, crop.y + crop.h);
      crop.y += crop.h - newH;
      crop.h = newH;
    }
  } else if (handle === "s") {
    if (locked) {
      const newH = clamp(crop.h + dy, MIN_CROP, maxH - crop.y);
      const newW = newH * aspectRatio;
      const centerX = crop.x + crop.w / 2;
      const newX = centerX - newW / 2;
      if (newX >= 0 && newX + newW <= maxW && newW >= MIN_CROP) {
        crop.h = newH;
        crop.w = newW;
        crop.x = newX;
      }
    } else {
      crop.h = clamp(crop.h + dy, MIN_CROP, maxH - crop.y);
    }
  } else if (handle === "w") {
    if (locked) {
      const newW = clamp(crop.w - dx, MIN_CROP, crop.x + crop.w);
      const newH = newW / aspectRatio;
      const centerY = crop.y + crop.h / 2;
      const newY = centerY - newH / 2;
      if (newY >= 0 && newY + newH <= maxH && newH >= MIN_CROP) {
        crop.w = newW;
        crop.h = newH;
        crop.x = crop.x + (crop.w !== newW ? crop.w - newW : 0);
        crop.y = newY;
      }
    } else {
      const newW = clamp(crop.w - dx, MIN_CROP, crop.x + crop.w);
      crop.x += crop.w - newW;
      crop.w = newW;
    }
  } else if (handle === "e") {
    if (locked) {
      const newW = clamp(crop.w + dx, MIN_CROP, maxW - crop.x);
      const newH = newW / aspectRatio;
      const centerY = crop.y + crop.h / 2;
      const newY = centerY - newH / 2;
      if (newY >= 0 && newY + newH <= maxH && newH >= MIN_CROP) {
        crop.w = newW;
        crop.h = newH;
        crop.y = newY;
      }
    } else {
      crop.w = clamp(crop.w + dx, MIN_CROP, maxW - crop.x);
    }
  }

  validateCrop(crop);
}
