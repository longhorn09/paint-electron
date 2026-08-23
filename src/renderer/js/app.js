import { AppState } from './state.js';
import { CanvasEngine } from './canvas-engine.js';
import { SelectionTool } from './tools/selection.js';
import { TransformTool } from './tools/transform.js';
import { ResizeTool } from './tools/resize.js';
import { BlurTool } from './tools/blur.js';
import { PickerTool } from './tools/picker.js';
import { FillTool } from './tools/fill.js';
import { loadImageFromDataUrl, getCanvasFileBuffer, getCanvasPngDataUrl } from './utils/file-io.js';
import { ensureSaveExtension, getPathExtension, normalizeSaveExt } from '../../shared/save-path.js';

class PaintApp {
  constructor() {
    this.state = new AppState();

    // DOM Elements
    this.canvasContainer = document.getElementById('canvas-container');
    this.engine = new CanvasEngine(this.canvasContainer, this.state);

    // Tools
    this.selectionTool = new SelectionTool(this.engine, this.state);
    this.transformTool = new TransformTool(this.engine, this.state);
    this.resizeTool = new ResizeTool(this.engine, this.state);
    this.blurTool = new BlurTool(this.engine, this.state);
    this.pickerTool = new PickerTool(this.engine, this.state);
    this.fillTool = new FillTool(this.engine, this.state);

    // Modals and Drawers
    this.resizeModal = document.getElementById('resize-modal');
    this.newImageModal = document.getElementById('new-image-modal');
    this.aboutModal = document.getElementById('about-modal');
    this.blurBar = document.getElementById('blur-adjust-bar');

    this._saveInProgress = false;

    this.initUI();
    this.initMenuAndShortcuts();
    this.initFileDropAndPaste();
    this.initElectronIPC();

    // Initial render
    this.engine.zoomToFit();
    this.updateTitle();
    this.updateStatusBar();
  }

