const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const binPath = path.join(projectRoot, 'bin', 'paint-electron');
const iconPath = path.join(projectRoot, 'assets', 'icon.svg');
const appsDir = path.join(os.homedir(), '.local', 'share', 'applications');
const desktopFilePath = path.join(appsDir, 'paint-electron.desktop');

if (!fs.existsSync(appsDir)) {
  fs.mkdirSync(appsDir, { recursive: true });
}

const desktopContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=Paint
GenericName=Image Editor
Comment=Fast, essential image editor with exact selection, resize, rotation, blur, and format conversion
Exec="${binPath}" %U
Icon=${iconPath}
Terminal=false
Categories=Graphics;2DGraphics;RasterGraphics;
MimeType=image/png;image/jpeg;image/webp;image/gif;image/bmp;image/svg+xml;
StartupWMClass=Paint
Keywords=paint;image;editor;photo;draw;crop;blur;resize;
Actions=NewWindow;

[Desktop Action NewWindow]
Name=New Window
Exec="${binPath}"
`;

fs.writeFileSync(desktopFilePath, desktopContent, 'utf8');
fs.chmodSync(desktopFilePath, 0o755);

console.log('✅ Created desktop launcher at:');
console.log('  ', desktopFilePath);

// Update desktop database if available
try {
  cp.execSync(`update-desktop-database "${appsDir}" 2>/dev/null || true`);
} catch (e) {
  // Ignore
}

console.log('\n🎉 Desktop launcher installed successfully!');
console.log('\nTo pin it to your Ubuntu Dock:');
console.log('1. Press the Super key (Windows key) on your keyboard.');
console.log('2. Type "Paint" and you will see the Paint app icon.');
console.log('3. Right-click the Paint icon and select "Pin to Dash" (or "Add to Favorites").');
