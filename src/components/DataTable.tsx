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

// Define Column interface
interface Column {
  id: string;
  label: string;
  width?: string;
  align?: "right" | "left" | "center";
  format?: (value: any, row: any) => React.ReactNode;
  searchable?: boolean;
}

// Define DataTableProps interface
interface DataTableProps {
  columns: Column[];
  data: any[];
  initialSortBy?: string;
}

// Define DataRow type to generalize data rows
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
    initialSortBy === "EventTime" ? "desc" : "asc",
  );
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Handle sorting by column
  const handleSort = (column: string) => {
    const isAsc = sortBy === column && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortBy(column);
  };

  // Handle filtering by column
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Process data (if needed, customize this part for your app)
  const processedData = useMemo(() => {
    return data.map((event: DataRow) => ({
      ...event,
      ChangesText: event.Changes
        ? event.Changes.map(
            (change: any) => `${change.left}: ${JSON.stringify(change.right)}`,
          ).join(", ")
        : "",
    }));
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    return processedData
      .filter((row: DataRow) =>
        Object.entries(filters).every(([key, value]) => {
          if (key === "Changes") {
            return row.ChangesText.toLowerCase().includes(value.toLowerCase());
          }
          return String(row[key]).toLowerCase().includes(value.toLowerCase());
        }),
      )
      .sort((a: DataRow, b: DataRow) => {
        if (a[sortBy] < b[sortBy]) return sortDirection === "asc" ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [processedData, filters, sortBy, sortDirection]);

  return (
    <TableContainer
      component={Paper}
      sx={{ maxHeight: "100%", overflow: "auto" }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ width: column.width, padding: "8px" }}
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
                style={{ width: column.width, padding: "4px 8px" }}
              >
                {column.searchable ? (
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder={`Search ${column.label}`}
                    value={filters[column.id] || ""}
                    onChange={(e) =>
                      handleFilterChange(column.id, e.target.value)
                    }
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-input": {
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                      },
                    }}
                  />
                ) : null}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAndSortedData.map((row: DataRow, index: number) => (
            <TableRow hover role="checkbox" tabIndex={-1} key={index}>
              {columns.map((column) => {
                const value = row[column.id];
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{
                      width: column.width,
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {column.format ? column.format(value, row) : value}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable;
