# Paint (Electron)

A fast, streamlined, essential image editor built for Ubuntu 26.04 and cross-platform desktop environments (Linux, Windows, macOS). Designed to deliver simplicity, responsive performance, and exact pixel controls without the UI/window manager glitches or configuration overhead common in heavy graphics suites.

**Version:** 1.0.0  
**Repository:** [https://github.com/longhorn09/paint-electron](https://github.com/longhorn09/paint-electron)  
**Releases:** [https://github.com/longhorn09/paint-electron/releases](https://github.com/longhorn09/paint-electron/releases)

---

## ✨ Features

1. **Rectangle Selection Tool**
   - Interactive drag-to-select with 8 resize handles.
   - Exact pixel dimensions control: enter exact **Width (px)** and **Height (px)**, plus **X (px)** and **Y (px)** in the toolbar to position the box without triggering automatic crop.
   - High-contrast animated "marching ants" border for clear visibility on both dark and light backgrounds.
   - Click and drag anywhere inside the selection box to reposition it.
   - Crop to selection (`Enter` / "Crop to Selection" button) when the resize dialog is not open.
   - Clear/Delete selected pixels (`Delete` / `Backspace`).
   - Copy (`Ctrl+C`) and Cut (`Ctrl+X`) selection to internal & system clipboard.
   - Select All (`Ctrl+A`) and Deselect (`Ctrl+D` / `Esc`).

2. **Image Rotation & Flip**
   - Rotate 90° Clockwise (`Ctrl+R` / `90° CW`).
   - Rotate 90° Counter-Clockwise (`Ctrl+Shift+R` / `90° CCW`).
   - Rotate 180° (`180°`).
   - Flip Horizontal (mirror along vertical axis).
   - Flip Vertical (mirror along horizontal axis).
   - Selection coordinates automatically rotate/flip along with the image.

3. **Image Resize**
   - Resize by exact pixel dimensions (**Width** and **Height**) or percentage (**%**).
   - **Proportional Aspect Ratio Lock** (default ON): uses the **current image** size, so a typed width scales height correctly (for example 1920×1080 → width 1280 → height 720).
   - Press **Enter** in the resize dialog to apply (same as the blue **Apply Resize** button). `Esc` cancels.
   - High-quality bicubic resampling with multi-step downsampling for razor-sharp downscaled images.
   - One-click presets: 50%, 75%, 150%, 200%, 1080p, 720p (`Ctrl+Alt+I`).

4. **Multi-Format Open, Save, and Conversion**
   - Supports **PNG**, **JPEG/JPG**, **WebP**, and **GIF**.
   - Convert between formats on Save / Save As (`Ctrl+S`, `Ctrl+Shift+S`).
   - **Save As** opens a type picker first. Changing **Save as type** from JPEG to PNG rewrites the name in place (`lamborghini-revuelto-4k-2025-og.jpg` → `lamborghini-revuelto-4k-2025-og.png`). Then **Choose Location...** opens the system file dialog.
   - If the chosen name has no extension, the selected type is appended automatically.
   - **Lossless PNG is the default format** for pristine quality preservation.
   - Drag-and-drop image files directly into the window to open.
   - Clipboard Paste (`Ctrl+V`) to import screenshots or copied images immediately.

5. **Gaussian Blur Tool**
   - Applies Gaussian blur to a selection (or entire image if no selection is active).
   - Horizontal slider (`0px` to `100px`) with instant real-time live preview.
   - $O(N)$ high-performance separable Gaussian algorithm.
   - Apply (`Enter`) and Cancel (`Esc`) buttons.

6. **Color Picker (Eyedropper)**
   - Sample pixel colors directly from canvas.
   - Real-time magnified loupe view with pixel grid, RGB values, and Hex code under the cursor.
   - Instant color copying to clipboard and active palette.

7. **Flood Fill (Paint Bucket)**
   - Contiguous 4-way flood fill bounded by selection if active.
   - Adjustable color tolerance slider (`0%` to `100%`) for smooth filling across anti-aliased edges and gradients.

8. **Smooth Viewport Navigation**
   - Mouse wheel zoom centered at cursor position (`Ctrl +` / `Ctrl -`).
   - Zoom to Fit (`Ctrl+0`) and Actual Size 100% (`Ctrl+1`).
   - Status bar displaying image dimensions, active selection info, cursor position, pixel color swatch, and zoom slider.
   - Full Undo / Redo history stack (`Ctrl+Z`, `Ctrl+Y`).

9. **Help & About Menu**
   - In-app **Help / About** dialog and native application menu tab (`Help` → `About Paint`, `Help` → `GitHub Repository`).
   - Direct link to source code on GitHub for contributing, forking, and reporting issues.
   - Built-in keyboard shortcuts reference sheet (`F1`).

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation (from source)

```bash
git clone https://github.com/longhorn09/paint-electron.git
cd paint-electron
npm install
```

### Launch Application

```bash
npm start
```

You can also pass an image path directly:

```bash
npx electron . /path/to/image.png --no-sandbox --disable-logging --log-level=3
```

### Tests

```bash
npm test
```

### 📌 Pin the source build to the Ubuntu Dock

This launcher always runs the live git checkout (`bin/paint-electron`):

```bash
npm run install-desktop
```

1. Press the **Super** key (Windows key).
2. Search for **"Paint"**.
3. Right-click the Paint icon → select **"Pin to Dash"** (or **"Add to Favorites"**).
4. You can also right-click any image file in Nautilus → **Open With** → **Paint**.

Quit every Paint window and click the dock icon again after pulling new source. That pin does **not** use the AppImage or `.deb`.

---

## 📦 Packaged builds (AppImage & .deb)

Build standalone installers. Output goes to `release/` and is **gitignored** (do not commit AppImages, `.deb` files, or `release/linux-unpacked/`).

```bash
# Linux (.AppImage + .deb)
npm run dist:linux

# Windows (.exe installer + portable .exe)
npm run dist:win
```

Typical Linux artifacts:

- `release/Paint-1.0.0.AppImage`
- `release/paint-electron_1.0.0_amd64.deb`

### Install the .deb and pin it (Ubuntu 26.04)

```bash
sudo dpkg -i release/paint-electron_1.0.0_amd64.deb
```

Then unpin any old Paint icon, press **Super**, search **Paint**, and **Pin to Dash**. That launcher runs `/opt/Paint/paint-electron`. After a later rebuild, run `dpkg -i` again; the dock pin stays.

### Run the AppImage

```bash
chmod +x release/Paint-1.0.0.AppImage
./release/Paint-1.0.0.AppImage
```

### Publish to GitHub Releases

Keep binaries out of git. Attach them to a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0

gh release create v1.0.0 \
  release/Paint-1.0.0.AppImage \
  release/paint-electron_1.0.0_amd64.deb \
  --title "Paint 1.0.0" \
  --notes "Linux AppImage and amd64 .deb for Paint 1.0.0."
```

Requires the [GitHub CLI](https://cli.github.com/) (`gh auth login`). Downloads appear at [github.com/longhorn09/paint-electron/releases](https://github.com/longhorn09/paint-electron/releases).

For a later version: bump `"version"` in `package.json`, commit, rebuild, tag `v1.0.1`, and create a new release with the new files.

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| **New Image** | `Ctrl + N` |
| **Open Image** | `Ctrl + O` |
| **Save** | `Ctrl + S` |
| **Save As** | `Ctrl + Shift + S` |
| **Undo** | `Ctrl + Z` |
| **Redo** | `Ctrl + Y` or `Ctrl + Shift + Z` |
| **Select All** | `Ctrl + A` |
| **Deselect / Cancel** | `Ctrl + D` or `Escape` |
| **Apply Resize** (resize dialog open) | `Enter` |
| **Apply Blur** (blur bar open) | `Enter` |
| **Crop to Selection** | `Enter` (when no resize/blur UI is open) |
| **Clear Selection** | `Delete` / `Backspace` |
| **Copy Selection** | `Ctrl + C` |
| **Cut Selection** | `Ctrl + X` |
| **Paste Image** | `Ctrl + V` |
| **Rotate 90° CW** | `Ctrl + R` |
| **Rotate 90° CCW** | `Ctrl + Shift + R` |
| **Resize Image** | `Ctrl + Alt + I` |
| **Gaussian Blur** | `B` |
| **Color Picker** | `I` |
| **Fill Bucket** | `G` or `F` |
| **Selection Tool** | `S` or `M` |
| **Zoom In / Out** | `Ctrl +` / `Ctrl -` or Mouse Wheel |
| **Zoom to Fit** | `Ctrl + 0` |
| **Actual Size 100%** | `Ctrl + 1` |
| **Help / About / Shortcuts** | `F1` |

---

## 🤝 Contributing & Source Code

Contributions, issues, and feature requests are welcome!

- **Repository**: [https://github.com/longhorn09/paint-electron](https://github.com/longhorn09/paint-electron)
- **Fork the Repo**: [https://github.com/longhorn09/paint-electron/fork](https://github.com/longhorn09/paint-electron/fork)
- **Report Issues**: [https://github.com/longhorn09/paint-electron/issues](https://github.com/longhorn09/paint-electron/issues)
- **Releases**: [https://github.com/longhorn09/paint-electron/releases](https://github.com/longhorn09/paint-electron/releases)

To contribute:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 🐧 Ubuntu 26.04 & Linux Optimization Notes

- Automatic Wayland and X11 display server detection (`--ozone-platform-hint=auto`).
- Clean terminal logging with suppressed non-fatal GPU/VSync messages.
- AppArmor-friendly sandbox configuration.
- Native GNOME-inspired dark theme matching modern Linux desktop aesthetics.
- Pure JavaScript and HTML5 Canvas architecture without fragile C++ binary compilation steps.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
