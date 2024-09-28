import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import ManualInputForm from "./ManualInputForm";
import JsonInputForm from "./JsonInputForm";
import { SelectChangeEvent } from "@mui/material/Select";

interface AssumeRoleFormProps {
  onCredentialsReceived: (credentials: any, expiration: string) => void;
  onError: (error: string) => void;
}

const AssumeRoleForm: React.FC<AssumeRoleFormProps> = ({
  onCredentialsReceived,
  onError,
}) => {
  const regions = [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "af-south-1",
    "ap-east-1",
    "ap-south-1",
    "ap-northeast-3",
    "ap-northeast-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ca-central-1",
    "cn-north-1",
    "cn-northwest-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-south-1",
    "eu-west-3",
    "eu-north-1",
    "me-south-1",
    "sa-east-1",
    "us-gov-east-1",
    "us-gov-west-1",
  ];

  const [region, setRegion] = useState<string>("us-east-1");
  const [manualInput, setManualInput] = useState<boolean>(true); // Store manualInput
  const [jsonInput, setJsonInput] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [accessKeyId, setAccessKeyId] = useState<string>("");
  const [secretAccessKey, setSecretAccessKey] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Load region and manualInput from Chrome local storage, and keys from sessionStorage
  useEffect(() => {
    if (chrome.storage) {
      chrome.storage.local.get(["region", "manualInput"], (result) => {
        if (result.region) setRegion(result.region);
        if (result.manualInput !== undefined)
          setManualInput(result.manualInput);
      });
    }

    const savedAccessKeyId = sessionStorage.getItem("accessKeyId") || "";
    const savedSecretAccessKey =
      sessionStorage.getItem("secretAccessKey") || "";
    const savedSessionToken = sessionStorage.getItem("sessionToken") || "";

    setAccessKeyId(savedAccessKeyId);
    setSecretAccessKey(savedSecretAccessKey);
    setSessionToken(savedSessionToken);
  }, []);

  // Save region and manualInput to Chrome local storage whenever they change
  useEffect(() => {
    if (chrome.storage) {
      chrome.storage.local.set({ region, manualInput });
    }
  }, [region, manualInput]);

  // Save sensitive data (keys) to sessionStorage whenever they change
  useEffect(() => {
    if (accessKeyId) sessionStorage.setItem("accessKeyId", accessKeyId);
    if (secretAccessKey)
      sessionStorage.setItem("secretAccessKey", secretAccessKey);
    if (sessionToken) sessionStorage.setItem("sessionToken", sessionToken);
  }, [accessKeyId, secretAccessKey, sessionToken]);

  const handleRegionChange = (event: SelectChangeEvent<string>) => {
    setRegion(event.target.value);
  };

  const handleInputMethodChange = (
    event: React.MouseEvent<HTMLElement>,
    newManualInput: boolean | null,
  ) => {
    if (newManualInput !== null) {
      setManualInput(newManualInput);
    }
  };

  const fetchExpirationUsingSTS = async (credentials: any) => {
    try {
      const stsClient = new STSClient({
        region: region,
        credentials,
      });

      const identity = await stsClient.send(new GetCallerIdentityCommand({}));
      console.log("Caller Identity:", identity);

      const expiration = new Date(
        Date.now() + duration * 60 * 1000,
      ).toISOString();

      onCredentialsReceived(credentials, expiration);
      setError(null);

      // After successful import, clear input fields except region
      setJsonInput("");
      setAccessKeyId("");
      setSecretAccessKey("");
      setSessionToken("");
      setDuration(60);
      setManualInput(true);
    } catch (err: any) {
      console.error("Error in fetching STS expiration:", err);
      const errorMsg =
        "Failed to retrieve expiration. Please check your credentials.";
      setError(errorMsg);
      onError(errorMsg);
    }
  };

  const handleAssumeRole = (credentials: any, expiration?: string) => {
    if (manualInput) {
      if (accessKeyId && secretAccessKey && sessionToken) {
        fetchExpirationUsingSTS(credentials);
      } else {
        const errorMsg =
          "Please fill out all fields for Access Key, Secret Key, and Session Token.";
        setError(errorMsg);
        onError(errorMsg);
      }
    } else {
      if (credentials && expiration) {
        onCredentialsReceived(credentials, expiration);
        setError(null);

        // After successful import, clear input fields except region
        setJsonInput("");
        setAccessKeyId("");
        setSecretAccessKey("");
        setSessionToken("");
        setDuration(60);
        setManualInput(true);
      } else {
        const errorMsg = "Invalid credentials or expiration.";
        setError(errorMsg);
        onError(errorMsg);
      }
    }
  };

  const getCommand = () => {
    const durationInSeconds = duration * 60;
    return `aws sts get-session-token --duration-seconds ${durationInSeconds}`;
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(getCommand());
  };

  return (
    <Paper elevation={3} sx={{ padding: "24px" }}>
      <Typography variant="h5" sx={{ marginBottom: "16px" }}>
        AWS Assume Role
      </Typography>

      <Typography variant="body1" sx={{ marginBottom: "24px" }}>
        To use this extension, you need temporary AWS credentials with the
        appropriate permissions to access Amazon QuickSight APIs.
      </Typography>

      {/* Step 1: Select Region */}
      <Card sx={{ marginBottom: "24px" }}>
        <CardContent>
          <Typography variant="h6" sx={{ marginBottom: "16px" }}>
            Step 1: Select Region
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="region-select-label">AWS Region</InputLabel>
            <Select
              labelId="region-select-label"
              value={region}
              label="AWS Region"
              onChange={handleRegionChange}
            >
              {regions.map((reg) => (
                <MenuItem key={reg} value={reg}>
                  {reg}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Step 2: Choose Input Method */}
      <Card sx={{ marginBottom: "24px" }}>
        <CardContent>
          <Typography variant="h6" sx={{ marginBottom: "16px" }}>
            Step 2: Choose Input Method
          </Typography>
          <ToggleButtonGroup
            value={manualInput}
            exclusive
            onChange={handleInputMethodChange}
            sx={{ marginBottom: "16px" }}
            fullWidth
          >
            <ToggleButton value={true} aria-label="manual input">
              Manual Input
            </ToggleButton>
            <ToggleButton value={false} aria-label="json input">
              JSON Input
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2">
            <strong>Manual Input:</strong> Use this when you have access to
            temporary AWS credentials through a portal or AWS console.
            <br />
            <strong>JSON Input:</strong> Use this if you have permissions to
            assume a role and can run AWS CLI commands to get credentials.
          </Typography>
        </CardContent>
      </Card>

      {/* Step 3: Select Session Duration */}
      <Card sx={{ marginBottom: "24px" }}>
        <CardContent>
          <Typography variant="h6" sx={{ marginBottom: "16px" }}>
            Step 3: Select Session Duration
          </Typography>
          <ToggleButtonGroup
            value={duration}
            exclusive
            onChange={(event, newDuration) => {
              if (newDuration !== null) setDuration(newDuration);
            }}
            aria-label="session duration"
            sx={{ marginBottom: "16px" }}
            fullWidth
          >
            <ToggleButton value={15} aria-label="15 minutes">
              15 min
            </ToggleButton>
            <ToggleButton value={30} aria-label="30 minutes">
              30 min
            </ToggleButton>
            <ToggleButton value={45} aria-label="45 minutes">
              45 min
            </ToggleButton>
            <ToggleButton value={60} aria-label="60 minutes">
              60 min
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2">
            <strong>Note:</strong>{" "}
            {manualInput
              ? "The selected duration will determine the estimated expiration time of your temporary credentials."
              : "The selected duration will be used to generate your temporary credentials command."}
          </Typography>
        </CardContent>
      </Card>

      {/* Input Forms */}
      {manualInput ? (
        <ManualInputForm
          accessKeyId={accessKeyId}
          secretAccessKey={secretAccessKey}
          sessionToken={sessionToken}
          setAccessKeyId={setAccessKeyId}
          setSecretAccessKey={setSecretAccessKey}
          setSessionToken={setSessionToken}
          onAssumeRole={handleAssumeRole}
        />
      ) : (
        <JsonInputForm
          jsonInput={jsonInput}
          setJsonInput={setJsonInput}
          onAssumeRole={handleAssumeRole}
          getCommand={getCommand}
          handleCopyCommand={handleCopyCommand}
        />
      )}

      {/* Error Message */}
      {error && (
        <Typography color="error" sx={{ marginTop: "8px" }}>
          {error}
        </Typography>
      )}
    </Paper>
  );
};

export default AssumeRoleForm;
