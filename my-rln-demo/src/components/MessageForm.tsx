import React, { useState } from "react";

interface MessageFormProps {
  onSubmit: (message: string) => void;
}

export default function MessageForm({ onSubmit }: MessageFormProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSubmit(message.trim());
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Enter your message..."
        style={{ padding: "8px", width: "70%", marginRight: 8 }}
      />
      <button type="submit" style={{ padding: "8px 16px" }}>Post Message</button>
    </form>
  );
}
