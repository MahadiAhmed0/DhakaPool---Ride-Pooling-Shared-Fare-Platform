// Lists come a page at a time (FR-PAX-09, FR-DRV-13). "Show more" asks for the page after the last
// one by adding its cursor to the list's address.
export function pagePath(path: string, cursor: string | undefined): string {
  const separator = path.includes('?') ? '&' : '?';
  return cursor ? `${path}${separator}cursor=${cursor}` : path;
}
