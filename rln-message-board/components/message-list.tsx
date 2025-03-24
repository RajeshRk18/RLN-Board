"use client";

import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Message {
  sender: string
  content: string
  timestamp: number
}

interface MessageListProps {
  messages: Message[]
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No messages yet. Be the first to post!</div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className="flex flex-col space-y-1 pb-4 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{message.sender}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

