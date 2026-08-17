const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// Run a quick electron headless script to render the SVG to a crisp 256x256 PNG
const script = `
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    webPreferences: { offscreen: true }
  });

  const svgPath = path.resolve(__dirname, '../assets/icon.svg');
  const svgData = fs.readFileSync(svgPath, 'utf8');
  const html = \`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;"><img src="data:image/svg+xml;utf8,\${encodeURIComponent(svgData)}" width="512" height="512"/></body></html>\`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  // Wait a moment for rendering
  await new Promise(r => setTimeout(r, 600));
  const image = await win.webContents.capturePage();
  const pngBuffer = image.toPNG();
  const outPath = path.resolve(__dirname, '../assets/icon.png');
  fs.writeFileSync(outPath, pngBuffer);
  console.log('Successfully generated', outPath);
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
