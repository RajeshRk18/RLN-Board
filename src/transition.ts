// A demo function to see how the transaction is peformed with Aleo SDK

import { Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient, Transaction } from '@provablehq/sdk';

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
