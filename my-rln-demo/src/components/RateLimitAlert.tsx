import React from "react";

interface RateLimitAlertProps {
  accountName: string;
  onSlash: () => void;
}

export default function RateLimitAlert({ accountName, onSlash }: RateLimitAlertProps) {
  return (
    <div style={{
      backgroundColor: "#ffe5e5",
      color: "#cc0000",
      padding: "10px",
      borderRadius: "4px",
      marginBottom: "16px"
    }}>
      <p><strong>{accountName}</strong> has exceeded the message rate limit!</p>
      <button onClick={onSlash} style={{
        padding: "6px 12px",
        backgroundColor: "#cc0000",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
      }}>
        Slash Account
      </button>
    </div>
  );
}
