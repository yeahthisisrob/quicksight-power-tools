import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import SidebarLayout from "../layouts/SidebarLayout";
import ChangeHistoryTab from "./ChangeHistoryTab";
import CalculatedFieldsTab from "./CalculatedFieldsTab";
import {
  getAnalysisIdFromUrl,
  fetchAnalysisMetadata,
  fetchAnalysisDefinition,
} from "../utils/quicksightUtils";
import { fetchCloudTrailEvents } from "../utils/cloudTrailUtils";
import { CalculatedField } from "../types/CalculatedField";
import AssumeRoleForm from "./AssumeRoleForm";
import { Typography } from "@mui/material";
import SidebarHeader from "./SidebarHeader";
import { enhanceResourceList } from "../utils/tagEnhancer";

dayjs.extend(duration);
dayjs.extend(relativeTime);

interface StoredData {
  region: string;
}

const Sidebar: React.FC = () => {
  const [credentials, setCredentials] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiration, setSessionExpiration] = useState<string | null>(
    null
  );
  const [showJsonInput, setShowJsonInput] = useState<boolean>(true);
  const [activeSection, setActiveSection] =
    useState<string>("calculatedFields");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState<any | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [calculatedFields, setCalculatedFields] = useState<CalculatedField[]>(
    []
  );
  const [cloudTrailEvents, setCloudTrailEvents] = useState<any[]>([]);
  const [isChangeHistoryLoaded, setIsChangeHistoryLoaded] =
    useState<boolean>(false);
  const [isCalculatedFieldsLoading, setIsCalculatedFieldsLoading] =
    useState<boolean>(false);
  const [isChangeHistoryLoading, setIsChangeHistoryLoading] =
    useState<boolean>(false);
  const [region, setRegion] = useState<string>("us-east-1");

  // Function to load region from chrome.storage.local
  const loadRegion = async () => {
    if (!chrome.storage || !chrome.storage.local) {
      console.error("chrome.storage.local is not available.");
      return;
    }

    try {
      const result: StoredData = await new Promise((resolve, reject) => {
        chrome.storage.local.get("region", (items) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items as StoredData);
          }
        });
      });

      setRegion(result.region || "us-east-1");
    } catch (err) {
      console.error("Error loading region from storage:", err);
      setError("Failed to load region from storage.");
    }
  };

  // Function to handle changes in chrome.storage.local
  const handleStorageChange = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string
  ) => {
    if (area === "local" && changes.region?.newValue) {
      setRegion(changes.region.newValue);
    }
  };

  // Load region on component mount
  useEffect(() => {
    loadRegion();

    // Set up listener for storage changes
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    // Cleanup listener on unmount
    return () => {
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (credentials && analysisId) {
      try {
        setIsCalculatedFieldsLoading(true);
        const [metadata, { calculatedFields: fields }] = await Promise.all([
          fetchAnalysisMetadata(credentials, analysisId, region),
          fetchAnalysisDefinition(credentials, analysisId, region),
        ]);
        setAnalysisMetadata(metadata);
        setCalculatedFields(fields);
        setLastRefreshed(new Date());
        setError(null);
      } catch (err) {
        console.error(err);
        setError(
          "Failed to fetch analysis data. Please check your permissions."
        );
      } finally {
        setIsCalculatedFieldsLoading(false);
      }
    }
  }, [credentials, analysisId, region]);

  // Effect to set initial analysisId and enhance tags when credentials change
  useEffect(() => {
    if (credentials) {
      const currentAnalysisId = getAnalysisIdFromUrl(window.location.href);
      setAnalysisId(currentAnalysisId);
      enhanceResourceList(credentials).catch((err) =>
        console.error("Failed to enhance resource list:", err)
      );
    } else {
      setAnalysisId(null);
      setCalculatedFields([]);
      setCloudTrailEvents([]);
      setIsChangeHistoryLoaded(false);
    }
  }, [credentials]);

  // Effect to detect URL changes and update analysisId and reload cached tags
  useEffect(() => {
    if (credentials) {
      let prevUrl = window.location.href;

      const intervalId = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== prevUrl) {
          prevUrl = currentUrl;
          const currentAnalysisId = getAnalysisIdFromUrl(currentUrl);
          setAnalysisId(currentAnalysisId);
          setCalculatedFields([]);
          setCloudTrailEvents([]);
          setIsChangeHistoryLoaded(false);
          enhanceResourceList(credentials).catch((err) =>
            console.error("Failed to enhance resource list:", err)
          );
        }
      }, 1000); // Check every second

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [credentials]);

  // Effect to refresh data when analysisId or region changes
  useEffect(() => {
    if (credentials && analysisId) {
      refreshData();
    }
  }, [credentials, analysisId, refreshData]);

  const fetchCloudTrailEventsData = useCallback(
    async (daysAgo: number = 7) => {
      if (credentials && analysisId) {
        try {
          setIsChangeHistoryLoading(true);
          const events = await fetchCloudTrailEvents(
            credentials,
            analysisId,
            daysAgo,
            region
          );
          setCloudTrailEvents(events);
          setLastRefreshed(new Date());
          setIsChangeHistoryLoaded(true);
        } catch (err) {
          console.error(err);
          setError(
            "Failed to fetch CloudTrail events. Please check your permissions."
          );
        } finally {
          setIsChangeHistoryLoading(false);
        }
      }
    },
    [credentials, analysisId, region]
  );

  // Effect to trigger lazy loading of change history
  useEffect(() => {
    if (credentials && analysisId && !isChangeHistoryLoaded) {
      fetchCloudTrailEventsData();
    }
  }, [credentials, analysisId, isChangeHistoryLoaded, fetchCloudTrailEventsData]);

  const handleCredentialsReceived = (
    receivedCredentials: any,
    expiration: string
  ) => {
    setCredentials(receivedCredentials);
    setSessionExpiration(expiration);
    setError(null);
    setShowJsonInput(false);
    if (window.setCredentials) {
      window.setCredentials(receivedCredentials); // Share credentials with content script
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleSessionExpire = () => {
    setCredentials(null);
    setSessionExpiration(null);
    setShowJsonInput(true);
  };

  return (
    <SidebarLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {credentials && sessionExpiration && (
        <SidebarHeader
          analysisMetadata={analysisMetadata}
          sessionExpiration={sessionExpiration}
          onSessionExpire={handleSessionExpire}
          credentials={credentials}
        />
      )}
      {showJsonInput && (
        <AssumeRoleForm
          onCredentialsReceived={handleCredentialsReceived}
          onError={handleError}
        />
      )}
      {error && (
        <Typography
          color="error"
          sx={{ marginBottom: "8px", fontSize: "0.8rem" }}
        >
          {error}
        </Typography>
      )}
      {activeSection === "calculatedFields" && credentials && analysisId && (
        <CalculatedFieldsTab
          calculatedFields={calculatedFields}
          onRefresh={refreshData}
          lastRefreshed={lastRefreshed}
          isLoading={isCalculatedFieldsLoading}
        />
      )}
      {activeSection === "changeHistory" && credentials && analysisId && (
        <ChangeHistoryTab
          cloudTrailEvents={cloudTrailEvents}
          onRefresh={fetchCloudTrailEventsData}
          lastRefreshed={lastRefreshed}
          isLoading={isChangeHistoryLoading}
        />
      )}
    </SidebarLayout>
  );
};

const initializeSidebar = () => {
  const container = document.createElement("div");
  container.id = "quicksight-sidebar";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<Sidebar />);
};

if (process.env.NODE_ENV === "development") {
  initializeSidebar();
} else {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleSidebar") {
      const sidebarElement = document.getElementById("quicksight-sidebar");
      if (sidebarElement) {
        sidebarElement.style.display =
          sidebarElement.style.display === "none" ? "block" : "none";
      } else {
        initializeSidebar();
      }
      sendResponse({ success: true });
    }
  });
}

export default Sidebar;