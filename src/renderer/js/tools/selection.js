export class SelectionTool {
  constructor(engine, state) {
    this.engine = engine;
    this.state = state;

    this.mode = 'idle'; // 'idle', 'creating', 'moving', 'resizing'
    this.dragStart = { x: 0, y: 0 };
    this.initialSelection = null;
    this.activeHandle = null;

    this.initEvents();
  }

  initEvents() {
    const container = this.engine.container;

    container.addEventListener('mousedown', (e) => {
      if (this.state.activeTool !== 'select' || e.button !== 0) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const imgCoord = this.engine.viewportToImage(mouseX, mouseY);

      const hit = this.hitTest(mouseX, mouseY);

      if (hit.handle) {
        // Resizing existing selection
        this.mode = 'resizing';
        this.activeHandle = hit.handle;
        this.dragStart = { x: imgCoord.exactX, y: imgCoord.exactY };
        this.initialSelection = { ...this.state.selection };
        e.stopPropagation();
      } else if (hit.inside) {
        // Moving existing selection
        this.mode = 'moving';
        this.dragStart = { x: imgCoord.exactX, y: imgCoord.exactY };
        this.initialSelection = { ...this.state.selection };
        e.stopPropagation();
      } else {
        // Creating new selection
        this.mode = 'creating';
        const startX = Math.max(0, Math.min(this.state.width, imgCoord.x));
        const startY = Math.max(0, Math.min(this.state.height, imgCoord.y));
        this.dragStart = { x: startX, y: startY };
        this.state.setSelection({ x: startX, y: startY, width: 0, height: 0 });
        this.engine.render();
      }
    });

    window.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.mode === 'idle') {
        if (this.state.activeTool === 'select') {
          this.updateCursor(mouseX, mouseY);
        }
        return;
      }

      const imgCoord = this.engine.viewportToImage(mouseX, mouseY);

      if (this.mode === 'creating') {
        const curX = Math.max(0, Math.min(this.state.width, imgCoord.x));
        const curY = Math.max(0, Math.min(this.state.height, imgCoord.y));

        const x = Math.min(this.dragStart.x, curX);
        const y = Math.min(this.dragStart.y, curY);
        const width = Math.abs(curX - this.dragStart.x);
        const height = Math.abs(curY - this.dragStart.y);

        this.state.setSelection({ x, y, width, height });
        this.engine.render();
      } else if (this.mode === 'moving' && this.initialSelection) {
        const dx = Math.round(imgCoord.exactX - this.dragStart.x);
        const dy = Math.round(imgCoord.exactY - this.dragStart.y);

        const newX = Math.max(0, Math.min(this.state.width - this.initialSelection.width, this.initialSelection.x + dx));
        const newY = Math.max(0, Math.min(this.state.height - this.initialSelection.height, this.initialSelection.y + dy));

        this.state.setSelection({
          ...this.initialSelection,
          x: newX,
          y: newY
        });
        this.engine.render();
      } else if (this.mode === 'resizing' && this.initialSelection) {
        const curX = imgCoord.exactX;
        const curY = imgCoord.exactY;
        const init = this.initialSelection;
        let { x, y, width, height } = init;

        switch (this.activeHandle) {
          case 'nw': {
            const right = init.x + init.width;
            const bottom = init.y + init.height;
            x = Math.max(0, Math.min(right - 1, Math.round(curX)));
            y = Math.max(0, Math.min(bottom - 1, Math.round(curY)));
            width = right - x;
            height = bottom - y;
            break;
          }
          case 'n': {
            const bottom = init.y + init.height;
            y = Math.max(0, Math.min(bottom - 1, Math.round(curY)));
            height = bottom - y;
            break;
          }
          case 'ne': {
            const bottom = init.y + init.height;
            const newRight = Math.min(this.state.width, Math.max(init.x + 1, Math.round(curX)));
            y = Math.max(0, Math.min(bottom - 1, Math.round(curY)));
            width = newRight - init.x;
            height = bottom - y;
            break;
          }
          case 'e': {
            const newRight = Math.min(this.state.width, Math.max(init.x + 1, Math.round(curX)));
            width = newRight - init.x;
            break;
          }
          case 'se': {
            const newRight = Math.min(this.state.width, Math.max(init.x + 1, Math.round(curX)));
            const newBottom = Math.min(this.state.height, Math.max(init.y + 1, Math.round(curY)));
            width = newRight - init.x;
            height = newBottom - init.y;
            break;
          }
          case 's': {
            const newBottom = Math.min(this.state.height, Math.max(init.y + 1, Math.round(curY)));
            height = newBottom - init.y;
            break;
          }
          case 'sw': {
            const right = init.x + init.width;
            const newBottom = Math.min(this.state.height, Math.max(init.y + 1, Math.round(curY)));
            x = Math.max(0, Math.min(right - 1, Math.round(curX)));
            width = right - x;
            height = newBottom - init.y;
            break;
          }
          case 'w': {
            const right = init.x + init.width;
            x = Math.max(0, Math.min(right - 1, Math.round(curX)));
            width = right - x;
            break;
          }
        }

        this.state.setSelection({ x, y, width, height });
        this.engine.render();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.mode !== 'idle') {
        this.mode = 'idle';
        this.activeHandle = null;
        this.initialSelection = null;
        if (this.state.selection && (this.state.selection.width <= 1 || this.state.selection.height <= 1)) {
          this.state.clearSelection();
        }
        this.engine.render();
      }
    });
  }

  hitTest(screenX, screenY) {
    if (!this.state.selection) return { inside: false, handle: null };

    const sel = this.state.selection;
    const zoom = this.state.zoom;
    const sx = this.state.panX + sel.x * zoom;
    const sy = this.state.panY + sel.y * zoom;
    const sw = sel.width * zoom;
    const sh = sel.height * zoom;

    const handleHitRadius = 9;

    const handles = {
      nw: { x: sx, y: sy },
      n: { x: sx + sw / 2, y: sy },
      ne: { x: sx + sw, y: sy },
      e: { x: sx + sw, y: sy + sh / 2 },
      se: { x: sx + sw, y: sy + sh },
      s: { x: sx + sw / 2, y: sy + sh },
      sw: { x: sx, y: sy + sh },
      w: { x: sx, y: sy + sh / 2 }
    };

    for (const [handle, pos] of Object.entries(handles)) {
      if (Math.abs(screenX - pos.x) <= handleHitRadius && Math.abs(screenY - pos.y) <= handleHitRadius) {
        return { inside: true, handle };
      }
    }

    const inside = screenX >= sx && screenX <= sx + sw && screenY >= sy && screenY <= sy + sh;
    return { inside, handle: null };
  }

  updateCursor(screenX, screenY) {
    const hit = this.hitTest(screenX, screenY);
    const container = this.engine.container;

    if (hit.handle) {
      const cursorMap = {
        nw: 'nwse-resize',
        se: 'nwse-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize',
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize'
      };
      container.style.cursor = cursorMap[hit.handle] || 'crosshair';
    } else if (hit.inside) {
      container.style.cursor = 'move';
    } else {
      container.style.cursor = 'crosshair';
    }
  }

  /**
   * Directly sets the selection dimensions in pixels.
   */
  setExactDimensions(width, height, x = null, y = null) {
    const w = Math.max(1, Math.min(this.state.width, Math.round(width)));
    const h = Math.max(1, Math.min(this.state.height, Math.round(height)));

    let curX;
    let curY;

    if (x !== null && !isNaN(x)) {
      curX = Math.round(x);
    } else if (this.state.selection) {
      curX = this.state.selection.x;
    } else {
      curX = Math.round((this.state.width - w) / 2);
    }

    if (y !== null && !isNaN(y)) {
      curY = Math.round(y);
    } else if (this.state.selection) {
      curY = this.state.selection.y;
    } else {
      curY = Math.round((this.state.height - h) / 2);
    }

    // Clamp within image bounds
    curX = Math.max(0, Math.min(this.state.width - w, curX));
    curY = Math.max(0, Math.min(this.state.height - h, curY));

    this.state.setSelection({
      x: curX,
      y: curY,
      width: w,
      height: h
    });
    this.engine.startMarchingAnts();
    this.engine.render();
  }

  /**
   * Crops the canvas to current selection.
   */
  cropToSelection() {
    const sel = this.state.selection;
    if (!sel || sel.width <= 0 || sel.height <= 0) return;

    const { x, y, width, height } = sel;
    const ctx = this.state.imageCanvas.getContext('2d');
    const croppedData = ctx.getImageData(x, y, width, height);

    this.state.imageCanvas.width = width;
    this.state.imageCanvas.height = height;

    const newCtx = this.state.imageCanvas.getContext('2d');
    newCtx.putImageData(croppedData, 0, 0);

    this.state.clearSelection();
    this.state.recordAction(`Crop (${width}×${height})`);
    this.engine.zoomToFit();
  }

  /**
   * Clears pixels in the selection to transparent or white.
   */
  clearSelection() {
    const sel = this.state.selection;
    if (!sel) return;

    const ctx = this.state.imageCanvas.getContext('2d');
    ctx.clearRect(sel.x, sel.y, sel.width, sel.height);

    this.state.recordAction('Clear Selection');
    this.engine.render();
  }

  /**
   * Copies current selection to internal clipboard and system clipboard.
   */
  async copySelection() {
    const sel = this.state.selection;
    if (!sel) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sel.width;
    tempCanvas.height = sel.height;
    const ctx = tempCanvas.getContext('2d');
    
    ctx.drawImage(
      this.state.imageCanvas,
      sel.x, sel.y, sel.width, sel.height,
      0, 0, sel.width, sel.height
    );

    const dataUrl = tempCanvas.toDataURL('image/png');
    this.state.clipboardData = {
      width: sel.width,
      height: sel.height,
      dataUrl,
      imageData: ctx.getImageData(0, 0, sel.width, sel.height)
    };

    if (window.electronAPI && window.electronAPI.writeClipboardImage) {
      await window.electronAPI.writeClipboardImage(dataUrl);
    }
  }

  /**
   * Cuts current selection (copies then clears).
   */
  async cutSelection() {
    if (!this.state.selection) return;
    await this.copySelection();
    this.clearSelection();
  }
}
