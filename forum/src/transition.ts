/*// A demo function to see how the transaction is peformed with Aleo SDK

import { Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient } from '@provablehq/sdk';
import { RlnProgram } from "./program";

// Simple assertion helper
function assert(condition: any, message?: string): void {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

async function demoRLNTransitions() {
  // === Demo Keys & Addresses (for testing/demo only) ===
  const user1PrivateKey = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce2e04a8f7cc9adf94b73ee"; // Sample private key
  const USER_1_ADDRESS = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"; // Sample address
  const USER_2_ADDRESS = "0xffcf8fdee72ac11b5c542428b35eef5769c409f0"; // Another sample address

  // Create an account from the private key.
  const account = new Account({ privateKey: user1PrivateKey });

  // Initialize network client, key provider, and record provider.
  const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
  const keyProvider = new AleoKeyProvider();
  const recordProvider = new NetworkRecordProvider(account, networkClient);

  // Initialize ProgramManager (this demo doesn't use transfers but shows RLN transitions).
  const programManager = new ProgramManager("https://api.explorer.provable.com/v1", keyProvider, recordProvider);
  programManager.setAccount(account);

  // Create an instance of RlnProgram (our RLN transitions wrapper).
  const rlnProgram = new RlnProgram(account);

  // === 1. Create Group ===
  // Use a sample group id (as a field string). In production, this would be generated.
  const groupId = "0x1234567890abcdef1234567890abcdeffield";
  console.log("Creating board with groupId:", groupId);
  const createGroupOutput = await rlnProgram.createGroup(groupId);
  console.log("Create group output:", createGroupOutput);

  // === 2. Register Member ===
  // Use a sample secret (as hex string representing a number) and a token record.
  const memberSecret = "0xabcdef"; // Demo secret
  const token = { owner: USER_1_ADDRESS, amount: 50 }; // Sample stake record
  // Simulate Merkle roots (in a real scenario, these would be computed off-chain).
  const oldRoot = "0x0000000000000000000000000000000000000000000000000000000000000000field";
  const newRoot = "0x1111111111111111111111111111111111111111111111111111111111111111field";
  console.log("Registering member with secret:", memberSecret);
  const registerOutput = await rlnProgram.register(groupId, memberSecret, token, newRoot, oldRoot);
  console.log("Register output:", registerOutput);

  // === 3. Post Message ===
  // Prepare parameters for post_message.
  const grpNullifier = "0x2222222222222222222222222222222222222222222222222222222222222222field";
  const message = "Hello, RLN World!";
  const messageId = 1;
  const index = 0; // Assuming the first member's index is 0.
  const msgCounterRecord = "user1:group:0"; // Demo serialized counter record.
  // Simulate a Merkle proof with 15 elements & indices (placeholders).
  const merklePathElements = Array(15).fill("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaafield");
  const merklePathIndices = Array(15).fill("0x0field");
  const oldRootForPost = newRoot; // Use previous newRoot as oldRoot for post.
  const newRootForPost = "0x3333333333333333333333333333333333333333333333333333333333333333field";
  console.log("Posting message:", message);
  const postMessageOutput = await rlnProgram.postMessage(
    groupId,
    grpNullifier,
    memberSecret,
    message,
    messageId,
    index,
    msgCounterRecord,
    merklePathElements,
    merklePathIndices,
    newRootForPost,
  );
  console.log("Post message output:", postMessageOutput);

  // === 4. Withdraw Stake ===
  // Simulate a message counter record for withdrawal (e.g., after one message posted).
  const withdrawMsgCounterRecord = "user1:group:1"; // Demo counter record.
  console.log("Withdrawing stake for USER_1...");
  const withdrawOutput = await rlnProgram.withdrawStake(
    groupId,
    USER_1_ADDRESS,
    memberSecret,
    index,
    token,
    withdrawMsgCounterRecord,
    merklePathElements,
    merklePathIndices,
    newRootForPost,
  );
  console.log("Withdraw stake output:", withdrawOutput);

  // === 5. Slash Transition ===
  // Simulate a slash transition.
  // For demo purposes, we use dummy shares and placeholder Merkle proof and tree roots.
  const slasherPrivateKey = user1PrivateKey; // Using USER_1 as slasher in demo.
  const slasherSecret = "0xabcdef"; // Same as member secret for demo.
  const slasheeIdentityCommitment = "0x4444444444444444444444444444444444444444444444444444444444444444field";
  const xShare0 = "0x1field";
  const xShare1 = "0x2field";
  const yShare0 = "0x3field";
  const yShare1 = "0x4field";
  const slashToken = { owner: USER_1_ADDRESS, amount: 50 };
  console.log("Executing slash on member with identity commitment:", slasheeIdentityCommitment);
  const slashOutput = await rlnProgram.slash(
    groupId,
    USER_1_ADDRESS,
    slasherSecret,
    slasheeIdentityCommitment,
    xShare0,
    xShare1,
    yShare0,
    yShare1,
    slashToken,
    merklePathElements,
    merklePathIndices,
    newRootForPost,
  );
  console.log("Slash output:", slashOutput);

  console.log("RLN transitions demo complete.");
}

demoRLNTransitions().catch((err) => {
  console.error("Demo RLN transitions error:", err);
});

/*import { Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient, Transaction } from '@provablehq/sdk';

async function executeTransition() {
    const account = new Account();
    const PROGRAM_NAME = "aleo_auctionv0001.aleo";   
    const FUNCTION_NAME = "place_bid";     
    const INPUTS = [`${account.address()}`, "10u64"];


    // Initialize Aleo Network Client
    const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

    // Initialize Key and Record Providers
    const keyProvider = new AleoKeyProvider();
    const recordProvider = new NetworkRecordProvider(account, networkClient);

    // Initialize Program Manager
    const programManager = new ProgramManager("https://api.explorer.provable.com/v1", keyProvider, recordProvider);
    programManager.setAccount(account);


    try {
        // Build the execution transaction
        const transaction = await programManager.buildExecutionTransaction({
            programName: PROGRAM_NAME,
            functionName: FUNCTION_NAME,
            fee: 0.020,
            privateFee: false,
            inputs: INPUTS,
            keySearchParams: { "cacheKey": `${PROGRAM_NAME}:${FUNCTION_NAME}` },
        });

        // Broadcast the transaction to Aleo network
        const result = await programManager.networkClient.submitTransaction(transaction);
        console.log("Transaction submitted. Waiting for confirmation...");


        let transactionObj: Transaction;
        let transactionFound = false;

        // Polling loop to check transaction status
        while (!transactionFound) {
            try {
                transactionObj = await programManager.networkClient.getTransactionObject(result);
                transactionFound = true;
            } catch (e) {
                console.error("Waiting for transaction confirmation...");
                await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before retrying
            }
        }

        console.log(`Transaction confirmed! \n: ${transactionObj}`);
    } catch (error) {
        console.error("Error executing transition:", error);
    }
}

executeTransition();
*/
