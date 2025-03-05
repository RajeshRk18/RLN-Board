## Overview

A decentralized message board with spam prevention mechanism using the Rate Limiting Nullifier (RLN) protocol. Users join the board by staking funds, ensuring commitment and deterring spam. If a member exceeds the message limit, anyone from the board can derive the secret and slash their stake, keeping the board clean and incentivizing responsible participation.

## Usage

### create a board

```typescript
import { Account } from '@provablehq/sdk';
import { RLNBoard } from './RLNBoard';

const creator = new Account({ privateKey: "YOUR_PRIVATE_KEY" });
const board = new RLNBoard(creator);
console.log(`Board created with ID: ${board.id}`);
```

### join board

```typescript
import { Account } from '@provablehq/sdk';

// Create a member account and a secret
const member = new Account({ privateKey: "MEMBER_PRIVATE_KEY" });
const memberSecret = BigInt("123456789");

// Add the member to the board
await board.addMember(member, memberSecret);
console.log(`Member ${member.toString()} joined board ${board.id}`);

```

### post a message

```typescript
// Post a message from a board member.
const message = "Hello, RLN Board!";
await board.postMessage(member, memberSecret, message);

```

### leave the board

```typescript
import { poseidon2 } from "poseidon-lite";

// To leave, remove the member's identity commitment from the board's Merkle tree.
// Compute the member's identity commitment.
const identityCommitment = poseidon2([memberSecret]);

// Find the index of the commitment in the tree.
const memberIndex = board.tree.indexOf(identityCommitment);
if (memberIndex !== -1) {
  board.remove(memberIndex);
  console.log(`Member ${member.toString()} left board ${board.id}`);
} else {
  console.error("Member not found in the board.");
}
```

### Slash member's stake

```typescript

// If a member exceeds the allowed message limit, anyone in the board can slash their stake.
// This example calls the RLN program's slash transition directly.
const slasherSecret = BigInt("987654321");
const slasheeIdentityCommitment = "SLASHEE_COMMITMENT"; // Rate limited member's commitment
const xShare0 = "0x1"; 
const xShare1 = "0x2";
const yShare0 = "0x3";
const yShare1 = "0x4";
const nullifierId = 1;

// a sample token record
const token = "{ owner: slasher.private, amount: 100u64.private }";

await board.slash(
  board.id,
  slasher.toString(),
  slasherSecret.toString(),
  slasheeIdentityCommitment,
  xShare0,
  xShare1,
  yShare0,
  yShare1,
  nullifierId,
  token
);
console.log(`Stake slashed for member with commitment ${slasheeIdentityCommitment}`);

```