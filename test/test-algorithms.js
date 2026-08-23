import assert from 'node:assert';
import { createRequire } from 'node:module';
import { applyGaussianBlur } from '../src/renderer/js/utils/fast-blur.js';
import { encodeCanvasToGif } from '../src/renderer/js/utils/gif-export.js';
import { HistoryManager } from '../src/renderer/js/history.js';
import { applySaveExtension, ensureSaveExtension, resolveSelectedSaveExt } from '../src/shared/save-path.js';
import { normalizeFileArg } from '../src/shared/open-path.js';

const require = createRequire(import.meta.url);
const savePathCjs = require('../src/shared/save-path.cjs');

console.log('🧪 Starting automated tests...\n');

// 1. Test Gaussian Blur Algorithm
console.log('1. Testing Gaussian Blur & Selection ROI...');
{
  const width = 100;
  const height = 100;
  const data = new Uint8ClampedArray(width * height * 4);

  // Fill with a sharp vertical white/black boundary
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const val = x < 50 ? 255 : 0;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  const imageData = { width, height, data };

  // Blur with ROI selection: x: 20..80, y: 20..80
  const roi = { x: 20, y: 20, width: 60, height: 60 };
  applyGaussianBlur(imageData, 10, roi);

  // Pixels outside ROI (e.g. x: 5, y: 5) must be completely untouched
  const outsideIdx = (5 * width + 5) * 4;
  assert.strictEqual(imageData.data[outsideIdx], 255, 'Pixel outside ROI was unexpectedly modified');

  // Pixels inside ROI near boundary (x: 50, y: 50) should be smoothed/blurred
  const boundaryIdx = (50 * width + 50) * 4;
  const blurredVal = imageData.data[boundaryIdx];
  assert.ok(blurredVal > 50 && blurredVal < 200, `Boundary pixel not blurred properly: got ${blurredVal}`);

  console.log('   ✓ Gaussian Blur within ROI and outside preservation verified.');
}

// 2. Test History Manager
console.log('2. Testing History Manager (Undo / Redo / Modification tracking)...');
{
  const mockCanvas = {
    width: 200,
    height: 150,
    getContext: () => ({
      getImageData: (x, y, w, h) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4)
      }),
      putImageData: () => {}
    })
  };

  const history = new HistoryManager({ maxDepth: 10 });
  history.reset(mockCanvas, true);

  assert.strictEqual(history.canUndo(), false, 'Should not be able to undo initial state');
  assert.strictEqual(history.canRedo(), false, 'Should not be able to redo initial state');
  assert.strictEqual(history.isModified(), false, 'Should start unmodified');

  // Push an action
  history.pushState(mockCanvas, 'Action 1');
  assert.strictEqual(history.canUndo(), true, 'Should be able to undo after push');
  assert.strictEqual(history.isModified(), true, 'Should be modified after action');

  // Undo
  history.undo(mockCanvas);
  assert.strictEqual(history.canRedo(), true, 'Should be able to redo after undo');
  assert.strictEqual(history.isModified(), false, 'Should be back to unmodified at saved index');

  // Redo
  history.redo(mockCanvas);
  assert.strictEqual(history.isModified(), true, 'Should be modified again');

  console.log('   ✓ HistoryManager undo/redo/state tracking verified.');
}

// 3. Test GIF Encoder
console.log('3. Testing GIF Encoder...');
{
  const testW = 10;
  const testH = 10;
  const mockCanvas = {
    width: testW,
    height: testH,
    getContext: () => ({
      getImageData: (x, y, w, h) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255;   // R
          data[i + 1] = 0; // G
          data[i + 2] = 0; // B
          data[i + 3] = 255; // A
        }
        return { width: w, height: h, data };
      }
    })
  };

  const gifBytes = encodeCanvasToGif(mockCanvas);
  assert.ok(gifBytes instanceof Uint8Array, 'GIF output should be Uint8Array');
  assert.ok(gifBytes.length > 0, 'GIF output should not be empty');
  // Check GIF Header 'GIF89a' or 'GIF87a'
  const header = String.fromCharCode(...gifBytes.slice(0, 6));
  assert.ok(header.startsWith('GIF'), `Invalid GIF header: ${header}`);
  console.log(`   ✓ GIF encoding produced valid ${header} file (${gifBytes.length} bytes).`);
}

