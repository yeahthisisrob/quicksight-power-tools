// src/utils/lastUpdatedByEnhancer.tsx
import ReactDOM from 'react-dom/client';
import { CloudTrailCredentials } from '../types/CloudTrailCredentials';
import { getRegionFromUrl, getResourceIdFromLink, getResourceType } from './quicksightUiUtils';
import { fetchResourcePermissions } from './quicksightUtils';
import PrincipalsModal from '../components/PrincipalsModal';

// Cache for permissions (key: "resourceType-resourceId")
export const permissionsCache: Record<string, string[]> = {};

/**
 * Fetch permissions for a resource, using cache if available.
 * @param credentials Credentials for authentication.
 * @param resourceId The ID of the resource.
 * @param resourceType The type of resource ('dashboard' or 'dataset').
 * @param region The AWS region.
 * @returns Promise resolving to an array of principal names.
 */
export async function fetchPermissionsForResource(
  credentials: CloudTrailCredentials,
  resourceId: string,
  resourceType: string,
  region: string
): Promise<string[]> {
  const cacheKey = `${resourceType}-${resourceId}`;
  if (permissionsCache[cacheKey]) {
    return permissionsCache[cacheKey];
  }

  try {
    const principals = await fetchResourcePermissions(resourceType, resourceId, credentials, region);
    permissionsCache[cacheKey] = principals;
    return principals;
  } catch (error) {
    console.error(`Error fetching permissions for ${resourceType} (${resourceId}):`, error);
    throw error;
  }
}

/**
 * Clear the permissions cache.
 */
export function clearLastUpdatedCache() {
  Object.keys(permissionsCache).forEach((key) => delete permissionsCache[key]);
}

/**
 * Opens a modal to show the full list of principals.
 * @param principals Array of principal names to display.
 */
function openPrincipalsModal(principals: string[]) {
  let container = document.getElementById("principals-modal-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "principals-modal-container";
    document.body.appendChild(container);
  }
  const root = ReactDOM.createRoot(container);
  root.render(
    <PrincipalsModal
      principals={principals}
      onClose={() => {
        root.unmount();
        container?.remove();
      }}
    />
  );
}

/**
 * Enhances the resource table by injecting a new "Principals" column and
 * populating it with principals (showing the first one or two, plus a button to view more).
 * @param credentials Credentials for authentication.
 */
export async function enhanceLastUpdatedBy(credentials: CloudTrailCredentials): Promise<void> {
  const table = document.querySelector('.enhanced-table-view.table');
  if (!table) return;

  const region = getRegionFromUrl();

  // Update table header: Add a new <th> for "Principals" if missing.
  const thead = table.querySelector('thead tr');
  if (thead) {
    const headers = Array.from(thead.querySelectorAll('th'));
    const exists = headers.some((th) => th.textContent?.trim() === "Principals");
    if (!exists) {
      const th = document.createElement("th");
      th.className = "enhanced-table-view__head-column enhanced-table-view__head-column--lastUpdatedBy";
      th.textContent = "Principals";
      // Insert after the Owner column (assumed to be the third column)
      if (thead.children.length >= 3) {
        thead.insertBefore(th, thead.children[3]);
      } else {
        thead.appendChild(th);
      }
    }

    // Update the Owner header width to a smaller size.
    const ownerHeader = thead.querySelector("th.enhanced-table-view__head-column--owner") as HTMLTableCellElement;
    if (ownerHeader) {
      ownerHeader.style.width = "80px";
    }
  }

  // Pre-fill each row's new "Principals" cell with empty text and set Owner cell width.
  const rows = table.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    // Update Owner cell (third cell) width.
    const ownerCell = row.querySelector("td:nth-child(3)") as HTMLTableCellElement;
    if (ownerCell) {
      ownerCell.style.width = "80px";
    }
    let cell = row.querySelector(".last-updated-by") as HTMLTableCellElement;
    if (!cell) {
      cell = document.createElement("td");
      cell.className = "enhanced-table-view__row__data last-updated-by";
      // Insert after the Owner cell (i.e. as the fourth cell)
      if (row.children.length >= 3) {
        row.insertBefore(cell, row.children[3]);
      } else {
        row.appendChild(cell);
      }
    }
    // Pre-fill with blank text to reserve the cell space.
    cell.textContent = "";
  });

  // Update each row’s principals cell with fetched principals.
  for (const row of rows) {
    const nameCell = row.querySelector("td:nth-child(2)");
    if (!nameCell) continue;
    const resourceLink = nameCell.querySelector("a");
    if (!resourceLink) continue;
    const resourceId = getResourceIdFromLink(resourceLink);
    if (!resourceId) continue;
    const resourceType = getResourceType(window.location.href, row as HTMLElement);
    if (!resourceType) continue;

    let cell = row.querySelector(".last-updated-by") as HTMLTableCellElement;
    if (!cell) continue;

    cell.textContent = "Loading...";
    try {
      const principals = await fetchPermissionsForResource(credentials, resourceId, resourceType, region);
      if (principals.length === 0) {
        cell.textContent = "N/A";
      } else {
        const displayCount = 2;
        const visiblePrincipals = principals.slice(0, displayCount);
        cell.textContent = visiblePrincipals.join(", ");
        if (principals.length > displayCount) {
          const button = document.createElement("button");
          button.textContent = `+${principals.length - displayCount} more`;
          button.style.marginLeft = "5px";
          button.onclick = () => openPrincipalsModal(principals);
          cell.appendChild(button);
        }
      }
    } catch (error) {
      console.error("Error fetching principals:", error);
      cell.textContent = "Error";
    }
  }
}