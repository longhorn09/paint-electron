export class CanvasEngine {
  constructor(container, state) {
    this.container = container;
    this.state = state;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'canvas-viewport-wrapper';

    // Layer 1: Background checkerboard canvas
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.className = 'engine-layer layer-bg';

    // Layer 2: Main visible image canvas
    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.className = 'engine-layer layer-display';

    // Layer 3: Preview canvas (for real-time live blur / transformations)
    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.className = 'engine-layer layer-preview';
    this.previewCanvas.style.display = 'none';

    // Layer 4: Overlay canvas for selection box, handles, loupe, coordinates
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.className = 'engine-layer layer-overlay';

    this.wrapper.appendChild(this.bgCanvas);
    this.wrapper.appendChild(this.displayCanvas);
    this.wrapper.appendChild(this.previewCanvas);
    this.wrapper.appendChild(this.overlayCanvas);
    this.container.appendChild(this.wrapper);

    this.bgCtx = this.bgCanvas.getContext('2d');
    this.displayCtx = this.displayCanvas.getContext('2d');
    this.previewCtx = this.previewCanvas.getContext('2d', { willReadFrequently: true });
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    // State bindings
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.initialPanX = 0;
    this.initialPanY = 0;

    // Eyedropper hover loupe state
    this.loupePos = null;

    this.initEventListeners();
    this.resizeViewport();

    // Auto fit on window resize
    window.addEventListener('resize', () => {
      this.resizeViewport();
      this.render();
    });
  }

  resizeViewport() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    for (const canvas of [this.bgCanvas, this.displayCanvas, this.previewCanvas, this.overlayCanvas]) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    this.bgCtx.scale(dpr, dpr);
    this.displayCtx.scale(dpr, dpr);
    this.previewCtx.scale(dpr, dpr);
    this.overlayCtx.scale(dpr, dpr);

    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  initEventListeners() {
    // Zoom via wheel
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Determine zoom delta
      const zoomFactor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
      this.zoomAt(mouseX, mouseY, zoomFactor);
    }, { passive: false });

    // Track mouse move for cursor & loupe
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const imgCoord = this.viewportToImage(mouseX, mouseY);

      // Emit cursor coordinates event
      const event = new CustomEvent('cursor:move', {
        detail: {
          screenX: mouseX,
          screenY: mouseY,
          imgX: imgCoord.x,
          imgY: imgCoord.y,
          isInside: imgCoord.isInside
        }
      });
      this.container.dispatchEvent(event);
    });
  }

  zoomAt(screenX, screenY, factor) {
    const currentZoom = this.state.zoom;
    const newZoom = Math.max(0.05, Math.min(32.0, currentZoom * factor));
    if (newZoom === currentZoom) return;

    // Keep image coordinate under cursor invariant
    const imgX = (screenX - this.state.panX) / currentZoom;
    const imgY = (screenY - this.state.panY) / currentZoom;

    const newPanX = screenX - imgX * newZoom;
    const newPanY = screenY - imgY * newZoom;

    this.state.zoom = newZoom;
    this.state.panX = newPanX;
    this.state.panY = newPanY;

    this.state.emitChange('zoom');
    this.state.emitChange('pan');
    this.render();
  }

  zoomToFit() {
    if (!this.viewportWidth || !this.viewportHeight) this.resizeViewport();
    const margin = 40;
    const availW = Math.max(100, this.viewportWidth - margin * 2);
    const availH = Math.max(100, this.viewportHeight - margin * 2);

    const scaleX = availW / this.state.width;
    const scaleY = availH / this.state.height;
    let fitZoom = Math.min(scaleX, scaleY);

    // If image is smaller than viewport, cap at 100% zoom unless tiny
    if (this.state.width <= availW && this.state.height <= availH) {
      fitZoom = Math.min(1.0, fitZoom);
    }

    // Clamp zoom
    fitZoom = Math.max(0.05, Math.min(32.0, fitZoom));

    // Center image
    const panX = (this.viewportWidth - this.state.width * fitZoom) / 2;
    const panY = (this.viewportHeight - this.state.height * fitZoom) / 2;

    this.state.zoom = fitZoom;
    this.state.panX = panX;
    this.state.panY = panY;

    this.state.emitChange('zoom');
    this.state.emitChange('pan');
    this.render();
  }

  zoomToActual() {
    if (!this.viewportWidth || !this.viewportHeight) this.resizeViewport();
    this.state.zoom = 1.0;
    this.state.panX = (this.viewportWidth - this.state.width) / 2;
    this.state.panY = (this.viewportHeight - this.state.height) / 2;

    this.state.emitChange('zoom');
    this.state.emitChange('pan');
    this.render();
  }

  viewportToImage(screenX, screenY) {
    const imgX = (screenX - this.state.panX) / this.state.zoom;
    const imgY = (screenY - this.state.panY) / this.state.zoom;

    const flooredX = Math.floor(imgX);
    const flooredY = Math.floor(imgY);

    const isInside = flooredX >= 0 && flooredX < this.state.width && flooredY >= 0 && flooredY < this.state.height;

    return {
      x: flooredX,
      y: flooredY,
      exactX: imgX,
      exactY: imgY,
      isInside
    };
  }

  imageToViewport(imgX, imgY) {
    return {
      x: this.state.panX + imgX * this.state.zoom,
      y: this.state.panY + imgY * this.state.zoom
    };
  }

  render() {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    const zoom = this.state.zoom;
    const panX = this.state.panX;
    const panY = this.state.panY;
    const imgW = this.state.width;
    const imgH = this.state.height;

    // 1. Clear viewports
    this.bgCtx.clearRect(0, 0, width, height);
    this.displayCtx.clearRect(0, 0, width, height);
    this.overlayCtx.clearRect(0, 0, width, height);

    // Calculate image destination rectangle on screen
    const dstX = Math.round(panX);
    const dstY = Math.round(panY);
    const dstW = Math.round(imgW * zoom);
    const dstH = Math.round(imgH * zoom);

    // 2. Draw Checkerboard Background behind image
    this.drawCheckerboard(dstX, dstY, dstW, dstH);

    // 3. Draw Image Canvas
    this.displayCtx.imageSmoothingEnabled = zoom < 2.0;
    if (this.displayCtx.imageSmoothingEnabled) {
      this.displayCtx.imageSmoothingQuality = 'high';
    }
    this.displayCtx.drawImage(this.state.imageCanvas, dstX, dstY, dstW, dstH);

    // 4. Draw Drop Shadow and Boundary Border
    this.overlayCtx.save();
    this.overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.overlayCtx.lineWidth = 1;
    this.overlayCtx.strokeRect(dstX - 0.5, dstY - 0.5, dstW + 1, dstH + 1);
    this.overlayCtx.restore();

    // 5. Draw Pixel Grid if zoomed in >= 800%
    if (zoom >= 8.0 && dstW <= 10000 && dstH <= 10000) {
      this.drawPixelGrid(dstX, dstY, imgW, imgH, zoom);
    }

    // 6. Draw Selection Box and Handles
    if (this.state.selection) {
      this.drawSelectionOverlay(this.state.selection);
    }

    // 7. Draw Eyedropper Loupe if active
    if (this.loupePos && this.state.activeTool === 'picker') {
      this.drawLoupe(this.loupePos);
    }
  }

  drawCheckerboard(x, y, w, h) {
    const size = 12;
    this.bgCtx.save();
    this.bgCtx.beginPath();
    this.bgCtx.rect(x, y, w, h);
    this.bgCtx.clip();

    this.bgCtx.fillStyle = '#26262a';
    this.bgCtx.fillRect(x, y, w, h);

    this.bgCtx.fillStyle = '#333338';
    for (let py = y; py < y + h; py += size) {
      for (let px = x; px < x + w; px += size) {
        if ((Math.floor((px - x) / size) + Math.floor((py - y) / size)) % 2 === 0) {
          this.bgCtx.fillRect(px, py, Math.min(size, x + w - px), Math.min(size, y + h - py));
        }
      }
    }
    this.bgCtx.restore();
  }

  drawPixelGrid(dstX, dstY, imgW, imgH, zoom) {
    this.overlayCtx.save();
    this.overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.overlayCtx.lineWidth = 1;
    this.overlayCtx.beginPath();

    for (let x = 0; x <= imgW; x++) {
      const gx = Math.round(dstX + x * zoom) + 0.5;
      this.overlayCtx.moveTo(gx, dstY);
      this.overlayCtx.lineTo(gx, dstY + imgH * zoom);
    }

    for (let y = 0; y <= imgH; y++) {
      const gy = Math.round(dstY + y * zoom) + 0.5;
      this.overlayCtx.moveTo(dstX, gy);
      this.overlayCtx.lineTo(dstX + imgW * zoom, gy);
    }

    this.overlayCtx.stroke();
    this.overlayCtx.restore();
  }

  drawSelectionOverlay(sel) {
    const zoom = this.state.zoom;
    const sx = Math.round(this.state.panX + sel.x * zoom);
    const sy = Math.round(this.state.panY + sel.y * zoom);
    const sw = Math.round(sel.width * zoom);
    const sh = Math.round(sel.height * zoom);

    const ctx = this.overlayCtx;
    ctx.save();

    // Semi-transparent dimming outside selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    // Top
    ctx.fillRect(0, 0, this.viewportWidth, sy);
    // Bottom
    ctx.fillRect(0, sy + sh, this.viewportWidth, this.viewportHeight - (sy + sh));
    // Left
    ctx.fillRect(0, sy, sx, sh);
    // Right
    ctx.fillRect(sx + sw, sy, this.viewportWidth - (sx + sw), sh);

    // Marching ants / dual colored dashed border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);

    // Draw 8 Resizing Handles
    const handleSize = 8;
    const handles = [
      { x: sx, y: sy }, // nw
      { x: sx + sw / 2, y: sy }, // n
      { x: sx + sw, y: sy }, // ne
      { x: sx + sw, y: sy + sh / 2 }, // e
      { x: sx + sw, y: sy + sh }, // se
      { x: sx + sw / 2, y: sy + sh }, // s
      { x: sx, y: sy + sh }, // sw
      { x: sx, y: sy + sh / 2 } // w
    ];

    ctx.setLineDash([]);
    for (const h of handles) {
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(Math.round(h.x - handleSize / 2), Math.round(h.y - handleSize / 2), handleSize, handleSize);
      ctx.strokeRect(Math.round(h.x - handleSize / 2) + 0.5, Math.round(h.y - handleSize / 2) + 0.5, handleSize, handleSize);
    }

    // Draw dimension badge
    const badgeText = `${sel.width} × ${sel.height} px`;
    ctx.font = '11px sans-serif';
    const textW = ctx.measureText(badgeText).width;
    const badgeX = Math.max(8, Math.min(this.viewportWidth - textW - 20, sx));
    const badgeY = sy > 28 ? sy - 8 : sy + sh + 20;

    ctx.fillStyle = 'rgba(20, 20, 24, 0.85)';
    ctx.beginPath();
    ctx.roundRect(badgeX - 4, badgeY - 14, textW + 8, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badgeText, badgeX, badgeY);

    ctx.restore();
  }

  drawLoupe(pos) {
    const ctx = this.overlayCtx;
    const imgX = pos.imgX;
    const imgY = pos.imgY;
    const screenX = pos.screenX;
    const screenY = pos.screenY;

    if (imgX < 0 || imgX >= this.state.width || imgY < 0 || imgY >= this.state.height) return;

    // Sample 9x9 pixels around cursor
    const sampleSize = 9;
    const half = Math.floor(sampleSize / 2);
    const loupeRadius = 54;
    const pixelCellSize = (loupeRadius * 2) / sampleSize;

    // Position loupe offset from mouse so it doesn't obscure cursor
    let lx = screenX + 30;
    let ly = screenY - 30;
    if (lx + loupeRadius > this.viewportWidth - 10) lx = screenX - 30 - loupeRadius * 2;
    if (ly - loupeRadius < 10) ly = screenY + 30 + loupeRadius * 2;

    const imgCtx = this.state.imageCanvas.getContext('2d');
    const startX = Math.max(0, imgX - half);
    const startY = Math.max(0, imgY - half);
    const endX = Math.min(this.state.width - 1, imgX + half);
    const endY = Math.min(this.state.height - 1, imgY + half);

    const w = endX - startX + 1;
    const h = endY - startY + 1;
    const imgData = imgCtx.getImageData(startX, startY, w, h);

    // Get exact center pixel color
    const centerData = imgCtx.getImageData(imgX, imgY, 1, 1).data;
    const r = centerData[0], g = centerData[1], b = centerData[2], a = centerData[3];
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;

    ctx.save();

    // Clip circular loupe
    ctx.beginPath();
    ctx.arc(lx, ly, loupeRadius, 0, Math.PI * 2);
    ctx.clip();

    // Draw magnified pixels
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const curX = imgX + dx;
        const curY = imgY + dy;
        const cellLeft = lx - loupeRadius + (dx + half) * pixelCellSize;
        const cellTop = ly - loupeRadius + (dy + half) * pixelCellSize;

        if (curX >= 0 && curX < this.state.width && curY >= 0 && curY < this.state.height) {
          const sampleOffsetX = curX - startX;
          const sampleOffsetY = curY - startY;
          const idx = (sampleOffsetY * w + sampleOffsetX) * 4;
          const pr = imgData.data[idx];
          const pg = imgData.data[idx + 1];
          const pb = imgData.data[idx + 2];
          const pa = imgData.data[idx + 3] / 255;
          ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${pa})`;
        } else {
          ctx.fillStyle = '#1e1e24';
        }
        ctx.fillRect(cellLeft, cellTop, pixelCellSize, pixelCellSize);

        // Pixel grid in loupe
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cellLeft, cellTop, pixelCellSize, pixelCellSize);
      }
    }

    // Highlight center target pixel
    const centerLeft = lx - loupeRadius + half * pixelCellSize;
    const centerTop = ly - loupeRadius + half * pixelCellSize;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerLeft, centerTop, pixelCellSize, pixelCellSize);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerLeft - 1, centerTop - 1, pixelCellSize + 2, pixelCellSize + 2);

    ctx.restore();

    // Outer ring border
    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, loupeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Hex label badge below loupe
    const badgeText = `${hex} (${r},${g},${b})`;
    ctx.font = 'bold 11px monospace';
    const textW = ctx.measureText(badgeText).width;
    const badgeX = lx - textW / 2;
    const badgeY = ly + loupeRadius + 18;

    ctx.fillStyle = 'rgba(15, 15, 20, 0.9)';
    ctx.beginPath();
    ctx.roundRect(badgeX - 6, badgeY - 13, textW + 12, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(badgeText, badgeX, badgeY);

    ctx.restore();
  }

  showPreview(previewCanvas) {
    const dstX = Math.round(this.state.panX);
    const dstY = Math.round(this.state.panY);
    const dstW = Math.round(this.state.width * this.state.zoom);
    const dstH = Math.round(this.state.height * this.state.zoom);

    this.previewCtx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.previewCtx.drawImage(previewCanvas, dstX, dstY, dstW, dstH);
    this.previewCanvas.style.display = 'block';
  }

  hidePreview() {
    this.previewCanvas.style.display = 'none';
  }
}
