import { encodeCanvasToGif } from './gif-export.js';

/**
 * Loads an image from a Data URL or URL into an HTMLImageElement.
 */
export function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image data: ' + err));
    img.src = dataUrl;
  });
}

/**
 * Converts canvas to Uint8Array buffer or dataUrl for the requested format.
 * Formats: 'png' (lossless), 'jpg'/'jpeg', 'webp', 'gif'.
 */
export async function getCanvasFileBuffer(canvas, format = 'png', quality = 0.92) {
  const normalizedFormat = format.toLowerCase().replace('.', '');
  
  if (normalizedFormat === 'gif') {
    const gifBytes = encodeCanvasToGif(canvas);
    return {
      buffer: Array.from(gifBytes),
      mimeType: 'image/gif'
    };
  }

  if (normalizedFormat === 'jpg' || normalizedFormat === 'jpeg') {
    // For JPEG, flatten transparency onto white background so it doesn't render black
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/jpeg', quality));
    const arrayBuffer = await blob.arrayBuffer();
    return {
      buffer: Array.from(new Uint8Array(arrayBuffer)),
      mimeType: 'image/jpeg'
    };
  }

  if (normalizedFormat === 'webp') {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    const arrayBuffer = await blob.arrayBuffer();
    return {
      buffer: Array.from(new Uint8Array(arrayBuffer)),
      mimeType: 'image/webp'
    };
  }

  // Default: Lossless PNG
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const arrayBuffer = await blob.arrayBuffer();
  return {
    buffer: Array.from(new Uint8Array(arrayBuffer)),
    mimeType: 'image/png'
  };
}

/**
 * Creates a DataURL from canvas for lossless PNG representation.
 */
export function getCanvasPngDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}
