import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tabs,
  Tab,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import HistoryIcon from "@mui/icons-material/History";
import FunctionsIcon from "@mui/icons-material/Functions";

interface SidebarLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const VerticalText = styled(Typography)({
  writingMode: "vertical-rl",
  transform: "rotate(180deg)",
  textAlign: "center",
  fontSize: "0.8rem",
  padding: "10px 0",
  whiteSpace: "nowrap",
  backgroundColor: "#232f3e",
  color: "#ffffff",
  letterSpacing: "0.1rem",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  children,
  activeSection,
  onSectionChange,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleMouseEnter = () => {
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    onSectionChange(newValue);
  };

  const sidebarWidth = isExpanded ? "50vw" : "40px";
  const collapsedHeight = "200px";

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: sidebarWidth,
        height: isExpanded ? "100%" : collapsedHeight,
        bgcolor: "#f5f5f5",
        color: "#16191f",
        zIndex: 1100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "all 0.3s ease-in-out",
        boxShadow: "-2px 0 5px rgba(0,0,0,0.1)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isExpanded ? (
        <>
          <AppBar
            position="static"
            sx={{
              bgcolor: "#232f3e",
              boxShadow: "none",
              minHeight: "56px !important",
              width: "100%",
            }}
          >
            <Toolbar
              variant="dense"
              sx={{
                minHeight: "56px !important",
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  flexGrow: 1,
                  fontSize: "1rem",
                  padding: "10px 0",
                  letterSpacing: "0.1rem",
                  backgroundColor: "#232f3e",
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                }}
              >
                QuickSight Power Tools
              </Typography>
            </Toolbar>
          </AppBar>
          <Box
            sx={{
              flexGrow: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Tabs
              value={activeSection}
              onChange={handleTabChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
              sx={{
                bgcolor: "#f8f8f8",
                "& .MuiTab-root": {
                  minHeight: 48,
                  fontSize: "0.85rem",
                  textTransform: "none",
                },
              }}
            >
              <Tab
                label="Calculated Fields"
                value="calculatedFields"
                icon={<FunctionsIcon />}
                iconPosition="start"
              />
              <Tab
                label="Change History"
                value="changeHistory"
                icon={<HistoryIcon />}
                iconPosition="start"
              />
            </Tabs>
            <Box sx={{ flexGrow: 1, p: 2, overflow: "auto", minWidth: 0 }}>
              {children}
            </Box>
          </Box>
        </>
      ) : (
        <VerticalText variant="subtitle1" color="inherit">
          QuickSight Power Tools
        </VerticalText>
      )}
    </Box>
  );
};

export default SidebarLayout;