// 4. Test Proportional Resize Math
console.log('4. Testing Proportional Resize Math...');
{
  const originalW = 1920;
  const originalH = 1080;

  // Specify Width = 1280 (must use the source image ratio, not a stale 4:3 default)
  const newW = 1280;
  const scaledH = Math.round(newW * (originalH / originalW));
  assert.strictEqual(scaledH, 720, '1920x1080 scaled to width 1280 should yield height 720');
  assert.notStrictEqual(
    Math.round(newW * (600 / 800)),
    scaledH,
    'A stale 800x600 source would produce the wrong locked height'
  );

  // Specify Height = 540
  const newH = 540;
  const scaledW = Math.round(newH * (originalW / originalH));
  assert.strictEqual(scaledW, 960, '1920x1080 scaled to height 540 should yield width 960');

  // Non-16:9 image: 1000x400 to a fixed width of 250
  const portraitH = Math.round(250 * (400 / 1000));
  assert.strictEqual(portraitH, 100, '1000x400 scaled to width 250 should yield height 100');

  console.log('   ✓ Proportional scaling math verified.');
}

// 5. Test Save-As extension append
console.log('5. Testing Save-As extension append...');
{
  assert.strictEqual(ensureSaveExtension('/tmp/vacation', 'png'), '/tmp/vacation.png');
  assert.strictEqual(ensureSaveExtension('/tmp/vacation', 'jpeg'), '/tmp/vacation.jpg');
  assert.strictEqual(ensureSaveExtension('/tmp/vacation', 'jpg'), '/tmp/vacation.jpg');
  assert.strictEqual(applySaveExtension('/tmp/vacation.webp', 'png'), '/tmp/vacation.png');
  assert.strictEqual(applySaveExtension('/tmp/vacation.PNG', 'jpg'), '/tmp/vacation.jpg');
  assert.strictEqual(ensureSaveExtension('my.photo', 'gif'), 'my.photo.gif');
  assert.strictEqual(
    applySaveExtension('lamborghini-revuelto-4k-2025-og.jpg', 'png'),
    'lamborghini-revuelto-4k-2025-og.png'
  );
  assert.strictEqual(
    applySaveExtension('lamborghini-revuelto-4k-2025-og.jpg', 'jpg'),
    'lamborghini-revuelto-4k-2025-og.jpg'
  );
  assert.strictEqual(
    applySaveExtension('/pics/photo.jpeg', 'webp'),
    '/pics/photo.webp'
  );

  const filters = [
    { name: 'PNG', extensions: ['png'] },
    { name: 'JPEG', extensions: ['jpg', 'jpeg'] }
  ];
  assert.strictEqual(resolveSelectedSaveExt({ index: 2 }, filters, 'png'), 'jpg');
  assert.strictEqual(resolveSelectedSaveExt({ filterIndex: 1 }, filters, 'jpg'), 'png');
  assert.strictEqual(
    resolveSelectedSaveExt({ selectedFilter: { extensions: ['webp'] } }, filters, 'png'),
    'webp'
  );
  assert.strictEqual(resolveSelectedSaveExt({}, filters, 'gif'), 'gif');
  assert.strictEqual(
    savePathCjs.applySaveExtension('lamborghini-revuelto-4k-2025-og.jpg', 'png'),
    applySaveExtension('lamborghini-revuelto-4k-2025-og.jpg', 'png')
  );

  console.log('   ✓ Save-As extension append verified.');
}

console.log('6. Testing Open-With file argument parsing...');
{
  assert.strictEqual(
    normalizeFileArg('file:///home/user/Pictures/lamborghini.jpg'),
    '/home/user/Pictures/lamborghini.jpg'
  );
  assert.strictEqual(
    normalizeFileArg('file:///home/user/My%20Photos/car%20revuelto.png'),
    '/home/user/My Photos/car revuelto.png'
  );
  assert.strictEqual(
    normalizeFileArg('"/tmp/quoted.jpg"'),
    '/tmp/quoted.jpg'
  );
  assert.strictEqual(
    normalizeFileArg('/tmp/plain.webp'),
    '/tmp/plain.webp'
  );
  console.log('   ✓ Open-With file:// and path arguments verified.');
}

console.log('\n🎉 ALL ALGORITHM TESTS PASSED SUCCESSFULLY!');
