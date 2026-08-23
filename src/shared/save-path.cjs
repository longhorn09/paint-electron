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

function applySaveExtension(filePath, selectedExt) {
  if (!filePath) return filePath;
  const wanted = normalizeSaveExt(selectedExt);
  const existing = getPathExtension(filePath);
  if (KNOWN_SAVE_EXTENSIONS[existing]) {
    if (normalizeSaveExt(existing) === wanted) return filePath;
    return `${filePath.slice(0, filePath.length - existing.length - 1)}.${wanted}`;
  }
  return `${filePath}.${wanted}`;
}

function ensureSaveExtension(filePath, selectedExt) {
  return applySaveExtension(filePath, selectedExt);
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
  applySaveExtension,
  ensureSaveExtension,
  resolveSelectedSaveExt
};
