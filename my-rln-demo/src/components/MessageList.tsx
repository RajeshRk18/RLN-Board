import React from "react";

interface Message {
  sender: string;
  content: string;
}

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <h2>Messages</h2>
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {messages.map((msg, index) => (
            <li key={index} style={{ borderBottom: "1px solid #ccc", padding: "8px 0" }}>
              <strong>{msg.sender}:</strong> {msg.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
