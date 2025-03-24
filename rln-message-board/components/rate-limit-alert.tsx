"use client"

import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface RateLimitAlertProps {
  accountName: string
  onSlash: () => void
  currentAccountId: string
  exceededAccountId: string
}

export default function RateLimitAlert({
  accountName,
  onSlash,
  currentAccountId,
  exceededAccountId,
}: RateLimitAlertProps) {
  const isCurrentAccount = currentAccountId === exceededAccountId

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Rate Limit Exceeded</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <div>
          {isCurrentAccount
            ? "Your account has exceeded the message rate limit."
            : `${accountName} has exceeded the message rate limit.`}
        </div>

        {!isCurrentAccount && (
          <Button variant="destructive" size="sm" onClick={onSlash} className="w-fit">
            Slash Account
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

