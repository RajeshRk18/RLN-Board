"use client";

import MessageBoard from "@/components/message-board"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Decentralized Message Board</h1>
      <MessageBoard />
    </main>
  )
}

