// src/utils/quicksightUiUtils.ts

/**
 * Extracts the AWS region from the current URL.
 */
export function getRegionFromUrl(): string {
  const url = window.location.href;
  const match = url.match(/https:\/\/(.*?)\.quicksight\.aws\.amazon\.com/);
  return match ? match[1] : 'us-east-1';
}

/**
 * Extracts the resource ID from an anchor link using the URL API.
 * Assumes the resource ID is the last non-empty path segment,
 * or the segment before 'view' if it appears last.
 */
export function getResourceIdFromLink(link: HTMLAnchorElement): string | null {
  try {
    const url = new URL(link.href);
    const paths = url.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return null;
    if (paths[paths.length - 1] === 'view' && paths.length >= 2) {
      return paths[paths.length - 2];
    }
    return paths[paths.length - 1];
  } catch (error) {
    console.error('Invalid URL in link:', link.href, error);
    return null;
  }
}

/**
 * Determines the resource type (dashboard or dataset) based on the current URL and row content.
 */
export function getResourceType(url: string, row: HTMLElement): string {
  if (url.includes('/dashboards')) return 'dashboard';
  if (url.includes('/data-sets')) return 'dataset';
  if (url.includes('/search')) {
    const typeCell = row.querySelector('td:nth-child(3)');
    const typeText = typeCell?.textContent?.trim().toLowerCase();
    if (typeText === 'dashboard' || typeText === 'dashboards') return 'dashboard';
    if (typeText === 'dataset' || typeText === 'data-set' || typeText === 'datasets') return 'dataset';
  }
  console.warn('Unable to determine resource type for row:', row);
  return '';
}