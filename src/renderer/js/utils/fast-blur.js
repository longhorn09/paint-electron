/**
 * High-performance Gaussian Blur implementation
 * Uses 3-pass separable box blur (Central Limit Theorem approximation of Gaussian Blur)
 * Runs in O(W * H) time complexity independent of radius, providing real-time 60fps blur.
 * Supports bounding box ROI (Region of Interest) for selective rectangular blurring.
 */

export function applyGaussianBlur(imageData, radius, roi = null) {
  if (!radius || radius <= 0) return imageData;
  
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Determine Region of Interest
  let x0 = 0, y0 = 0, x1 = width, y1 = height;
  if (roi) {
    x0 = Math.max(0, Math.min(width, Math.floor(roi.x)));
    y0 = Math.max(0, Math.min(height, Math.floor(roi.y)));
    x1 = Math.max(0, Math.min(width, Math.ceil(roi.x + roi.width)));
    y1 = Math.max(0, Math.min(height, Math.ceil(roi.y + roi.height)));
  }

  const roiWidth = x1 - x0;
  const roiHeight = y1 - y0;

  if (roiWidth <= 0 || roiHeight <= 0) return imageData;

  // Copy ROI pixel data to separate buffer for processing
  const srcBuffer = new Uint8ClampedArray(roiWidth * roiHeight * 4);
  for (let y = 0; y < roiHeight; y++) {
    const srcOffset = ((y0 + y) * width + x0) * 4;
    const dstOffset = y * roiWidth * 4;
    srcBuffer.set(data.subarray(srcOffset, srcOffset + roiWidth * 4), dstOffset);
  }

  const targetBuffer = new Uint8ClampedArray(roiWidth * roiHeight * 4);

  // Calculate box blur sizes to approximate Gaussian with given radius
  const boxes = calculateBoxSizes(radius, 3);
  
  // 3-pass box blur
  boxBlurPass(srcBuffer, targetBuffer, roiWidth, roiHeight, (boxes[0] - 1) / 2);
  boxBlurPass(targetBuffer, srcBuffer, roiWidth, roiHeight, (boxes[1] - 1) / 2);
  boxBlurPass(srcBuffer, targetBuffer, roiWidth, roiHeight, (boxes[2] - 1) / 2);

  // Copy blurred pixels back into main imageData within ROI
  for (let y = 0; y < roiHeight; y++) {
    const srcOffset = y * roiWidth * 4;
    const dstOffset = ((y0 + y) * width + x0) * 4;
    data.set(targetBuffer.subarray(srcOffset, srcOffset + roiWidth * 4), dstOffset);
  }

  return imageData;
}

function calculateBoxSizes(sigma, n) {
  const wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;

  const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
  const m = Math.round(mIdeal);

  const sizes = [];
  for (let i = 0; i < n; i++) {
    sizes.push(i < m ? wl : wu);
  }
  return sizes;
}

function boxBlurPass(scl, tcl, w, h, r) {
  r = Math.floor(r);
  if (r <= 0) {
    tcl.set(scl);
    return;
  }
  boxBlurH(scl, tcl, w, h, r);
  boxBlurT(tcl, scl, w, h, r);
}

function boxBlurH(scl, tcl, w, h, r) {
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < h; i++) {
    const ti = i * w;
    const li = ti;
    const ri = ti + r;
    const fvR = scl[li * 4];
    const fvG = scl[li * 4 + 1];
    const fvB = scl[li * 4 + 2];
    const fvA = scl[li * 4 + 3];
    const lvR = scl[(ti + w - 1) * 4];
    const lvG = scl[(ti + w - 1) * 4 + 1];
    const lvB = scl[(ti + w - 1) * 4 + 2];
    const lvA = scl[(ti + w - 1) * 4 + 3];

    let valR = (r + 1) * fvR;
    let valG = (r + 1) * fvG;
    let valB = (r + 1) * fvB;
    let valA = (r + 1) * fvA;

    for (let j = 0; j < r; j++) {
      const idx = (ti + j) * 4;
      valR += scl[idx];
      valG += scl[idx + 1];
      valB += scl[idx + 2];
      valA += scl[idx + 3];
    }

    for (let j = 0; j <= r; j++) {
      const readIdx = (ri + j < ti + w ? ri + j : ti + w - 1) * 4;
      valR += scl[readIdx] - fvR;
      valG += scl[readIdx + 1] - fvG;
      valB += scl[readIdx + 2] - fvB;
      valA += scl[readIdx + 3] - fvA;

      const outIdx = (ti + j) * 4;
      tcl[outIdx] = Math.round(valR * iarr);
      tcl[outIdx + 1] = Math.round(valG * iarr);
      tcl[outIdx + 2] = Math.round(valB * iarr);
      tcl[outIdx + 3] = Math.round(valA * iarr);
    }

    for (let j = r + 1; j < w - r; j++) {
      const addIdx = (ti + j + r) * 4;
      const subIdx = (ti + j - r - 1) * 4;
      valR += scl[addIdx] - scl[subIdx];
      valG += scl[addIdx + 1] - scl[subIdx + 1];
      valB += scl[addIdx + 2] - scl[subIdx + 2];
      valA += scl[addIdx + 3] - scl[subIdx + 3];

      const outIdx = (ti + j) * 4;
      tcl[outIdx] = Math.round(valR * iarr);
      tcl[outIdx + 1] = Math.round(valG * iarr);
      tcl[outIdx + 2] = Math.round(valB * iarr);
      tcl[outIdx + 3] = Math.round(valA * iarr);
    }

    for (let j = w - r; j < w; j++) {
      const subIdx = (ti + j - r - 1 >= ti ? ti + j - r - 1 : ti) * 4;
      valR += lvR - scl[subIdx];
      valG += lvG - scl[subIdx + 1];
      valB += lvB - scl[subIdx + 2];
      valA += lvA - scl[subIdx + 3];

      const outIdx = (ti + j) * 4;
      tcl[outIdx] = Math.round(valR * iarr);
      tcl[outIdx + 1] = Math.round(valG * iarr);
      tcl[outIdx + 2] = Math.round(valB * iarr);
      tcl[outIdx + 3] = Math.round(valA * iarr);
    }
  }
}

