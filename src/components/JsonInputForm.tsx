// src/components/JsonInputForm.tsx

import React from "react";
import { TextField, Button, Box, IconButton, Typography } from "@mui/material";
import { ContentCopy } from "@mui/icons-material";

interface JsonInputFormProps {
  jsonInput: string;
  setJsonInput: (value: string) => void;
  onAssumeRole: (credentials: any, expiration?: string) => void;
  getCommand: () => string;
  handleCopyCommand: () => void;
}

const JsonInputForm: React.FC<JsonInputFormProps> = ({
  jsonInput,
  setJsonInput,
  onAssumeRole,
  getCommand,
  handleCopyCommand,
}) => {
  const handleJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(event.target.value);
  };

  const handleSubmit = () => {
    try {
      const parsedCredentials = JSON.parse(jsonInput);
      if (
        parsedCredentials.Credentials &&
        parsedCredentials.Credentials.AccessKeyId &&
        parsedCredentials.Credentials.SecretAccessKey &&
        parsedCredentials.Credentials.SessionToken &&
        parsedCredentials.Credentials.Expiration
      ) {
        const credentials = {
          accessKeyId: parsedCredentials.Credentials.AccessKeyId,
          secretAccessKey: parsedCredentials.Credentials.SecretAccessKey,
          sessionToken: parsedCredentials.Credentials.SessionToken,
        };
        const expiration = parsedCredentials.Credentials.Expiration;

        onAssumeRole(credentials, expiration);
      } else {
        console.error("Invalid JSON format.");
        alert(
          "Invalid JSON format. Please ensure you pasted the correct JSON output from the AWS CLI command.",
        );
      }
    } catch (err) {
      console.error("Error parsing JSON:", err);
      alert("Failed to parse JSON. Please check the input.");
    }
  };

  return (
    <>
      {/* AWS CLI Command Display */}
      <Box display="flex" alignItems="center" sx={{ marginBottom: "16px" }}>
        <TextField
          label="AWS CLI Command"
          value={getCommand()}
          fullWidth
          variant="outlined"
          InputProps={{
            readOnly: true,
          }}
          sx={{ marginRight: "8px" }}
        />
        <IconButton onClick={handleCopyCommand} aria-label="copy command">
          <ContentCopy />
        </IconButton>
      </Box>

      {/* JSON Input Field */}
      <TextField
        label="Paste JSON Response"
        multiline
        rows={6}
        value={jsonInput}
        onChange={handleJsonChange}
        variant="outlined"
        fullWidth
        sx={{ marginBottom: "16px" }}
      />

      {/* Submit Button */}
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

export default JsonInputForm;
