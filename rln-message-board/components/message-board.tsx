"use client"

import { useState, useEffect } from "react"
import { Account } from "@provablehq/sdk"
import { RLNBoard } from "@/lib/rln_board"
import AccountSwitcher from "./account-switcher"
import MessageList from "./message-list"
import MessageForm from "./message-form"
import RateLimitAlert from "./rate-limit-alert"
import { poseidon2 } from "poseidon-lite"

// Mock accounts for demonstration
const mockAccounts = [
  { id: "account1", name: "Alice", secret: BigInt(123456789), account: new Account() },
  { id: "account2", name: "Bob", secret: BigInt(987654321), account: new Account() },
  { id: "account3", name: "Charlie", secret: BigInt(192837465), account: new Account() },
]

export default function MessageBoard() {
  const [accounts, setAccounts] = useState(mockAccounts)
  const [currentAccount, setCurrentAccount] = useState(accounts[0])
  const [board, setBoard] = useState<RLNBoard | null>(null)
  const [messages, setMessages] = useState<{ sender: string; content: string; timestamp: number }[]>([])
  const [rateExceededAccount, setRateExceededAccount] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize the board
  useEffect(() => {
    const initBoard = async () => {
      try {
        const newBoard = new RLNBoard(mockAccounts[0].account)
        
        await newBoard.addMember(mockAccounts[0].account, mockAccounts[0].secret)
        await newBoard.addMember(mockAccounts[1].account, mockAccounts[1].secret)
        await newBoard.addMember(mockAccounts[2].account, mockAccounts[2].secret)

        setBoard(newBoard)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize board:", error)
      }
    }

    initBoard()
  }, [])

  const handleSwitchAccount = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId)
    if (account) {
      setCurrentAccount(account)
    }
  }

  const handlePostMessage = async (content: string) => {
    if (!board) return

    try {
      setIsLoading(true)

      // Post the message
      await board.postMessage(currentAccount.account, currentAccount.secret, content)
      const wasadded = board.messages.has(currentAccount.account.toString())
      if (wasadded) {
        // Add the message to our local state
        setMessages((prev) => [
          ...prev,
          {
            sender: currentAccount.name,
            content,
            timestamp: Date.now(),
          },
        ])
      } else {
        // Rate limit exceeded
        setRateExceededAccount(currentAccount.id)
      }
    } catch (error) {
      console.error("Failed to post message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlashAccount = async () => {
    if (!board || !rateExceededAccount) return

    try {
      setIsLoading(true)

      const accountToSlash = accounts.find((acc) => acc.id === rateExceededAccount)
      if (!accountToSlash) return

      const slasherAcc = currentAccount;

      const slasheeIdentityCommitment = poseidon2([accountToSlash.secret, BigInt(0)])

      /*await board.slash(
        slasherAcc.account,
        currentAccount.secret,
        slasheeIdentityCommitment,
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
      )*/

      // Remove the slashed account from our list
      setAccounts(accounts.filter((acc) => acc.id !== rateExceededAccount))
      setRateExceededAccount(null)

      // If the current account was slashed, switch to another account
      if (currentAccount.id === rateExceededAccount) {
        const remainingAccounts = accounts.filter((acc) => acc.id !== rateExceededAccount)
        if (remainingAccounts.length > 0) {
          setCurrentAccount(remainingAccounts[0])
        }
      }
    } catch (error) {
      console.error("Failed to slash account:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !board) {
    return <div className="flex justify-center items-center h-64">Loading message board...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-1">
        <AccountSwitcher accounts={accounts} currentAccount={currentAccount.id} onSwitchAccount={handleSwitchAccount} />
      </div>

      <div className="md:col-span-3 space-y-6">
        {rateExceededAccount && (
          <RateLimitAlert
            accountName={accounts.find((acc) => acc.id === rateExceededAccount)?.name || "Unknown"}
            onSlash={handleSlashAccount}
            currentAccountId={currentAccount.id}
            exceededAccountId={rateExceededAccount}
          />
        )}

        <MessageList messages={messages} />

        <MessageForm
          onSubmit={handlePostMessage}
          isDisabled={isLoading || rateExceededAccount === currentAccount.id}
          accountName={currentAccount.name}
        />
      </div>
    </div>
  )
}

