"use client"

import { Check, ChevronsUpDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface AccountSwitcherProps {
  accounts: { id: string; name: string }[]
  currentAccount: string
  onSwitchAccount: (accountId: string) => void
}

export default function AccountSwitcher({ accounts, currentAccount, onSwitchAccount }: AccountSwitcherProps) {
  const [open, setOpen] = useState(false)

  const currentAccountName = accounts.find((acc) => acc.id === currentAccount)?.name || "Select account"

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Current Account</div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select an account"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{currentAccountName}</span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search accounts..." />
              <CommandEmpty>No account found.</CommandEmpty>
              <CommandGroup>
                {accounts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={account.id}
                    onSelect={() => {
                      onSwitchAccount(account.id)
                      setOpen(false)
                    }}
                    className="text-sm"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {account.name}
                    <Check
                      className={cn("ml-auto h-4 w-4", currentAccount === account.id ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