function boxBlurT(scl, tcl, w, h, r) {
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < w; i++) {
    const ti = i;
    const li = ti;
    const ri = ti + r * w;
    const fvR = scl[li * 4];
    const fvG = scl[li * 4 + 1];
    const fvB = scl[li * 4 + 2];
    const fvA = scl[li * 4 + 3];
    const lvR = scl[(ti + (h - 1) * w) * 4];
    const lvG = scl[(ti + (h - 1) * w) * 4 + 1];
    const lvB = scl[(ti + (h - 1) * w) * 4 + 2];
    const lvA = scl[(ti + (h - 1) * w) * 4 + 3];

    let valR = (r + 1) * fvR;
    let valG = (r + 1) * fvG;
    let valB = (r + 1) * fvB;
    let valA = (r + 1) * fvA;

    for (let j = 0; j < r; j++) {
      const idx = (ti + j * w) * 4;
      valR += scl[idx];
      valG += scl[idx + 1];
      valB += scl[idx + 2];
      valA += scl[idx + 3];
    }

    for (let j = 0; j <= r; j++) {
      const readIdx = (ri + j * w < ti + h * w ? ri + j * w : ti + (h - 1) * w) * 4;
      valR += scl[readIdx] - fvR;
      valG += scl[readIdx + 1] - fvG;
      valB += scl[readIdx + 2] - fvB;
      valA += scl[readIdx + 3] - fvA;

      const outIdx = (ti + j * w) * 4;
      tcl[outIdx] = Math.round(valR * iarr);
      tcl[outIdx + 1] = Math.round(valG * iarr);
      tcl[outIdx + 2] = Math.round(valB * iarr);
      tcl[outIdx + 3] = Math.round(valA * iarr);
    }

    for (let j = r + 1; j < h - r; j++) {
      const addIdx = (ti + (j + r) * w) * 4;
      const subIdx = (ti + (j - r - 1) * w) * 4;
      valR += scl[addIdx] - scl[subIdx];
      valG += scl[addIdx + 1] - scl[subIdx + 1];
      valB += scl[addIdx + 2] - scl[subIdx + 2];
      valA += scl[addIdx + 3] - scl[subIdx + 3];

      const outIdx = (ti + j * w) * 4;
      tcl[outIdx] = Math.round(valR * iarr);
      tcl[outIdx + 1] = Math.round(valG * iarr);
      tcl[outIdx + 2] = Math.round(valB * iarr);
      tcl[outIdx + 3] = Math.round(valA * iarr);
    }

    for (let j = h - r; j < h; j++) {
      const subIdx = (ti + (j - r - 1) * w >= ti ? ti + (j - r - 1) * w : ti) * 4;
      valR += lvR - scl[subIdx];
      valG += lvG - scl[subIdx + 1];
      valB += lvB - scl[subIdx + 2];
      valA += lvA - scl[subIdx + 3];

      const outIdx = (ti + j * w) * 4;
      tcl[outIdx] = Math.round(valR * iarr);
      tcl[outIdx + 1] = Math.round(valG * iarr);
      tcl[outIdx + 2] = Math.round(valB * iarr);
      tcl[outIdx + 3] = Math.round(valA * iarr);
    }
  }
}
