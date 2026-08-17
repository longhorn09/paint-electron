/**
 * High quality image resize tool with proportional aspect ratio scaling.
 */
export class ResizeTool {
  constructor(engine, state) {
    this.engine = engine;
    this.state = state;
  }

  /**
   * Resizes the image to the specified width and height.
   * @param {number} newWidth
   * @param {number} newHeight
   * @param {string} interpolation 'smooth' (high quality) | 'pixelated' (nearest neighbor)
   */
  resizeImage(newWidth, newHeight, interpolation = 'smooth') {
    const targetW = Math.max(1, Math.round(newWidth));
    const targetH = Math.max(1, Math.round(newHeight));

    const srcCanvas = this.state.imageCanvas;
    const currentW = srcCanvas.width;
    const currentH = srcCanvas.height;

    if (targetW === currentW && targetH === currentH) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetW;
    tempCanvas.height = targetH;
    const ctx = tempCanvas.getContext('2d');

    if (interpolation === 'pixelated') {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);
    } else {
      // High quality multi-step downsampling for super crisp downscaled images
      if (targetW < currentW * 0.5 || targetH < currentH * 0.5) {
        this.stepDownsample(srcCanvas, tempCanvas, targetW, targetH);
      } else {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);
      }
    }

    // Apply to working image canvas
    this.state.imageCanvas.width = targetW;
    this.state.imageCanvas.height = targetH;
    const newCtx = this.state.imageCanvas.getContext('2d');
    newCtx.drawImage(tempCanvas, 0, 0);

    // Clear selection on resize
    this.state.clearSelection();

    // Record action in history
    this.state.recordAction(`Resize (${targetW}×${targetH})`);
    this.engine.zoomToFit();
  }

  /**
   * Multi-step downsampling algorithm for high-quality downscaling
   */
  stepDownsample(srcCanvas, dstCanvas, targetW, targetH) {
    let curW = srcCanvas.width;
    let curH = srcCanvas.height;

    let intermediate = document.createElement('canvas');
    intermediate.width = curW;
    intermediate.height = curH;
    let iCtx = intermediate.getContext('2d');
    iCtx.drawImage(srcCanvas, 0, 0);

    while (curW * 0.5 > targetW || curH * 0.5 > targetH) {
      const nextW = Math.max(targetW, Math.floor(curW * 0.5));
      const nextH = Math.max(targetH, Math.floor(curH * 0.5));

      const stepCanvas = document.createElement('canvas');
      stepCanvas.width = nextW;
      stepCanvas.height = nextH;
      const sCtx = stepCanvas.getContext('2d');
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.drawImage(intermediate, 0, 0, nextW, nextH);

      intermediate = stepCanvas;
      curW = nextW;
      curH = nextH;
    }

    const dstCtx = dstCanvas.getContext('2d');
    dstCtx.imageSmoothingEnabled = true;
    dstCtx.imageSmoothingQuality = 'high';
    dstCtx.drawImage(intermediate, 0, 0, targetW, targetH);
  }
}
