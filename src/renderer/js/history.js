/**
 * Canvas History Manager for Undo / Redo operations.
 */
export class HistoryManager {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 30;
    this.undoStack = [];
    this.redoStack = [];
    this.savedIndex = -1;
    this.currentIndex = -1;
    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      cb({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        isModified: this.isModified()
      });
    }
  }

  canUndo() {
    return this.undoStack.length > 1;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  isModified() {
    return this.savedIndex !== this.currentIndex;
  }

  markSaved() {
    this.savedIndex = this.currentIndex;
    this.notify();
  }

  /**
   * Pushes a new snapshot of the canvas into history.
   * @param {HTMLCanvasElement} canvas
   * @param {string} actionName
   */
  pushState(canvas, actionName = 'Edit') {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Clear redo stack on new action
    this.redoStack = [];

    this.undoStack.push({
      actionName,
      width: canvas.width,
      height: canvas.height,
      imageData
    });

    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
      if (this.savedIndex > -1) {
        this.savedIndex--;
      }
    }

    this.currentIndex = this.undoStack.length - 1;
    this.notify();
  }

  /**
   * Resets the history with an initial canvas state.
   */
  reset(canvas, isSaved = true) {
    this.undoStack = [];
    this.redoStack = [];
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    this.undoStack.push({
      actionName: 'Initial State',
      width: canvas.width,
      height: canvas.height,
      imageData
    });

    this.currentIndex = 0;
    this.savedIndex = isSaved ? 0 : -1;
    this.notify();
  }

  /**
   * Performs Undo. Returns the target snapshot or null.
   */
  undo(canvas) {
    if (!this.canUndo()) return null;

    const current = this.undoStack.pop();
    this.redoStack.push(current);

    const prev = this.undoStack[this.undoStack.length - 1];
    this.currentIndex = this.undoStack.length - 1;

    this.applySnapshot(canvas, prev);
    this.notify();
    return prev;
  }

  /**
   * Performs Redo. Returns the target snapshot or null.
   */
  redo(canvas) {
    if (!this.canRedo()) return null;

    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.currentIndex = this.undoStack.length - 1;

    this.applySnapshot(canvas, next);
    this.notify();
    return next;
  }

  applySnapshot(canvas, snapshot) {
    if (canvas.width !== snapshot.width || canvas.height !== snapshot.height) {
      canvas.width = snapshot.width;
      canvas.height = snapshot.height;
    }
    const ctx = canvas.getContext('2d');
    ctx.putImageData(snapshot.imageData, 0, 0);
  }
}
