// src/components/ChangeHistoryTab.tsx

import React, { useState, useMemo } from "react";
import {
  Typography,
  Box,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DataTable from "./DataTable";
import { ReactNode } from "react";

interface ChangeHistoryTabProps {
  cloudTrailEvents: any[];
  onRefresh: (daysAgo?: number) => Promise<void>;
  lastRefreshed: Date | null;
  isLoading: boolean;
}

const ChangeHistoryTab: React.FC<ChangeHistoryTabProps> = ({
  cloudTrailEvents,
  onRefresh,
  lastRefreshed,
  isLoading,
}) => {
  const [timeRange, setTimeRange] = useState<number>(7);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleTimeRangeChange = async (
    event: React.MouseEvent<HTMLElement>,
    newTimeRange: number | null,
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
      await handleRefresh(newTimeRange);
    }
  };

  const handleRefresh = async (daysAgo?: number) => {
    setRefreshing(true);
    try {
      await onRefresh(daysAgo || timeRange);
    } catch (error) {
      console.error("Error refreshing CloudTrail events:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Function to render change details, handling objects inside the 'right' part
  const renderChangeDetails = (
    changes: { left: string; right: any }[],
  ): ReactNode => {
    return changes.map((change, index) => {
      const { left, right } = change;

      // Check the type of 'right' and render accordingly
      if (typeof right === "object" && right !== null) {
        // If 'right' is an object, render its key-value pairs
        return (
          <div key={index}>
            <strong>{left}:</strong>
            <ul>
              {Object.entries(right).map(([key, value]) => (
                <li key={key}>
                  {key}: {String(value)}
                </li>
              ))}
            </ul>
          </div>
        );
      } else if (typeof right === "string" || typeof right === "number") {
        // If 'right' is a string or number, render it directly
        return (
          <div key={index}>
            <strong>{left}:</strong> {String(right)}
          </div>
        );
      }

      return null; // Fallback if 'right' is something unexpected
    });
  };

  const columns = [
    { id: "EventName", label: "Event", width: "15%", searchable: true },
    { id: "Username", label: "User", width: "15%", searchable: true },
    {
      id: "EventTime",
      label: "Time",
      width: "20%",
      format: (value: string) => new Date(value).toLocaleString(),
      searchable: false,
    },
    {
      id: "Changes",
      label: "Changes",
      width: "50%",
      format: (value: any[]) => renderChangeDetails(value),
      searchable: true,
    },
  ];

  const processedData = useMemo(() => {
    return cloudTrailEvents.map((event) => ({
      ...event,
      ChangesText: event.Changes.map(
        (change: any) => `${change.left} ${JSON.stringify(change.right)}`,
      ).join(", "),
    }));
  }, [cloudTrailEvents]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "1rem" }}>
          Change History
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            aria-label="time range"
            size="small"
          >
            <ToggleButton
              value={1}
              aria-label="1 day"
              sx={{ fontSize: "0.75rem", py: 0.5 }}
            >
              1D
            </ToggleButton>
            <ToggleButton
              value={7}
              aria-label="7 days"
              sx={{ fontSize: "0.75rem", py: 0.5 }}
            >
              7D
            </ToggleButton>
            <ToggleButton
              value={30}
              aria-label="30 days"
              sx={{ fontSize: "0.75rem", py: 0.5 }}
            >
              30D
            </ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh Change History">
            <IconButton
              onClick={() => handleRefresh()}
              size="small"
              sx={{ ml: 1 }}
            >
              {isLoading || refreshing ? (
                <CircularProgress size={20} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mt: 4,
            }}
          >
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Retrieving change history...</Typography>
          </Box>
        ) : cloudTrailEvents.length > 0 ? (
          <DataTable
            columns={columns}
            data={processedData}
            initialSortBy="EventTime"
          />
        ) : (
          <Typography sx={{ fontSize: "0.875rem" }}>
            No change history available.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ChangeHistoryTab;
