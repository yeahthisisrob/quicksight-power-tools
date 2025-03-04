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

export const tagCache: { [key: string]: { Key: string; Value: string }[] } = {};

export function getRegionFromUrl(): string {
  const url = window.location.href;
  const match = url.match(/https:\/\/(.*?)\.quicksight\.aws\.amazon\.com/);
  return match ? match[1] : 'us-east-1';
}

export async function getAccountId(creds: CloudTrailCredentials): Promise<string> {
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
  if (!response.Account) throw new Error('Failed to retrieve account ID');
  return response.Account;
}

export function getResourceIdFromLink(link: HTMLAnchorElement): string | null {
  const href = link.getAttribute('href');
  if (href) {
    const parts = href.split('/');
    if (parts[parts.length - 1] === 'view' && parts.length >= 3) {
      return parts[parts.length - 2];
    }
    return parts[parts.length - 1];
  }
  return null;
}

export function getResourceType(url: string, row: HTMLElement): string {
  if (url.includes('/dashboards')) return 'dashboard';
  if (url.includes('/data-sets')) return 'dataset';
  if (url.includes('/search')) {
    const typeCell = row.querySelector('td:nth-child(3)');
    const typeText = typeCell?.textContent?.trim().toLowerCase();
    return typeText === 'dashboard' ? 'dashboard' : typeText === 'dataset' ? 'dataset' : '';
  }
  return '';
}

export async function getResourceTags(
  resourceId: string,
  accountId: string,
  region: string,
  resourceType: string,
  creds: CloudTrailCredentials
): Promise<{ Key: string; Value: string }[]> {
  const quickSightClient = new QuickSightClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
  const command = new ListTagsForResourceCommand({
    ResourceArn: `arn:aws:quicksight:${region}:${accountId}:${resourceType}/${resourceId}`,
  });
  try {
    const response = await quickSightClient.send(command);
    return (response.Tags || []).filter((tag): tag is { Key: string; Value: string } =>
      tag.Key !== undefined && tag.Value !== undefined
    );
  } catch (error) {
    console.error(`Error fetching tags for ${resourceType}:`, error);
    return [];
  }
}

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
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');
  for (const row of rows) {
    const nameCell = row.querySelector('td:nth-child(2)');
    if (!nameCell) continue;

    const resourceLink = nameCell.querySelector('a');
    if (!resourceLink) continue;

    const resourceId = getResourceIdFromLink(resourceLink);
    if (!resourceId) continue;

    const resourceType = getResourceType(url, row as HTMLElement);
    if (!resourceType) continue;

    const nameContainer = nameCell.querySelector('.enhanced-table-view__row__name_security_label') || nameCell;
    const existingContainer = nameContainer.querySelector('.resource-tags-container');
    if (existingContainer) existingContainer.remove();

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

export function clearTagCache() {
  Object.keys(tagCache).forEach((key) => delete tagCache[key]);
}