// src/components/ManualInputForm.tsx

import React, { Dispatch, SetStateAction } from "react";
import { TextField, Button } from "@mui/material";

interface ManualInputFormProps {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  setAccessKeyId: Dispatch<SetStateAction<string>>;
  setSecretAccessKey: Dispatch<SetStateAction<string>>;
  setSessionToken: Dispatch<SetStateAction<string>>;
  onAssumeRole: (credentials: any) => void;
}

const ManualInputForm: React.FC<ManualInputFormProps> = ({
  accessKeyId,
  secretAccessKey,
  sessionToken,
  setAccessKeyId,
  setSecretAccessKey,
  setSessionToken,
  onAssumeRole,
}) => {
  // Handle input changes
  const handleManualInputChange =
    (setter: Dispatch<SetStateAction<string>>) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(event.target.value);
    };

  const handleSubmit = () => {
    const credentials = {
      accessKeyId,
      secretAccessKey,
      sessionToken,
    };
    onAssumeRole(credentials);
  };

  return (
    <>
      <TextField
        label="Access Key ID"
        value={accessKeyId}
        onChange={handleManualInputChange(setAccessKeyId)}
        fullWidth
        sx={{ marginBottom: "16px" }}
      />
      <TextField
        label="Secret Access Key"
        value={secretAccessKey}
        onChange={handleManualInputChange(setSecretAccessKey)}
        fullWidth
        sx={{ marginBottom: "16px" }}
      />
      <TextField
        label="Session Token"
        value={sessionToken}
        onChange={handleManualInputChange(setSessionToken)}
        fullWidth
        sx={{ marginBottom: "16px" }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        fullWidth
        sx={{ marginBottom: "8px" }}
      >
        Import Temporary Credentials
      </Button>
    </>
  );
};

export default ManualInputForm;
