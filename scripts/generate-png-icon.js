const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// Run a quick electron headless script to render the SVG to a crisp 256x256 PNG
const script = `
const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Snap Store rejects icons outside 40–512px. Force 1x so HiDPI does not emit 1024.
app.commandLine.appendSwitch('force-device-scale-factor', '1');

// capturePage() composites onto white. Flood-fill that white so dock/store
// corners are transparent; keep the cream plate and palette.
function punchWhiteBackground(image) {
  const { width, height } = image.getSize();
  const bitmap = Buffer.from(image.toBitmap());
  const seen = new Uint8Array(width * height);
  const queue = [];

  const isBg = (idx) => {
    const i = idx * 4;
    const b = bitmap[i];
    const g = bitmap[i + 1];
    const r = bitmap[i + 2];
    return r >= 250 && g >= 250 && b >= 250;
  };

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    seen[idx] = 1;
    if (isBg(idx)) queue.push(idx);
  };

  tryPush(0, 0);
  tryPush(width - 1, 0);
  tryPush(0, height - 1);
  tryPush(width - 1, height - 1);

  while (queue.length) {
    const idx = queue.pop();
    const i = idx * 4;
    bitmap[i] = 0;
    bitmap[i + 1] = 0;
    bitmap[i + 2] = 0;
    bitmap[i + 3] = 0;
    const x = idx % width;
    const y = (idx / width) | 0;
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  return nativeImage.createFromBitmap(bitmap, { width, height });
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false }
  });
  win.setBackgroundColor('#00000000');

  const svgPath = path.resolve(__dirname, '../assets/icon.svg');
  const svgData = fs.readFileSync(svgPath, 'utf8');
  const html = \`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;"><img src="data:image/svg+xml;utf8,\${encodeURIComponent(svgData)}" width="512" height="512"/></body></html>\`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise(r => setTimeout(r, 600));
  const image = punchWhiteBackground((await win.webContents.capturePage()).resize({
    width: 512,
    height: 512,
    quality: 'best'
  }));
  const pngBuffer = image.toPNG();
  const assetsPath = path.resolve(__dirname, '../assets/icon.png');
  const snapPath = path.resolve(__dirname, '../snap/gui/paint-electron.png');
  fs.mkdirSync(path.dirname(snapPath), { recursive: true });
  fs.writeFileSync(assetsPath, pngBuffer);
  fs.writeFileSync(snapPath, pngBuffer);
  console.log('Successfully generated', assetsPath);
  console.log('Successfully generated', snapPath);
  app.quit();
});
`;

const tempScriptPath = path.join(__dirname, 'temp-render-icon.js');
fs.writeFileSync(tempScriptPath, script);

try {
  const electronPath = path.resolve(__dirname, '../node_modules/electron/dist/electron');
  cp.execFileSync(electronPath, [tempScriptPath, '--no-sandbox', '--disable-logging', '--log-level=3'], { stdio: 'inherit' });
} finally {
  if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
}
