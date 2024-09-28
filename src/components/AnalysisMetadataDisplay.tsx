import React from "react";
import { Typography, Box } from "@mui/material";
import { AnalysisMetadata } from "../utils/quicksightUtils";

interface AnalysisMetadataDisplayProps {
  metadata: AnalysisMetadata;
}

const AnalysisMetadataDisplay: React.FC<AnalysisMetadataDisplayProps> = ({
  metadata,
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Analysis: {metadata.Name}
      </Typography>
      <Typography variant="body2">Status: {metadata.Status}</Typography>
      <Typography variant="body2">
        Last Updated: {new Date(metadata.LastUpdatedTime).toLocaleString()}
      </Typography>
      <Typography variant="body2">
        Created: {new Date(metadata.CreatedTime).toLocaleString()}
      </Typography>
    </Box>
  );
};

export default AnalysisMetadataDisplay;
