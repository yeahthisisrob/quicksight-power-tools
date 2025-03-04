import React from "react";
import { Box, Typography, Button } from "@mui/material";
import dayjs from "dayjs";
import { AnalysisMetadata } from "../utils/quicksightUtils";
import AWSCredentialsExpiryTimer from "./AWSCredentialsExpiryTimer";
import { CloudTrailCredentials } from "../types/CloudTrailCredentials";
import { clearTagCache, enhanceResourceList } from "../utils/tagEnhancer";
import { clearLastUpdatedCache, enhanceLastUpdatedBy } from "../utils/lastUpdatedByEnhancer";

interface SidebarHeaderProps {
  analysisMetadata: AnalysisMetadata | null;
  sessionExpiration: string | null;
  onSessionExpire: () => void;
  credentials: CloudTrailCredentials | null;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  analysisMetadata,
  sessionExpiration,
  onSessionExpire,
  credentials,
}) => {
  const handleRefreshTags = async () => {
    if (credentials) {
      clearTagCache();
      try {
        await enhanceResourceList(credentials);
      } catch (err) {
        console.error("Failed to enhance resource tags:", err);
      }
    }
  };

  const handleRefreshLastUpdated = async () => {
    if (credentials) {
      clearLastUpdatedCache();
      try {
        await enhanceLastUpdatedBy(credentials);
      } catch (err) {
        console.error("Failed to enhance Last Updated By:", err);
      }
    }
  };

  return (
    <Box sx={{ padding: 2, borderBottom: "1px solid #e0e0e0" }}>
      {sessionExpiration && (
        <AWSCredentialsExpiryTimer
          expiration={sessionExpiration}
          onExpire={onSessionExpire}
        />
      )}
      {analysisMetadata && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">
            Analysis: {analysisMetadata.Name}
          </Typography>
          <Typography variant="caption">
            Last Updated:{" "}
            {dayjs(analysisMetadata.LastUpdatedTime).format("YYYY-MM-DD HH:mm:ss")}
          </Typography>
        </Box>
      )}
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={handleRefreshTags}>
          Refresh Tags
        </Button>
        <Button variant="contained" onClick={handleRefreshLastUpdated}>
          Refresh Last Updated
        </Button>
      </Box>
    </Box>
  );
};

export default SidebarHeader;
