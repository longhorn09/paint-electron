# Paint (Electron)

A fast, streamlined, essential image editor built for Ubuntu 26.04 and cross-platform desktop environments. Designed to solve common GTK/Wayland UI issues out of the box with zero manual configuration.

---

## ✨ Features

1. **Rectangle Selection Tool**
   - Interactive drag-to-select with 8 resizing handles.
   - Exact pixel dimensions control: enter exact **Width (px)** and **Height (px)**, plus **X (px)** and **Y (px)** in the options bar.
   - Crop to selection (`Enter` / button).
   - Clear/Delete selection (`Delete` / `Backspace`).
   - Copy (`Ctrl+C`) and Cut (`Ctrl+X`) selection to internal & system clipboard.
   - Select All (`Ctrl+A`) and Deselect (`Ctrl+D` / `Esc`).

2. **Image Rotation & Flip**
   - Rotate 90° Clockwise (`Ctrl+R` / `90° CW`).
   - Rotate 90° Counter-Clockwise (`Ctrl+Shift+R` / `90° CCW`).
   - Rotate 180° (`180°`).
   - Flip Horizontal (mirror along vertical axis).
   - Flip Vertical (mirror along horizontal axis).

3. **Image Resize**
   - Resize by exact pixel dimensions (**Width** and **Height**) or percentage (**%**).
   - **Proportional Aspect Ratio Lock** (default ON): modifying width automatically scales height proportionally, and vice versa.
   - High-quality bicubic resampling with multi-step downsampling for razor-sharp downscaled images.
   - One-click presets: 50%, 75%, 150%, 200%, 1080p, 720p (`Ctrl+Alt+I`).

4. **Multi-Format Open, Save, and Conversion**
   - Supports **PNG**, **JPEG/JPG**, **WebP**, and **GIF**.
   - Convert seamlessly between formats on Save / Save As (`Ctrl+S`, `Ctrl+Shift+S`).
   - **Lossless PNG is the default format** for pristine quality preservation.
   - Drag-and-drop image files onto the window to open.
   - Clipboard Paste (`Ctrl+V`) to import screenshots or copied images directly.

5. **Gaussian Blur Tool**
   - Applies Gaussian blur to a selection (or entire image if no selection is active).
   - Horizontal slider (`0px` to `100px`) with instant real-time live preview.
   - $O(N)$ high-performance separable Gaussian algorithm.
   - Apply (`Enter`) and Cancel (`Esc`) buttons.

6. **Color Picker (Eyedropper)**
   - Sample pixel colors directly from canvas.
   - Real-time magnified loupe view with pixel grid, RGB values, and Hex code.
   - Instant color copying to clipboard and active palette.

7. **Flood Fill (Paint Bucket)**
   - Contiguous 4-way flood fill bounded by selection if active.
   - Adjustable color tolerance slider (`0%` to `100%`) for smooth filling across anti-aliased edges and gradients.

8. **Smooth Viewport Navigation**
   - Mouse wheel zoom centered at cursor position (`Ctrl +` / `Ctrl -`).
   - Zoom to Fit (`Ctrl+0`) and Actual Size 100% (`Ctrl+1`).
   - Status bar displaying image dimensions, active selection info, cursor position, pixel color swatch, and zoom slider.
   - Full Undo / Redo history stack (`Ctrl+Z`, `Ctrl+Y`).

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
git clone <repo-url>
cd paint-electron
npm install
```

### Launch Application

```bash
npm start
```

You can also pass an image path directly:

```bash
npx electron . /path/to/image.png --no-sandbox
```

### Packaging & Distribution

Build standalone installers and executables:

```bash
# Build for Windows (.exe installer + portable .exe)
npm run dist:win

# Build for Linux (.AppImage + .deb)
npm run dist:linux
```

The output packages will be created in the `release/` directory.

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
| **Crop Selection** | `Enter` |
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

---

## 🐧 Ubuntu 26.04 & Linux Optimization Notes

- Automatic Wayland and X11 display server detection (`--ozone-platform-hint=auto`).
- AppArmor-friendly sandbox configuration.
- Native GNOME-inspired dark theme matching modern Linux desktop aesthetics.
- Pure JavaScript and HTML5 Canvas architecture without fragile C++ binary compilation steps.
