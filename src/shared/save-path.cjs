/**
 * Save-path helpers for the main-process dialog (CommonJS).
 * Linux GTK/portal save dialogs often omit the selected filter's extension.
 */

const KNOWN_SAVE_EXTENSIONS = {
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  webp: 'webp',
  gif: 'gif',
  bmp: 'bmp'
};

function normalizeSaveExt(ext) {
  if (!ext) return 'png';
  const clean = String(ext).replace(/^\./, '').toLowerCase();
  return KNOWN_SAVE_EXTENSIONS[clean] || 'png';
}

function getPathExtension(filePath) {
  const match = String(filePath || '').match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function ensureSaveExtension(filePath, selectedExt) {
  if (!filePath) return filePath;
  const existing = getPathExtension(filePath);
  if (KNOWN_SAVE_EXTENSIONS[existing]) return filePath;
  return `${filePath}.${normalizeSaveExt(selectedExt)}`;
}

function resolveSelectedSaveExt(result, filters, fallbackExt) {
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

module.exports = {
  KNOWN_SAVE_EXTENSIONS,
  normalizeSaveExt,
  getPathExtension,
  ensureSaveExtension,
  resolveSelectedSaveExt
};
