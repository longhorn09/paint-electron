/**
 * Save-path helpers shared by the main-process dialog and tests.
 * Linux GTK/portal save dialogs often omit the selected filter's extension.
 */

export const KNOWN_SAVE_EXTENSIONS = {
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  webp: 'webp',
  gif: 'gif',
  bmp: 'bmp'
};

/**
 * @param {string} ext
 * @returns {string} Canonical save extension without a leading dot.
 */
export function normalizeSaveExt(ext) {
  if (!ext) return 'png';
  const clean = String(ext).replace(/^\./, '').toLowerCase();
  return KNOWN_SAVE_EXTENSIONS[clean] || 'png';
}

/**
 * @param {string} filePath
 * @returns {string} Lowercase extension without a dot, or ''.
 */
export function getPathExtension(filePath) {
  const match = String(filePath || '').match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * If the filename already has a known image extension, leave it.
 * Otherwise append the selected save-as type (png, jpg, webp, gif).
 *
 * @param {string} filePath
 * @param {string} selectedExt
 * @returns {string}
 */
export function ensureSaveExtension(filePath, selectedExt) {
  if (!filePath) return filePath;
  const existing = getPathExtension(filePath);
  if (KNOWN_SAVE_EXTENSIONS[existing]) return filePath;
  return `${filePath}.${normalizeSaveExt(selectedExt)}`;
}

/**
 * Pick the selected save-dialog filter extension when Electron surfaces it.
 * Falls back to defaultExt (the format shown first / requested by the renderer).
 *
 * @param {object} result showSaveDialog return value
 * @param {Array<{extensions: string[]}>} filters
 * @param {string} fallbackExt
 * @returns {string}
 */
export function resolveSelectedSaveExt(result, filters, fallbackExt) {
  if (!result || !Array.isArray(filters) || filters.length === 0) {
    return normalizeSaveExt(fallbackExt);
  }

  const rawIndex = result.filterIndex ?? result.index;
  if (typeof rawIndex === 'number') {
    const zeroBased = rawIndex >= 1 && rawIndex <= filters.length ? rawIndex - 1 : rawIndex;
    const filter = filters[zeroBased];
    if (filter?.extensions?.[0] && filter.extensions[0] !== '*') {
      return normalizeSaveExt(filter.extensions[0]);
    }
  }

  const fromFilter = result.selectedFilter?.extensions?.[0];
  if (fromFilter && fromFilter !== '*') {
    return normalizeSaveExt(fromFilter);
  }

  return normalizeSaveExt(fallbackExt);
}
