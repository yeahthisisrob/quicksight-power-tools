// tagEnhancer.tsx
import { QuickSightClient, ListTagsForResourceCommand, TagResourceCommand } from '@aws-sdk/client-quicksight';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ResourceTags } from '../components/ResourceTags';

interface CloudTrailCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

// Cache for resource tags: keys are in the format "resourceType-resourceId"
export const tagCache: Record<string, Array<{ Key: string; Value: string }>> = {};

/**
 * Extracts the AWS region from the current URL.
 */
export function getRegionFromUrl(): string {
  const url = window.location.href;
  const match = url.match(/https:\/\/(.*?)\.quicksight\.aws\.amazon\.com/);
  return match ? match[1] : 'us-east-1';
}

let cachedAccountId: string | null = null;
/**
 * Retrieves the AWS account ID using STS and caches it for subsequent calls.
 */
export async function getAccountId(creds: CloudTrailCredentials): Promise<string> {
  if (cachedAccountId) return cachedAccountId;
  const stsClient = new STSClient({
    region: getRegionFromUrl(),
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
  const command = new GetCallerIdentityCommand({});
  const response = await stsClient.send(command);
  if (!response.Account) {
    throw new Error('Failed to retrieve account ID');
  }
  cachedAccountId = response.Account;
  return response.Account;
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
    // If the last segment is "view", return the segment before it.
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
    // Fallback: Try to extract the type from the third cell in the row
    const typeCell = row.querySelector('td:nth-child(3)');
    const typeText = typeCell?.textContent?.trim().toLowerCase();
    if (typeText === 'dashboard' || typeText === 'dashboards') return 'dashboard';
    if (typeText === 'dataset' || typeText === 'data-set' || typeText === 'datasets') return 'dataset';
  }
  console.warn('Unable to determine resource type for row:', row);
  return '';
}

/**
 * Fetches resource tags from QuickSight. Uses caching to avoid redundant calls.
 */
export async function getResourceTags(
  resourceId: string,
  accountId: string,
  region: string,
  resourceType: string,
  creds: CloudTrailCredentials
): Promise<Array<{ Key: string; Value: string }>> {
  const cacheKey = `${resourceType}-${resourceId}`;
  if (tagCache[cacheKey]) {
    return tagCache[cacheKey];
  }

  const quickSightClient = new QuickSightClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
  const resourceArn = `arn:aws:quicksight:${region}:${accountId}:${resourceType}/${resourceId}`;
  const command = new ListTagsForResourceCommand({
    ResourceArn: resourceArn,
  });
  try {
    const response = await quickSightClient.send(command);
    const tags = (response.Tags || []).filter((tag): tag is { Key: string; Value: string } =>
      tag.Key != null && tag.Value != null
    );
    tagCache[cacheKey] = tags;
    return tags;
  } catch (error) {
    console.error(`Error fetching tags for ${resourceType} (${resourceId}):`, error);
    return [];
  }
}

/**
 * Creates a visual "pill" element for a tag.
 */
export function createTagPill(tagKey: string, tagValue: string): HTMLElement {
  const pill = document.createElement('span');
  pill.className = 'tag-pill';
  pill.style.cssText = `
    display: inline-block;
    background-color: #e0e0e0;
    border-radius: 12px;
    padding: 2px 8px;
    margin-left: 5px;
    font-size: 12px;
  `;
  pill.textContent = `${tagKey}: ${tagValue}`;
  return pill;
}

/**
 * Enhances the resource list view by appending tag pills.
 * For each row in the table, it determines the resource ID and type,
 * then renders the ResourceTags component in a dedicated container.
 */
export async function enhanceResourceList(creds: CloudTrailCredentials): Promise<void> {
  const url = window.location.href;
  const region = getRegionFromUrl();
  let accountId: string;
  try {
    accountId = await getAccountId(creds);
  } catch (error) {
    console.error('Failed to get account ID:', error);
    return;
  }

  const table = document.querySelector('.enhanced-table-view.table');
  if (!table) {
    console.warn('Table not found');
    return;
  }

  const rows = table.querySelectorAll('tbody tr');
  for (const row of rows) {
    const nameCell = row.querySelector('td:nth-child(2)');
    if (!nameCell) continue;

    const resourceLink = nameCell.querySelector('a');
    if (!resourceLink) continue;

    const resourceId = getResourceIdFromLink(resourceLink);
    if (!resourceId) {
      console.warn('Resource ID not found for link:', resourceLink);
      continue;
    }

    const resourceType = getResourceType(url, row as HTMLElement);
    if (!resourceType) continue;

    const nameContainer = nameCell.querySelector('.enhanced-table-view__row__name_security_label') || nameCell;
    // Remove any existing tags container to avoid duplicates
    const existingContainer = nameContainer.querySelector('.resource-tags-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create a new container for the tags
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'resource-tags-container';
    nameContainer.appendChild(tagsContainer);

    const root = ReactDOM.createRoot(tagsContainer);
    root.render(
      <ResourceTags
        resourceType={resourceType}
        resourceId={resourceId}
        credentials={creds}
      />
    );
  }
}

/**
 * Clears the tag cache.
 */
export function clearTagCache() {
  Object.keys(tagCache).forEach((key) => delete tagCache[key]);
}
