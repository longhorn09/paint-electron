/**
 * High-performance 4-way flood fill algorithm with color tolerance and selection bounding.
 */
export class FillTool {
  constructor(engine, state) {
    this.engine = engine;
    this.state = state;

    this.initEvents();
  }

  initEvents() {
    const container = this.engine.container;

    container.addEventListener('click', (e) => {
      if (this.state.activeTool !== 'fill' || e.button !== 0) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const imgCoord = this.engine.viewportToImage(mouseX, mouseY);

      if (imgCoord.isInside) {
        this.fillAt(imgCoord.x, imgCoord.y);
      }
    });
  }

  /**
   * Performs flood fill starting at (startX, startY) with current primaryColor and tolerance.
   */
  fillAt(startX, startY) {
    const width = this.state.width;
    const height = this.state.height;
    const ctx = this.state.imageCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Determine ROI boundaries if selection is active
    let minX = 0, minY = 0, maxX = width - 1, maxY = height - 1;
    if (this.state.selection) {
      const sel = this.state.selection;
      minX = sel.x;
      minY = sel.y;
      maxX = sel.x + sel.width - 1;
      maxY = sel.y + sel.height - 1;

      // If clicked outside active selection, ignore
      if (startX < minX || startX > maxX || startY < minY || startY > maxY) {
        return;
      }
    }

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    // Parse fill color (hex to rgba)
    const fillColor = this.parseHexColor(this.state.primaryColor);
    if (!fillColor) return;

    // If start pixel is already fill color and tolerance is 0, return
    if (
      Math.abs(targetR - fillColor.r) <= 1 &&
      Math.abs(targetG - fillColor.g) <= 1 &&
      Math.abs(targetB - fillColor.b) <= 1 &&
      Math.abs(targetA - fillColor.a) <= 1 &&
      this.state.tolerance === 0
    ) {
      return;
    }

    // Color distance threshold based on tolerance (0..100)
    // Max theoretical distance is sqrt(255^2 * 4) = 510
    const toleranceDist = (this.state.tolerance / 100) * 510;
    const toleranceDistSq = toleranceDist * toleranceDist;

    // Visited bitmap to avoid re-checking
    const visited = new Uint8Array(width * height);
    const queue = [startX, startY];

    const matchColor = (idx) => {
      const dr = data[idx] - targetR;
      const dg = data[idx + 1] - targetG;
      const db = data[idx + 2] - targetB;
      const da = data[idx + 3] - targetA;
      const distSq = dr * dr + dg * dg + db * db + da * da;
      return distSq <= toleranceDistSq;
    };

    let head = 0;
    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];

      const pIdx = cy * width + cx;
      if (visited[pIdx]) continue;
      visited[pIdx] = 1;

      const dIdx = pIdx * 4;
      data[dIdx] = fillColor.r;
      data[dIdx + 1] = fillColor.g;
      data[dIdx + 2] = fillColor.b;
      data[dIdx + 3] = fillColor.a;

      // 4-directional neighbors
      // North
      if (cy > minY) {
        const nPos = (cy - 1) * width + cx;
        if (!visited[nPos] && matchColor(nPos * 4)) {
          queue.push(cx, cy - 1);
        }
      }
      // South
      if (cy < maxY) {
        const sPos = (cy + 1) * width + cx;
        if (!visited[sPos] && matchColor(sPos * 4)) {
          queue.push(cx, cy + 1);
        }
      }
      // West
      if (cx > minX) {
        const wPos = cy * width + (cx - 1);
        if (!visited[wPos] && matchColor(wPos * 4)) {
          queue.push(cx - 1, cy);
        }
      }
      // East
      if (cx < maxX) {
        const ePos = cy * width + (cx + 1);
        if (!visited[ePos] && matchColor(ePos * 4)) {
          queue.push(cx + 1, cy);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this.state.recordAction(`Fill (${this.state.primaryColor})`);
    this.engine.render();
  }

  parseHexColor(hex) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('') + 'FF';
    } else if (clean.length === 6) {
      clean += 'FF';
    } else if (clean.length !== 8) {
      return null;
    }

    const num = parseInt(clean, 16);
    return {
      r: (num >> 24) & 255,
      g: (num >> 16) & 255,
      b: (num >> 8) & 255,
      a: num & 255
    };
  }
}
