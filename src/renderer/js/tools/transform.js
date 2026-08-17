/**
 * Image transformations: 90° CW, 90° CCW, 180° rotation, Horizontal flip, Vertical flip.
 */
export class TransformTool {
  constructor(engine, state) {
    this.engine = engine;
    this.state = state;
  }

  /**
   * Rotates the entire image 90 degrees clockwise (forwards).
   */
  rotate90CW() {
    const src = this.state.imageCanvas;
    const oldW = src.width;
    const oldH = src.height;

    const temp = document.createElement('canvas');
    temp.width = oldH;
    temp.height = oldW;
    const ctx = temp.getContext('2d');

    ctx.translate(oldH, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(src, 0, 0);

    this.applyNewCanvas(temp, 'Rotate 90° CW');

    // Update selection if active
    if (this.state.selection) {
      const sel = this.state.selection;
      this.state.setSelection({
        x: oldH - (sel.y + sel.height),
        y: sel.x,
        width: sel.height,
        height: sel.width
      });
    }
    this.engine.render();
  }

  /**
   * Rotates the entire image 90 degrees counter-clockwise (backwards).
   */
  rotate90CCW() {
    const src = this.state.imageCanvas;
    const oldW = src.width;
    const oldH = src.height;

    const temp = document.createElement('canvas');
    temp.width = oldH;
    temp.height = oldW;
    const ctx = temp.getContext('2d');

    ctx.translate(0, oldW);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(src, 0, 0);

    this.applyNewCanvas(temp, 'Rotate 90° CCW');

    // Update selection if active
    if (this.state.selection) {
      const sel = this.state.selection;
      this.state.setSelection({
        x: sel.y,
        y: oldW - (sel.x + sel.width),
        width: sel.height,
        height: sel.width
      });
    }
    this.engine.render();
  }

  /**
   * Rotates the entire image 180 degrees.
   */
  rotate180() {
    const src = this.state.imageCanvas;
    const oldW = src.width;
    const oldH = src.height;

    const temp = document.createElement('canvas');
    temp.width = oldW;
    temp.height = oldH;
    const ctx = temp.getContext('2d');

    ctx.translate(oldW, oldH);
    ctx.rotate(Math.PI);
    ctx.drawImage(src, 0, 0);

    this.applyNewCanvas(temp, 'Rotate 180°');

    if (this.state.selection) {
      const sel = this.state.selection;
      this.state.setSelection({
        x: oldW - (sel.x + sel.width),
        y: oldH - (sel.y + sel.height),
        width: sel.width,
        height: sel.height
      });
    }
    this.engine.render();
  }

  /**
   * Flips image on horizontal axis (Left <-> Right mirror).
   */
  flipHorizontal() {
    const src = this.state.imageCanvas;
    const oldW = src.width;
    const oldH = src.height;

    const temp = document.createElement('canvas');
    temp.width = oldW;
    temp.height = oldH;
    const ctx = temp.getContext('2d');

    ctx.translate(oldW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);

    this.applyNewCanvas(temp, 'Flip Horizontal');

    if (this.state.selection) {
      const sel = this.state.selection;
      this.state.setSelection({
        x: oldW - (sel.x + sel.width),
        y: sel.y,
        width: sel.width,
        height: sel.height
      });
    }
    this.engine.render();
  }

  /**
   * Flips image on vertical axis (Top <-> Bottom mirror).
   */
  flipVertical() {
    const src = this.state.imageCanvas;
    const oldW = src.width;
    const oldH = src.height;

    const temp = document.createElement('canvas');
    temp.width = oldW;
    temp.height = oldH;
    const ctx = temp.getContext('2d');

    ctx.translate(0, oldH);
    ctx.scale(1, -1);
    ctx.drawImage(src, 0, 0);

    this.applyNewCanvas(temp, 'Flip Vertical');

    if (this.state.selection) {
      const sel = this.state.selection;
      this.state.setSelection({
        x: sel.x,
        y: oldH - (sel.y + sel.height),
        width: sel.width,
        height: sel.height
      });
    }
    this.engine.render();
  }

  applyNewCanvas(newCanvas, actionName) {
    this.state.imageCanvas.width = newCanvas.width;
    this.state.imageCanvas.height = newCanvas.height;
    const ctx = this.state.imageCanvas.getContext('2d');
    ctx.drawImage(newCanvas, 0, 0);

    this.state.recordAction(actionName);
  }
}
