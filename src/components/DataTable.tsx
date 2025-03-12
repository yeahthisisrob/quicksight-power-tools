import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  TextField,
} from "@mui/material";

interface Column {
  id: string;
  label: string;
  width?: string;
  align?: "right" | "left" | "center";
  format?: (value: any, row: any) => React.ReactNode;
  searchable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  initialSortBy?: string;
}

interface DataRow {
  [key: string]: any;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  initialSortBy = "",
}) => {
  const [sortBy, setSortBy] = useState<string>(initialSortBy);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortBy === "EventTime" ? "desc" : "asc"
  );
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSort = (column: string) => {
    const isAsc = sortBy === column && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortBy(column);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const processedData = useMemo(() => {
    return data.map((event: DataRow) => ({
      ...event,
      ChangesText: event.Changes
        ? event.Changes.map(
            (change: any) => `${change.left}: ${JSON.stringify(change.right)}`
          ).join(", ")
        : "",
    }));
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    return processedData
      .filter((row: DataRow) =>
        Object.entries(filters).every(([key, value]) => {
          if (key === "Changes") {
            return row.ChangesText.toLowerCase().includes(value.toLowerCase());
          }
          return String(row[key]).toLowerCase().includes(value.toLowerCase());
        })
      )
      .sort((a: DataRow, b: DataRow) => {
        if (a[sortBy] < b[sortBy]) return sortDirection === "asc" ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [processedData, filters, sortBy, sortDirection]);

  // Define exact header height based on your original styling
  const HEADER_ROW_HEIGHT = 36; // Calculated from padding: 8px + content height

  return (
    <TableContainer
      component={Paper}
      sx={{
        maxHeight: "100%",
        overflow: "auto",
        position: "relative",
      }}
    >
      <Table
        size="small"
        stickyHeader
        sx={{
          tableLayout: "fixed",
          borderCollapse: "separate", // Prevents border overlap issues
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                sx={{
                  padding: "8px",
                  fontSize: "0.75rem",
                  position: "sticky",
                  top: 0,
                  backgroundColor: "white",
                  zIndex: 3,
                  borderBottom: "1px solid rgba(224, 224, 224, 1)",
                  height: `${HEADER_ROW_HEIGHT}px`, // Explicit height
                  minHeight: `${HEADER_ROW_HEIGHT}px`,
                  lineHeight: 1.2, // Consistent line height to prevent jumping
                }}
              >
                <TableSortLabel
                  active={sortBy === column.id}
                  direction={sortBy === column.id ? sortDirection : "asc"}
                  onClick={() => handleSort(column.id)}
                >
                  {column.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={`${column.id}-filter`}
                align={column.align}
                sx={{
                  padding: "4px 8px",
                  position: "sticky",
                  top: `${HEADER_ROW_HEIGHT}px`, // Exact positioning below header
                  backgroundColor: "white",
                  zIndex: 2,
                  borderBottom: "1px solid rgba(224, 224, 224, 1)",
                  margin: 0,
                  height: "40px", // Matches TextField height + padding
                  minHeight: "40px",
                }}
              >
                {column.searchable && (
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder={`Search ${column.label}`}
                    value={filters[column.id] || ""}
                    onChange={(e) => handleFilterChange(column.id, e.target.value)}
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        height: "32px", // Exact height
                        "& fieldset": {
                          borderColor: "rgba(224, 224, 224, 1)",
                        },
                      },
                      "& .MuiOutlinedInput-input": {
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                        height: "1.5em", // Prevents vertical shift
                        boxSizing: "border-box",
                      },
                    }}
                  />
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAndSortedData.map((row: DataRow, index: number) => (
            <TableRow hover role="checkbox" tabIndex={-1} key={index}>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  sx={{
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    userSelect: "text",
                  }}
                >
                  {column.format ? column.format(row[column.id], row) : row[column.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable;