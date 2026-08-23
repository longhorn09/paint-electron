/**
 * Normalize a path or file:// URL from Open With / CLI into a filesystem path.
 */

export function normalizeFileArg(arg) {
  if (arg == null) return '';

  let value = String(arg).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  if (value.startsWith('file:')) {
    try {
      const url = new URL(value);
      let pathname = decodeURIComponent(url.pathname);
      if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(pathname)) {
        pathname = pathname.slice(1);
      }
      return pathname;
    } catch {
      return decodeURIComponent(value.replace(/^file:\/\//, ''));
    }
  }

  return value;
}
