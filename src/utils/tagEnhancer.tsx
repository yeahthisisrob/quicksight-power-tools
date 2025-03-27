// src/utils/tagEnhancer.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ResourceTags } from '../components/ResourceTags';
import { getAwsAccountId, getResourceTags as fetchResourceTags } from './quicksightUtils';
import { CloudTrailCredentials } from './quicksightUtils';
import { getRegionFromUrl, getResourceIdFromLink, getResourceType } from './quicksightUiUtils';

// Cache for resource tags: keys are in the format "resourceType-resourceId"
export const tagCache: Record<string, Array<{ Key: string; Value: string }>> = {};

/**
 * Fetches resource tags from QuickSight using the utility function.
 * Uses caching to avoid redundant calls.
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

  const resourceArn = `arn:aws:quicksight:${region}:${accountId}:${resourceType}/${resourceId}`;
  const tags = await fetchResourceTags(resourceArn, creds, region);
  tagCache[cacheKey] = tags;
  return tags;
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
    accountId = await getAwsAccountId(creds, region);
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
    const existingContainer = nameContainer.querySelector('.resource-tags-container');
    if (existingContainer) {
      existingContainer.remove();
    }

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