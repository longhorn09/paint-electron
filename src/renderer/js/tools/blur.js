import { applyGaussianBlur } from '../utils/fast-blur.js';

export class BlurTool {
  constructor(engine, state) {
    this.engine = engine;
    this.state = state;
    this.previewCanvas = document.createElement('canvas');
    this.isSessionActive = false;
    this.currentRadius = 10;
    this.pendingFrame = null;
  }

  /**
   * Starts a live blur preview session.
   */
  startSession(initialRadius = 10) {
    this.isSessionActive = true;
    this.currentRadius = initialRadius;
    this.updatePreview(initialRadius);
  }

  /**
   * Updates real-time blur preview as slider moves.
   */
  updatePreview(radius) {
    this.currentRadius = radius;
    if (!this.isSessionActive) return;

    if (this.pendingFrame) {
      cancelAnimationFrame(this.pendingFrame);
    }

    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.renderBlurToPreview(this.currentRadius);
    });
  }

  renderBlurToPreview(radius) {
    const src = this.state.imageCanvas;
    const width = src.width;
    const height = src.height;

    this.previewCanvas.width = width;
    this.previewCanvas.height = height;

    const ctx = this.previewCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);

    if (radius > 0) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const roi = this.state.selection ? { ...this.state.selection } : null;
      applyGaussianBlur(imageData, radius, roi);
      ctx.putImageData(imageData, 0, 0);
    }

    this.engine.showPreview(this.previewCanvas);
  }

  /**
   * Commits the current blur to the image and records history.
   */
  apply() {
    if (!this.isSessionActive) return;

    if (this.currentRadius > 0) {
      const ctx = this.state.imageCanvas.getContext('2d', { willReadFrequently: true });
      const imageData = ctx.getImageData(0, 0, this.state.width, this.state.height);
      const roi = this.state.selection ? { ...this.state.selection } : null;

      applyGaussianBlur(imageData, this.currentRadius, roi);
      ctx.putImageData(imageData, 0, 0);

      const scope = roi ? `Selection (${roi.width}×${roi.height})` : 'Entire Image';
      this.state.recordAction(`Gaussian Blur (${this.currentRadius}px) on ${scope}`);
    }

    this.cancel();
  }

  /**
   * Cancels preview session and hides preview canvas.
   */
  cancel() {
    this.isSessionActive = false;
    if (this.pendingFrame) {
      cancelAnimationFrame(this.pendingFrame);
      this.pendingFrame = null;
    }
    this.engine.hidePreview();
    this.engine.render();
  }
}
