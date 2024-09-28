import React, { useState, useEffect } from "react";
import { Typography } from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

interface AWSCredentialsExpiryTimerProps {
  expiration: string;
  onExpire: () => void;
}

const AWSCredentialsExpiryTimer: React.FC<AWSCredentialsExpiryTimerProps> = ({
  expiration,
  onExpire,
}) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const updateTimeLeft = () => {
      const diff = dayjs(expiration).diff(dayjs());
      if (diff > 0) {
        const duration = dayjs.duration(diff);
        setTimeLeft(duration.format("HH:mm:ss"));
      } else {
        setTimeLeft("Expired");
        onExpire();
      }
    };

    const timer = setInterval(updateTimeLeft, 1000);
    updateTimeLeft();

    return () => clearInterval(timer);
  }, [expiration, onExpire]);

  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: "bold",
        textAlign: "center",
        padding: "4px",
        backgroundColor: "#f5f5f5",
        border: "1px solid #e0e0e0",
        marginTop: "4px",
        marginBottom: "4px",
      }}
    >
      Temporary AWS credentials expire in {timeLeft}
    </Typography>
  );
};

export default AWSCredentialsExpiryTimer;
