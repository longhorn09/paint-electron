import { GIFEncoder, quantize, applyPalette } from '../vendor/gifenc.esm.js';

/**
 * Encodes an HTMLCanvasElement or ImageData into a GIF binary Uint8Array.
 * Uses palette quantization (up to 256 colors) with transparent background support.
 */
export function encodeCanvasToGif(canvas, maxColors = 256) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const rgba = imageData.data;

  // Quantize colors to build optimal color palette
  const palette = quantize(rgba, maxColors, {
    format: 'rgba4444',
    clearAlpha: true,
    clearAlphaThreshold: 0
  });

  // Map image pixels to palette indices
  const index = applyPalette(rgba, palette, 'rgba4444');

  // Find transparent index if any
  let transparentIndex = -1;
  for (let i = 0; i < palette.length; i++) {
    // Check alpha component in palette
    if (palette[i].length > 3 && palette[i][3] === 0) {
      transparentIndex = i;
      break;
    }
  }

  // Create GIF encoder
  const gif = GIFEncoder();
  gif.writeFrame(index, width, height, {
    palette,
    transparent: transparentIndex >= 0,
    transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
    delay: 0
  });
  gif.finish();

  return gif.bytes();
}
