// src/components/ManualInputForm.tsx
import React, { Dispatch, SetStateAction, useState } from "react";
import { TextField, Button, Typography } from "@mui/material";

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
  const [pastedText, setPastedText] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  const parseCredentialsBlock = (text: string) => {
    const lines = text.split("\n");
    const credentials: { [key: string]: string } = {};
    lines.forEach((line) => {
      const match = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        credentials[key] = value;
      }
    });
    const parsedAccessKeyId = credentials["aws_access_key_id"];
    const parsedSecretAccessKey = credentials["aws_secret_access_key"];
    const parsedSessionToken = credentials["aws_session_token"];
    if (!parsedAccessKeyId || !parsedSecretAccessKey || !parsedSessionToken) {
      throw new Error(
        "Invalid credentials block. Ensure it contains aws_access_key_id, aws_secret_access_key, and aws_session_token.",
      );
    }
    return {
      accessKeyId: parsedAccessKeyId,
      secretAccessKey: parsedSecretAccessKey,
      sessionToken: parsedSessionToken,
    };
  };

  const handleParse = () => {
    try {
      const credentials = parseCredentialsBlock(pastedText);
      setAccessKeyId(credentials.accessKeyId);
      setSecretAccessKey(credentials.secretAccessKey);
      setSessionToken(credentials.sessionToken);
      setLocalError(null);
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleSubmit = () => {
    const credentials = {
      accessKeyId,
      secretAccessKey,
      sessionToken,
    };
    // If there's pasted text and no local error, assume parsing was intended
    if (pastedText && !localError) {
      try {
        const parsedCredentials = parseCredentialsBlock(pastedText);
        onAssumeRole(parsedCredentials);
      } catch (err: any) {
        setLocalError(err.message);
      }
    } else {
      // Manual entry case
      onAssumeRole(credentials);
    }
  };

  const handleManualInputChange =
    (setter: Dispatch<SetStateAction<string>>) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(event.target.value);
    };

  return (
    <>
      <Typography variant="body2" sx={{ marginBottom: "8px" }}>
        Paste the credentials block from AWS Console Option 2 and click "Parse" to fill the fields, or enter the credentials manually below.
      </Typography>
      <TextField
        multiline
        rows={4}
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        placeholder="[default]\naws_access_key_id = AKIA...\naws_secret_access_key = wJalrX...\naws_session_token = FQoGZXI..."
        fullWidth
        sx={{ marginBottom: "8px" }}
      />
      <Button
        variant="outlined"
        onClick={handleParse}
        sx={{ marginBottom: "16px" }}
      >
        Parse
      </Button>
      {localError && (
        <Typography color="error" sx={{ marginBottom: "8px" }}>
          {localError}
        </Typography>
      )}
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