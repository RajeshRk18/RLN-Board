"use client"

import type React from "react"

import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface MessageFormProps {
  onSubmit: (message: string) => void
  isDisabled: boolean
  accountName: string
}

export default function MessageForm({ onSubmit, isDisabled, accountName }: MessageFormProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isDisabled) {
      onSubmit(message)
      setMessage("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post as {accountName}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isDisabled}
            className="min-h-[100px]"
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {isDisabled ? "Posting is disabled for this account" : ""}
          </div>
          <Button type="submit" disabled={isDisabled || !message.trim()}>
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

