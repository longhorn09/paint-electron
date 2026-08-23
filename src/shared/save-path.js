/**
 * Save-path helpers shared by the renderer and tests.
 * Keep in sync with save-path.cjs used by the Electron main process.
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
 * Apply the selected save-as type to a path.
 * Missing extensions are appended; a different known image extension is replaced
 * (`photo.jpg` + PNG → `photo.png`). Same type is left unchanged.
 *
 * @param {string} filePath
 * @param {string} selectedExt
 * @returns {string}
 */
export function applySaveExtension(filePath, selectedExt) {
  if (!filePath) return filePath;
  const wanted = normalizeSaveExt(selectedExt);
  const existing = getPathExtension(filePath);
  if (KNOWN_SAVE_EXTENSIONS[existing]) {
    if (normalizeSaveExt(existing) === wanted) return filePath;
    return `${filePath.slice(0, filePath.length - existing.length - 1)}.${wanted}`;
  }
  return `${filePath}.${wanted}`;
}

/**
 * @deprecated Use applySaveExtension — kept so older call sites keep working.
 */
export function ensureSaveExtension(filePath, selectedExt) {
  return applySaveExtension(filePath, selectedExt);
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
