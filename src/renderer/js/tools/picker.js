export class PickerTool {
  constructor(engine, state) {
    this.engine = engine;
    this.state = state;
    this.previousTool = 'select';

    this.initEvents();
  }

  initEvents() {
    const container = this.engine.container;

    container.addEventListener('mousemove', (e) => {
      if (this.state.activeTool !== 'picker') {
        if (this.engine.loupePos) {
          this.engine.loupePos = null;
          this.engine.render();
        }
        return;
      }

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const imgCoord = this.engine.viewportToImage(mouseX, mouseY);

      if (imgCoord.isInside) {
        this.engine.loupePos = {
          screenX: mouseX,
          screenY: mouseY,
          imgX: imgCoord.x,
          imgY: imgCoord.y
        };
        this.engine.render();
      } else {
        if (this.engine.loupePos) {
          this.engine.loupePos = null;
          this.engine.render();
        }
      }
    });

    container.addEventListener('mouseleave', () => {
      if (this.engine.loupePos) {
        this.engine.loupePos = null;
        this.engine.render();
      }
    });

    container.addEventListener('click', (e) => {
      if (this.state.activeTool !== 'picker' || e.button !== 0) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const imgCoord = this.engine.viewportToImage(mouseX, mouseY);

      if (imgCoord.isInside) {
        const color = this.sampleColor(imgCoord.x, imgCoord.y);
        if (color) {
          this.state.setPrimaryColor(color.hex);
          
          // Emit color picked event
          const event = new CustomEvent('color:picked', { detail: color });
          container.dispatchEvent(event);
        }
      }

      this.engine.loupePos = null;
      this.engine.render();
    });
  }

  sampleColor(x, y) {
    if (x < 0 || x >= this.state.width || y < 0 || y >= this.state.height) return null;

    const ctx = this.state.imageCanvas.getContext('2d', { willReadFrequently: true });
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const a = pixel[3];

    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    const rgba = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;

    return { r, g, b, a, hex, rgba };
  }
}
