import { HistoryManager } from './history.js';

export class AppState {
  constructor() {
    this.imageCanvas = document.createElement('canvas');
    this.imageCanvas.width = 800;
    this.imageCanvas.height = 600;

    // Fill with default white background
    const ctx = this.imageCanvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 800, 600);

    this.filePath = null;
    this.fileName = 'untitled.png';
    this.fileFormat = 'png';
    this.isModified = false;

    this.activeTool = 'select'; // 'select', 'blur', 'picker', 'fill', 'hand'
    
    // Selection state: { x, y, width, height } in image pixel space
    this.selection = null;
    this.clipboardData = null;

    // Tool parameters
    this.primaryColor = '#3b82f6'; // Clean modern blue default
    this.recentColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#000000', '#ffffff'];
    this.tolerance = 20; // Flood fill tolerance
    this.blurRadius = 12; // Gaussian blur radius (px)

    // Viewport state
    this.zoom = 1.0; // 1.0 = 100%
    this.panX = 0;
    this.panY = 0;

    // History
    this.history = new HistoryManager();
    this.history.reset(this.imageCanvas, true);

    this.listeners = [];
  }

  get width() {
    return this.imageCanvas.width;
  }

  get height() {
    return this.imageCanvas.height;
  }

  onStateChange(callback) {
    this.listeners.push(callback);
  }

  emitChange(property) {
    for (const cb of this.listeners) {
      cb(property, this);
    }
  }

  setActiveTool(tool) {
    if (this.activeTool !== tool) {
      this.activeTool = tool;
      this.emitChange('activeTool');
    }
  }

  setSelection(sel) {
    if (sel) {
      // Normalize rectangle coordinates (prevent negative width/height)
      const x = Math.max(0, Math.min(this.width, Math.round(sel.width >= 0 ? sel.x : sel.x + sel.width)));
      const y = Math.max(0, Math.min(this.height, Math.round(sel.height >= 0 ? sel.y : sel.y + sel.height)));
      const w = Math.min(this.width - x, Math.abs(Math.round(sel.width)));
      const h = Math.min(this.height - y, Math.abs(Math.round(sel.height)));
      
      if (w > 0 && h > 0) {
        this.selection = { x, y, width: w, height: h };
      } else {
        this.selection = null;
      }
    } else {
      this.selection = null;
    }
    this.emitChange('selection');
  }

  clearSelection() {
    this.selection = null;
    this.emitChange('selection');
  }

  selectAll() {
    this.setSelection({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height
    });
  }

  setPrimaryColor(color) {
    this.primaryColor = color;
    if (!this.recentColors.includes(color)) {
      this.recentColors.unshift(color);
      if (this.recentColors.length > 12) this.recentColors.pop();
    }
    this.emitChange('primaryColor');
  }

  setTolerance(tol) {
    this.tolerance = Math.max(0, Math.min(100, tol));
    this.emitChange('tolerance');
  }

  setBlurRadius(radius) {
    this.blurRadius = Math.max(0, Math.min(100, radius));
    this.emitChange('blurRadius');
  }

  setZoom(zoom, centerX = null, centerY = null) {
    const minZoom = 0.05;
    const maxZoom = 32.0;
    const clamped = Math.max(minZoom, Math.min(maxZoom, zoom));
    
    if (this.zoom !== clamped) {
      this.zoom = clamped;
      this.emitChange('zoom');
    }
  }

  setPan(x, y) {
    this.panX = x;
    this.panY = y;
    this.emitChange('pan');
  }

  recordAction(actionName) {
    this.history.pushState(this.imageCanvas, actionName);
    this.isModified = true;
    this.emitChange('imageContent');
  }
}
