import React from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { AnalysisMetadata } from "../utils/quicksightUtils";
import AWSCredentialsExpiryTimer from "./AWSCredentialsExpiryTimer";

interface SidebarHeaderProps {
  analysisMetadata: AnalysisMetadata | null;
  sessionExpiration: string | null;
  onSessionExpire: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  analysisMetadata,
  sessionExpiration,
  onSessionExpire,
}) => {
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
            {dayjs(analysisMetadata.LastUpdatedTime).format(
              "YYYY-MM-DD HH:mm:ss",
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SidebarHeader;
