import React, { useState, useEffect } from "react";
import { poseidon2 } from "poseidon-lite";
import MessageList from "./MessageList";
import MessageForm from "./MessageForm";
import RateLimitAlert from "./RateLimitAlert";
import { RLNBoard } from "../rln_board";
import { Account } from "@provablehq/sdk";
// Define a type for account
interface AccountData {
  id: string;
  name: string;
  secret: bigint;
  account: Account; 
}

// Mock accounts for demo
const mockAccounts: AccountData[] = [
  { id: 'account1', name: 'Alice', secret: BigInt(123456789), account: new Account() },
  { id: 'account2', name: 'Bob', secret: BigInt(987654321), account: new Account() },
  { id: 'account3', name: 'Charlie', secret: BigInt(192837465), account: new Account() },
];

export default function MessageBoard() {
  const [accounts, setAccounts] = useState<AccountData[]>(mockAccounts);
  const [currentAccount, setCurrentAccount] = useState<AccountData>(mockAccounts[0]);
  const [board, setBoard] = useState<RLNBoard | null>(null);
  const [messages, setMessages] = useState<{ sender: string; content: string }[]>([]);
  const [rateExceededAccount, setRateExceededAccount] = useState<string | null>(null);

  // Initialize the board
  useEffect(() => {
    const initBoard = async () => {
      const newBoard = new RLNBoard(mockAccounts[0].account);
      // Add all members
      for (const acc of mockAccounts) {
        await newBoard.addMember(acc.account, acc.secret);
      }
      setBoard(newBoard);
      // Load existing messages (if any)
      const msgs = Array.from(newBoard.messages.entries()).map(([sender, content]) => ({
        sender,
        content
      }));
      setMessages(msgs);
    };
    initBoard();
  }, []);

  const handleSwitchAccount = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (acc) setCurrentAccount(acc);
  };

  const handlePostMessage = async (content: string) => {
    if (!board) return;
    await board.postMessage(currentAccount.account, currentAccount.secret, content);
    if (board.messages.has(currentAccount.id)) {
      // Message posted successfully
      setMessages(Array.from(board.messages.entries()).map(([sender, content]) => ({ sender, content })));
    } else {
      // Rate limit exceeded
      setRateExceededAccount(currentAccount.id);
    }
  };

  const handleSlashAccount = async () => {
    if (!board || !rateExceededAccount) return;
    const accountToSlash = accounts.find(acc => acc.id === rateExceededAccount);
    if (!accountToSlash) return;
    const offenderCommitment = poseidon2([accountToSlash.secret, BigInt(0)]);
    //await board.slash(offenderCommitment);
    // Remove slashed account from local state
    setAccounts(prev => prev.filter(acc => acc.id !== rateExceededAccount));
    setRateExceededAccount(null);
    // Update messages
    setMessages(Array.from(board.messages.entries()).map(([sender, content]) => ({ sender, content })));
    // If current account was slashed, switch to first remaining account
    if (currentAccount.id === rateExceededAccount && accounts.length > 1) {
      setCurrentAccount(accounts.find(acc => acc.id !== rateExceededAccount)!);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>Accounts</h2>
      <div style={{ marginBottom: 16 }}>
        {accounts.map(acc => (
          <button
            key={acc.id}
            onClick={() => handleSwitchAccount(acc.id)}
            style={{
              marginRight: 8,
              padding: "8px 12px",
              backgroundColor: currentAccount.id === acc.id ? "#0070f3" : "#ddd",
              color: currentAccount.id === acc.id ? "#fff" : "#000",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            {acc.name}
          </button>
        ))}
      </div>

      {rateExceededAccount && (
        <RateLimitAlert
          accountName={accounts.find(acc => acc.id === rateExceededAccount)?.name || "Unknown"}
          onSlash={handleSlashAccount}
        />
      )}

      <MessageList messages={messages} />

      <MessageForm onSubmit={handlePostMessage} />
    </div>
  );
}