  initUI() {
    // 1. Tool Selection Buttons
    const toolButtons = document.querySelectorAll('[data-tool]');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        if (tool === 'blur') {
          this.openBlurAdjustment();
        } else {
          this.closeBlurAdjustment(false);
          this.state.setActiveTool(tool);
        }
      });
    });

    // 2. Selection Dimensions Inputs in Toolbar
    this.selWInput = document.getElementById('sel-width-input');
    this.selHInput = document.getElementById('sel-height-input');
    this.selXInput = document.getElementById('sel-x-input');
    this.selYInput = document.getElementById('sel-y-input');
    this.btnSetSelSize = document.getElementById('btn-set-sel-size');

    const applySelectionInputs = () => {
      const w = parseInt(this.selWInput.value, 10);
      const h = parseInt(this.selHInput.value, 10);
      const x = parseInt(this.selXInput.value, 10);
      const y = parseInt(this.selYInput.value, 10);

      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        this.selectionTool.setExactDimensions(w, h, isNaN(x) ? null : x, isNaN(y) ? null : y);
      }
    };

    if (this.btnSetSelSize) {
      this.btnSetSelSize.addEventListener('click', applySelectionInputs);
    }

    [this.selWInput, this.selHInput, this.selXInput, this.selYInput].forEach(input => {
      if (!input) return;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          applySelectionInputs();
        }
      });
      input.addEventListener('change', applySelectionInputs);
    });

    // 3. Selection Actions Toolbar Buttons
    document.getElementById('btn-select-all')?.addEventListener('click', () => this.state.selectAll());
    document.getElementById('btn-deselect')?.addEventListener('click', () => this.state.clearSelection());
    document.getElementById('btn-crop-sel')?.addEventListener('click', () => this.selectionTool.cropToSelection());
    document.getElementById('btn-clear-sel')?.addEventListener('click', () => this.selectionTool.clearSelection());
    document.getElementById('btn-copy-sel')?.addEventListener('click', () => this.selectionTool.copySelection());
    document.getElementById('btn-cut-sel')?.addEventListener('click', () => this.selectionTool.cutSelection());

    // 4. Transform Buttons
    document.getElementById('btn-rotate-cw')?.addEventListener('click', () => this.transformTool.rotate90CW());
    document.getElementById('btn-rotate-ccw')?.addEventListener('click', () => this.transformTool.rotate90CCW());
    document.getElementById('btn-rotate-180')?.addEventListener('click', () => this.transformTool.rotate180());
    document.getElementById('btn-flip-h')?.addEventListener('click', () => this.transformTool.flipHorizontal());
    document.getElementById('btn-flip-v')?.addEventListener('click', () => this.transformTool.flipVertical());

    // 5. Image Resize Button & Modal
    document.getElementById('btn-open-resize')?.addEventListener('click', () => this.openResizeModal());
    this.initResizeModal();

    // About & Help Button & Modal
    document.getElementById('btn-open-about')?.addEventListener('click', () => this.openAboutModal());
    this.initAboutModal();

    // 6. Gaussian Blur Slider & Bar
    this.initBlurControls();

    // 7. Color Picker & Fill Tolerance Controls
    this.initColorAndFillControls();

    // 8. History Buttons (Undo / Redo)
    this.btnUndo = document.getElementById('btn-undo');
    this.btnRedo = document.getElementById('btn-redo');

    this.btnUndo?.addEventListener('click', () => {
      this.state.history.undo(this.state.imageCanvas);
      this.state.clearSelection();
      this.engine.render();
    });

    this.btnRedo?.addEventListener('click', () => {
      this.state.history.redo(this.state.imageCanvas);
      this.state.clearSelection();
      this.engine.render();
    });

    this.state.history.onChange(({ canUndo, canRedo }) => {
      if (this.btnUndo) this.btnUndo.disabled = !canUndo;
      if (this.btnRedo) this.btnRedo.disabled = !canRedo;
      this.updateTitle();
      this.updateStatusBar();
    });

    // 9. Zoom Controls
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.engine.zoomAt(this.engine.viewportWidth / 2, this.engine.viewportHeight / 2, 1.25));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.engine.zoomAt(this.engine.viewportWidth / 2, this.engine.viewportHeight / 2, 0.8));
    document.getElementById('btn-zoom-fit')?.addEventListener('click', () => this.engine.zoomToFit());
    document.getElementById('btn-zoom-100')?.addEventListener('click', () => this.engine.zoomToActual());

    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.engine.zoomAt(this.engine.viewportWidth / 2, this.engine.viewportHeight / 2, val / this.state.zoom);
      });
    }

    // 10. File Action Buttons
    document.getElementById('btn-file-new')?.addEventListener('click', () => this.openNewImageModal());
    document.getElementById('btn-file-open')?.addEventListener('click', () => this.handleOpenFile());
    document.getElementById('btn-file-save')?.addEventListener('click', () => this.handleSaveFile(false));
    document.getElementById('btn-file-save-as')?.addEventListener('click', () => this.handleSaveFile(true));

    // Listen for state changes
    this.state.onStateChange((prop) => {
      if (prop === 'activeTool') {
        this.updateToolButtons();
      } else if (prop === 'selection') {
        this.updateSelectionUI();
      } else if (prop === 'zoom' || prop === 'pan') {
        this.updateStatusBar();
      } else if (prop === 'imageContent') {
        this.updateStatusBar();
        this.updateTitle();
        this.engine.render();
      }
    });

    // Listen to cursor coordinates
    this.canvasContainer.addEventListener('cursor:move', (e) => {
      const { imgX, imgY, isInside } = e.detail;
      const statusCoord = document.getElementById('status-cursor');
      const statusColor = document.getElementById('status-color-preview');

      if (statusCoord) {
        statusCoord.textContent = isInside ? `X: ${imgX}, Y: ${imgY}` : '—';
      }

      if (statusColor && isInside) {
        const color = this.pickerTool.sampleColor(imgX, imgY);
        if (color) {
          statusColor.style.backgroundColor = color.hex;
          statusColor.title = `${color.hex} (${color.r}, ${color.g}, ${color.b}, ${color.a})`;
        }
      }
    });
  }

  updateToolButtons() {
    document.querySelectorAll('[data-tool]').forEach(btn => {
      const isActive = btn.dataset.tool === this.state.activeTool;
      btn.classList.toggle('active', isActive);
    });

    // Show/hide relevant tool options
    const selectionOptions = document.getElementById('selection-options-bar');
    const fillOptions = document.getElementById('fill-options-bar');

    if (selectionOptions) {
      selectionOptions.style.display = this.state.activeTool === 'select' ? 'flex' : 'none';
    }
    if (fillOptions) {
      fillOptions.style.display = this.state.activeTool === 'fill' ? 'flex' : 'none';
    }
  }

  updateSelectionUI() {
    const sel = this.state.selection;
    if (sel) {
      if (this.selWInput) this.selWInput.value = sel.width;
      if (this.selHInput) this.selHInput.value = sel.height;
      if (this.selXInput) this.selXInput.value = sel.x;
      if (this.selYInput) this.selYInput.value = sel.y;
    }

    const selButtons = ['btn-crop-sel', 'btn-clear-sel', 'btn-copy-sel', 'btn-cut-sel', 'btn-deselect'];
    selButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = !sel;
    });

    this.updateStatusBar();
    this.engine.render();
  }

  updateStatusBar() {
    const dimEl = document.getElementById('status-dimensions');
    if (dimEl) {
      dimEl.textContent = `${this.state.width} × ${this.state.height} px`;
    }

    const selEl = document.getElementById('status-selection');
    if (selEl) {
      if (this.state.selection) {
        const { x, y, width, height } = this.state.selection;
        selEl.textContent = `Sel: ${width} × ${height} at (${x}, ${y})`;
      } else {
        selEl.textContent = 'No selection';
      }
    }

    const zoomEl = document.getElementById('status-zoom');
    if (zoomEl) {
      zoomEl.textContent = `${Math.round(this.state.zoom * 100)}%`;
    }

    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) {
      zoomSlider.value = this.state.zoom;
    }
  }

  updateTitle() {
    const mod = this.state.history.isModified() ? ' •' : '';
    const title = `${this.state.fileName}${mod} — Paint`;
    document.title = title;
    if (window.electronAPI && window.electronAPI.setTitle) {
      window.electronAPI.setTitle(title);
    }
  }

  // --- Resize Modal Logic ---
  initResizeModal() {
    const modal = this.resizeModal;
    const wInput = document.getElementById('resize-w-input');
    const hInput = document.getElementById('resize-h-input');
    const wPctInput = document.getElementById('resize-w-pct');
    const hPctInput = document.getElementById('resize-h-pct');
    const lockBtn = document.getElementById('resize-lock-ratio');
    const interpSelect = document.getElementById('resize-interpolation');
    const btnApply = document.getElementById('btn-resize-apply');
    const btnCancel = document.getElementById('btn-resize-cancel');

    let isLocked = true;
    this.resizeSourceW = 800;
    this.resizeSourceH = 600;

    lockBtn?.addEventListener('click', () => {
      isLocked = !isLocked;
      lockBtn.classList.toggle('locked', isLocked);
      lockBtn.title = isLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked';
    });

    const sourceW = () => Math.max(1, this.resizeSourceW);
    const sourceH = () => Math.max(1, this.resizeSourceH);

    const updateFromWidth = (val) => {
      const w = parseInt(val, 10);
      if (isNaN(w) || w <= 0) return;
      wPctInput.value = Math.round((w / sourceW()) * 100);
      if (isLocked) {
        const h = Math.round(w * (sourceH() / sourceW()));
        hInput.value = h;
        hPctInput.value = Math.round((h / sourceH()) * 100);
      }
    };

    const updateFromHeight = (val) => {
      const h = parseInt(val, 10);
      if (isNaN(h) || h <= 0) return;
      hPctInput.value = Math.round((h / sourceH()) * 100);
      if (isLocked) {
        const w = Math.round(h * (sourceW() / sourceH()));
        wInput.value = w;
        wPctInput.value = Math.round((w / sourceW()) * 100);
      }
    };

    const updateFromPctW = (val) => {
      const pct = parseFloat(val);
      if (isNaN(pct) || pct <= 0) return;
      const w = Math.round(sourceW() * (pct / 100));
      wInput.value = w;
      if (isLocked) {
        hPctInput.value = pct;
        hInput.value = Math.round(sourceH() * (pct / 100));
      }
    };

    const updateFromPctH = (val) => {
      const pct = parseFloat(val);
      if (isNaN(pct) || pct <= 0) return;
      const h = Math.round(sourceH() * (pct / 100));
      hInput.value = h;
      if (isLocked) {
        wPctInput.value = pct;
        wInput.value = Math.round(sourceW() * (pct / 100));
      }
    };

    wInput?.addEventListener('input', (e) => updateFromWidth(e.target.value));
    hInput?.addEventListener('input', (e) => updateFromHeight(e.target.value));
    wPctInput?.addEventListener('input', (e) => updateFromPctW(e.target.value));
    hPctInput?.addEventListener('input', (e) => updateFromPctH(e.target.value));

    // Preset buttons (50%, 75%, 200%, 1080p, etc.)
    document.querySelectorAll('[data-resize-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.resizePreset;
        if (preset.endsWith('%')) {
          const pct = parseFloat(preset);
          wPctInput.value = pct;
          updateFromPctW(pct);
        } else if (preset.includes('x')) {
          const [pw, ph] = preset.split('x').map(Number);
          wInput.value = pw;
          hInput.value = ph;
          wPctInput.value = Math.round((pw / sourceW()) * 100);
          hPctInput.value = Math.round((ph / sourceH()) * 100);
        }
      });
    });

    btnApply?.addEventListener('click', () => {
      const finalW = parseInt(wInput.value, 10);
      const finalH = parseInt(hInput.value, 10);
      const interp = interpSelect?.value || 'smooth';

      if (finalW > 0 && finalH > 0) {
        this.resizeTool.resizeImage(finalW, finalH, interp);
      }
      this.closeModal(modal);
    });

    btnCancel?.addEventListener('click', () => {
      this.closeModal(modal);
    });
  }

  openResizeModal() {
    const modal = this.resizeModal;
    const wInput = document.getElementById('resize-w-input');
    const hInput = document.getElementById('resize-h-input');
    const wPctInput = document.getElementById('resize-w-pct');
    const hPctInput = document.getElementById('resize-h-pct');
    const infoSpan = document.getElementById('resize-current-info');

    const curW = this.state.width;
    const curH = this.state.height;
    this.resizeSourceW = Math.max(1, curW);
    this.resizeSourceH = Math.max(1, curH);

    if (infoSpan) infoSpan.textContent = `Current: ${curW} × ${curH} px`;
    if (wInput) wInput.value = curW;
    if (hInput) hInput.value = curH;
    if (wPctInput) wPctInput.value = 100;
    if (hPctInput) hPctInput.value = 100;

    modal.style.display = 'flex';
    wInput?.focus();
    wInput?.select();
  }

  // --- Gaussian Blur Controls ---
  initBlurControls() {
    const slider = document.getElementById('blur-radius-slider');
    const radiusLabel = document.getElementById('blur-radius-value');
    const btnApply = document.getElementById('btn-blur-apply');
    const btnCancel = document.getElementById('btn-blur-cancel');

    slider?.addEventListener('input', (e) => {
      const radius = parseInt(e.target.value, 10);
      if (radiusLabel) radiusLabel.textContent = `${radius} px`;
      this.state.setBlurRadius(radius);
      this.blurTool.updatePreview(radius);
    });

    btnApply?.addEventListener('click', () => {
      this.blurTool.apply();
      this.closeBlurAdjustment(true);
    });

    btnCancel?.addEventListener('click', () => {
      this.blurTool.cancel();
      this.closeBlurAdjustment(false);
    });
  }

  openBlurAdjustment() {
    if (this.blurBar) {
      this.blurBar.style.display = 'flex';
    }
    const slider = document.getElementById('blur-radius-slider');
    const radius = this.state.blurRadius || 12;
    if (slider) slider.value = radius;
    const radiusLabel = document.getElementById('blur-radius-value');
    if (radiusLabel) radiusLabel.textContent = `${radius} px`;

    this.state.setActiveTool('blur');
    this.blurTool.startSession(radius);
  }

  closeBlurAdjustment(applied = false) {
    if (this.blurBar) {
      this.blurBar.style.display = 'none';
    }
    if (!applied) {
      this.blurTool.cancel();
    }
    if (this.state.activeTool === 'blur') {
      this.state.setActiveTool('select');
    }
  }

  // --- Color and Fill Controls ---
  initColorAndFillControls() {
    const colorInput = document.getElementById('primary-color-input');
    const hexInput = document.getElementById('primary-color-hex');
    const toleranceSlider = document.getElementById('fill-tolerance-slider');
    const toleranceLabel = document.getElementById('fill-tolerance-value');
    const recentPaletteContainer = document.getElementById('recent-colors-palette');

    colorInput?.addEventListener('input', (e) => {
      const color = e.target.value;
      if (hexInput) hexInput.value = color.toUpperCase();
      this.state.setPrimaryColor(color);
      this.renderRecentColors();
    });

    hexInput?.addEventListener('change', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        if (colorInput) colorInput.value = val;
        this.state.setPrimaryColor(val);
        this.renderRecentColors();
      }
    });

    toleranceSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (toleranceLabel) toleranceLabel.textContent = `${val}%`;
      this.state.setTolerance(val);
    });

    // Listen to Eyedropper picked color
    this.canvasContainer.addEventListener('color:picked', (e) => {
      const color = e.detail;
      if (colorInput) colorInput.value = color.hex.slice(0, 7);
      if (hexInput) hexInput.value = color.hex;
      this.renderRecentColors();
    });

    this.renderRecentColors = () => {
      if (!recentPaletteContainer) return;
      recentPaletteContainer.innerHTML = '';
      this.state.recentColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color;
        swatch.addEventListener('click', () => {
          if (colorInput) colorInput.value = color.slice(0, 7);
          if (hexInput) hexInput.value = color;
          this.state.setPrimaryColor(color);
        });
        recentPaletteContainer.appendChild(swatch);
      });
    };

    this.renderRecentColors();
  }

  // --- New Image Modal ---
  openNewImageModal() {
    const modal = this.newImageModal;
    const wInput = document.getElementById('new-w-input');
    const hInput = document.getElementById('new-h-input');
    const bgSelect = document.getElementById('new-bg-select');
    const btnCreate = document.getElementById('btn-new-create');
    const btnCancel = document.getElementById('btn-new-cancel');

    if (!modal) return;
    modal.style.display = 'flex';
    wInput?.focus();

    btnCreate.onclick = () => {
      const w = parseInt(wInput.value, 10) || 800;
      const h = parseInt(hInput.value, 10) || 600;
      const bg = bgSelect?.value || 'white';

      this.createNewCanvas(w, h, bg);
      this.closeModal(modal);
    };

    btnCancel.onclick = () => {
      this.closeModal(modal);
    };
  }

  // --- About & Help Modal ---
  initAboutModal() {
    const modal = this.aboutModal;
    const btnClose = document.getElementById('btn-about-close');
    const btnCloseX = document.getElementById('btn-about-close-x');
    const tabBtns = document.querySelectorAll('[data-about-tab]');

    const closeAbout = () => {
      if (modal) modal.style.display = 'none';
    };

    btnClose?.addEventListener('click', closeAbout);
    btnCloseX?.addEventListener('click', closeAbout);

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.aboutTab;
        this.switchAboutTab(tab);
      });
    });

    const openUrl = (url) => {
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    };

    document.getElementById('link-github-repo')?.addEventListener('click', (e) => {
      e.preventDefault();
      openUrl('https://github.com/longhorn09/paint-electron');
    });

    document.getElementById('btn-open-github')?.addEventListener('click', () => {
      openUrl('https://github.com/longhorn09/paint-electron');
    });

    document.getElementById('btn-open-fork')?.addEventListener('click', () => {
      openUrl('https://github.com/longhorn09/paint-electron/fork');
    });

    document.getElementById('btn-open-issues')?.addEventListener('click', () => {
      openUrl('https://github.com/longhorn09/paint-electron/issues');
    });
  }

  switchAboutTab(tabName) {
    const tabBtns = document.querySelectorAll('[data-about-tab]');
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.aboutTab === tabName);
    });

    const tabAbout = document.getElementById('about-tab-content-about');
    const tabShortcuts = document.getElementById('about-tab-content-shortcuts');

    if (tabAbout) tabAbout.style.display = tabName === 'about' ? 'flex' : 'none';
    if (tabShortcuts) tabShortcuts.style.display = tabName === 'shortcuts' ? 'block' : 'none';
  }

  openAboutModal(tab = 'about') {
    if (!this.aboutModal) return;
    this.switchAboutTab(tab);
    this.aboutModal.style.display = 'flex';
  }

  createNewCanvas(width, height, background = 'white') {
    this.state.imageCanvas.width = width;
    this.state.imageCanvas.height = height;
    const ctx = this.state.imageCanvas.getContext('2d');

    if (background === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    } else if (background === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    this.state.filePath = null;
    this.state.fileName = 'untitled.png';
    this.state.fileFormat = 'png';
    this.state.clearSelection();
    this.state.history.reset(this.state.imageCanvas, true);

    this.engine.zoomToFit();
    this.updateTitle();
    this.updateStatusBar();
  }

  // --- File Open / Save Logic ---
  async handleOpenFile() {
    if (this.state.history.isModified()) {
      if (window.electronAPI && window.electronAPI.showMessage) {
        const { response } = await window.electronAPI.showMessage({
          type: 'question',
          buttons: ['Save', "Don't Save", 'Cancel'],
          defaultId: 0,
          title: 'Unsaved Changes',
          message: `Do you want to save changes to ${this.state.fileName}?`
        });
        if (response === 0) {
          await this.handleSaveFile(false);
        } else if (response === 2) {
          return;
        }
      }
    }

    if (window.electronAPI && window.electronAPI.openFileDialog) {
      await window.electronAPI.openFileDialog();
    }
  }

  closeModal(modal) {
    if (modal) modal.style.display = 'none';
    const active = document.activeElement;
    if (active && typeof active.blur === 'function') active.blur();
  }

  async handleSaveFile(saveAs = false) {
    if (this._saveInProgress) return;
    this._saveInProgress = true;

    try {
      this.closeModal(this.resizeModal);
      this.closeModal(this.newImageModal);

      let targetPath = this.state.filePath;
      let format = this.state.fileFormat || 'png';

      // If no existing file path or user clicked "Save As", prompt Save As Dialog
      if (!targetPath || saveAs) {
        if (!window.electronAPI || !window.electronAPI.saveAsDialog) {
          alert('File saving is only available in the desktop app.');
          return;
        }

        const defaultName = this.state.fileName || 'untitled.png';
        const nameExt = defaultName.includes('.') ? defaultName.split('.').pop() : '';
        const defaultExt = this.state.fileFormat || nameExt || 'png';

        targetPath = await window.electronAPI.saveAsDialog({
          defaultName,
          defaultExt
        });

        if (!targetPath) return; // User cancelled
      }

      // Native Linux dialogs often omit the selected type's extension
      targetPath = ensureSaveExtension(targetPath, format);
      const pathExt = getPathExtension(targetPath);
      if (pathExt) format = normalizeSaveExt(pathExt);

      const { buffer } = await getCanvasFileBuffer(this.state.imageCanvas, format);

      const result = await window.electronAPI.writeFile({
        filePath: targetPath,
        buffer
      });

      if (result && result.success) {
        this.state.filePath = result.filePath;
        this.state.fileName = result.fileName;
        this.state.fileFormat = format;
        this.state.history.markSaved();
        this.updateTitle();
      } else {
        alert(`Error saving file: ${result ? result.error : 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert(`Error saving file: ${err.message || err}`);
    } finally {
      this._saveInProgress = false;
    }
  }

  async loadFromDataUrl(dataUrl, fileName = 'untitled.png', filePath = null, ext = 'png') {
    try {
      const img = await loadImageFromDataUrl(dataUrl);
      this.state.imageCanvas.width = img.naturalWidth || img.width;
      this.state.imageCanvas.height = img.naturalHeight || img.height;

      const ctx = this.state.imageCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.state.imageCanvas.width, this.state.imageCanvas.height);
      ctx.drawImage(img, 0, 0);

      this.state.filePath = filePath;
      this.state.fileName = fileName;
      this.state.fileFormat = ext;
      this.state.clearSelection();
      this.state.history.reset(this.state.imageCanvas, true);

      this.engine.zoomToFit();
      this.updateTitle();
      this.updateStatusBar();
    } catch (err) {
      console.error('Failed to load image:', err);
      alert('Failed to load image: ' + err.message);
    }
  }

  initElectronIPC() {
    if (window.electronAPI && window.electronAPI.onFileOpened) {
      window.electronAPI.onFileOpened(({ filePath, fileName, dataUrl, ext }) => {
        this.loadFromDataUrl(dataUrl, fileName, filePath, ext);
      });
    }

    if (window.electronAPI && window.electronAPI.onMenuCommand) {
      window.electronAPI.onMenuCommand((command) => {
        if (command === 'save') this.handleSaveFile(false);
        if (command === 'save-as') this.handleSaveFile(true);
      });
    }
  }

  initFileDropAndPaste() {
    // Drag and Drop
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (re) => {
            const ext = file.name.split('.').pop().toLowerCase();
            this.loadFromDataUrl(re.target.result, file.name, file.path || null, ext);
          };
          reader.readAsDataURL(file);
        }
      }
    });

    // Paste from clipboard
    window.addEventListener('paste', async (e) => {
      // Don't intercept paste in text inputs
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (items) {
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (re) => {
              this.loadFromDataUrl(re.target.result, 'Pasted Image.png', null, 'png');
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }

      // Check Electron native clipboard
      if (window.electronAPI && window.electronAPI.readClipboardImage) {
        const dataUrl = await window.electronAPI.readClipboardImage();
        if (dataUrl) {
          this.loadFromDataUrl(dataUrl, 'Pasted Image.png', null, 'png');
        }
      }
    });
  }

  initMenuAndShortcuts() {
    window.addEventListener('keydown', (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      const isTypingField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      const isFileShortcut = isCtrl && ['n', 'N', 'o', 'O', 's', 'S'].includes(e.key);

      // Ignore standard input shortcuts when typing, but keep File save/open/new
      if (isTypingField && e.key !== 'Escape' && !isFileShortcut) {
        return;
      }

      // File Shortcuts
      if (isCtrl && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        this.openNewImageModal();
      } else if (isCtrl && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        this.handleOpenFile();
      } else if (isCtrl && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        this.handleSaveFile(true);
      } else if (isCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        this.handleSaveFile(false);
      }

      // Edit / History Shortcuts
      else if (isCtrl && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        this.state.history.undo(this.state.imageCanvas);
        this.state.clearSelection();
        this.engine.render();
      } else if (isCtrl && (e.key === 'y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault();
        this.state.history.redo(this.state.imageCanvas);
        this.state.clearSelection();
        this.engine.render();
      }

      // Selection Shortcuts
      else if (isCtrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        this.state.selectAll();
      } else if (isCtrl && (e.key === 'd' || e.key === 'D') || e.key === 'Escape') {
        if (this.blurBar && this.blurBar.style.display === 'flex') {
          this.closeBlurAdjustment(false);
        } else if (this.aboutModal && this.aboutModal.style.display === 'flex') {
          this.aboutModal.style.display = 'none';
        } else if (this.resizeModal && this.resizeModal.style.display === 'flex') {
          this.closeModal(this.resizeModal);
        } else if (this.newImageModal && this.newImageModal.style.display === 'flex') {
          this.closeModal(this.newImageModal);
        } else {
          this.state.clearSelection();
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        this.openAboutModal();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.state.selection) {
          e.preventDefault();
          this.selectionTool.clearSelection();
        }
      } else if (isCtrl && (e.key === 'c' || e.key === 'C')) {
        if (this.state.selection) {
          e.preventDefault();
          this.selectionTool.copySelection();
        }
      } else if (isCtrl && (e.key === 'x' || e.key === 'X')) {
        if (this.state.selection) {
          e.preventDefault();
          this.selectionTool.cutSelection();
        }
      } else if (e.key === 'Enter') {
        if (this.blurBar && this.blurBar.style.display === 'flex') {
          this.blurTool.apply();
          this.closeBlurAdjustment(true);
        } else if (this.state.selection) {
          this.selectionTool.cropToSelection();
        }
      }

      // Transformations & Resize
      else if (isCtrl && (e.key === 'r' || e.key === 'R') && !e.shiftKey) {
        e.preventDefault();
        this.transformTool.rotate90CW();
      } else if (isCtrl && (e.key === 'r' || e.key === 'R') && e.shiftKey) {
        e.preventDefault();
        this.transformTool.rotate90CCW();
      } else if (isCtrl && e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        this.openResizeModal();
      }

      // Zoom Shortcuts
      else if (isCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        this.engine.zoomAt(this.engine.viewportWidth / 2, this.engine.viewportHeight / 2, 1.25);
      } else if (isCtrl && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        this.engine.zoomAt(this.engine.viewportWidth / 2, this.engine.viewportHeight / 2, 0.8);
      } else if (isCtrl && e.key === '0') {
        e.preventDefault();
        this.engine.zoomToFit();
      } else if (isCtrl && e.key === '1') {
        e.preventDefault();
        this.engine.zoomToActual();
      }

      // Tool Single-Key Switchers
      else if (e.key === 's' || e.key === 'S' || e.key === 'm' || e.key === 'M') {
        this.state.setActiveTool('select');
      } else if (e.key === 'b' || e.key === 'B') {
        this.openBlurAdjustment();
      } else if (e.key === 'i' || e.key === 'I') {
        this.state.setActiveTool('picker');
      } else if (e.key === 'g' || e.key === 'G' || e.key === 'f' || e.key === 'F') {
        this.state.setActiveTool('fill');
      }
    });
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new PaintApp();
});
