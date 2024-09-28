// src/components/CalculatedFieldsTab.tsx

import React, { useState } from "react";
import {
  Typography,
  Box,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import { CalculatedField } from "../types/CalculatedField";
import ExpressionGraphDialog from "./ExpressionGraphDialog";
import DataTable from "./DataTable";
import { wrapFunctionsWithLinks } from "../utils/functionUtils";

interface CalculatedFieldsTabProps {
  calculatedFields: CalculatedField[];
  onRefresh: () => Promise<void>;
  lastRefreshed: Date | null;
  isLoading: boolean;
}

const CalculatedFieldsTab: React.FC<CalculatedFieldsTabProps> = ({
  calculatedFields,
  onRefresh,
  lastRefreshed,
  isLoading,
}) => {
  const [selectedField, setSelectedField] = useState<CalculatedField | null>(
    null,
  );
  const [graphDialogOpen, setGraphDialogOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleCopyExpression = (expression: string) => {
    navigator.clipboard
      .writeText(expression)
      .then(() => {
        alert("Expression copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy expression:", err);
        alert("Failed to copy expression");
      });
  };

  const handleExportToCSV = () => {
    if (calculatedFields.length === 0) {
      alert("No calculated fields to export.");
      return;
    }
    const headers = ["Name", "Dataset Identifier", "Expression"];
    const csvRows = [
      headers.join(","),
      ...calculatedFields.map((field) => {
        const name = `"${field.name.replace(/"/g, '""')}"`;
        const dataset = `"${field.dataSetIdentifier.replace(/"/g, '""')}"`;
        const expression = `"${field.expression.replace(/"/g, '""')}"`;
        return [name, dataset, expression].join(",");
      }),
    ];
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "calculated_fields.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenGraphDialog = (field: CalculatedField) => {
    setSelectedField(field);
    setGraphDialogOpen(true);
  };

  const handleCloseGraphDialog = () => {
    setGraphDialogOpen(false);
    setSelectedField(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Error refreshing calculated fields:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const columns = [
    { id: "name", label: "Name", width: "20%", searchable: true },
    {
      id: "dataSetIdentifier",
      label: "Dataset Identifier",
      width: "30%",
      searchable: true,
    },
    {
      id: "expression",
      label: "Expression",
      width: "40%",
      format: (value: string) => wrapFunctionsWithLinks(value),
      searchable: true,
    },
    {
      id: "actions",
      label: "Actions",
      width: "10%",
      align: "right" as const,
      format: (value: any, row: CalculatedField) => (
        <>
          <Tooltip title="Copy Expression">
            <IconButton
              size="small"
              onClick={() => handleCopyExpression(row.expression)}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Show Dependency Graph">
            <IconButton size="small" onClick={() => handleOpenGraphDialog(row)}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

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
          Calculated Fields
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportToCSV}
            size="small"
            sx={{ mr: 1, fontSize: "0.75rem" }}
            disabled={isLoading || refreshing}
          >
            Export to CSV
          </Button>
          <Tooltip title="Refresh Calculated Fields">
            <IconButton onClick={handleRefresh} size="small">
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
            <Typography sx={{ mt: 2 }}>
              Retrieving calculated fields...
            </Typography>
          </Box>
        ) : calculatedFields.length > 0 ? (
          <DataTable
            columns={columns}
            data={calculatedFields}
            initialSortBy="name"
          />
        ) : (
          <Typography sx={{ fontSize: "0.875rem" }}>
            No calculated fields available.
          </Typography>
        )}
      </Box>

      {selectedField && (
        <ExpressionGraphDialog
          expressions={calculatedFields}
          expression={selectedField}
          open={graphDialogOpen}
          onClose={handleCloseGraphDialog}
        />
      )}
    </Box>
  );
};

export default CalculatedFieldsTab;
