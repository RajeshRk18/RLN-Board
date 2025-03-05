
import { Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient, TransactionObject, Transition, initThreadPool } from '@provablehq/sdk';

initThreadPool();

const DEFAULT_FEE = 0.090;

export class RlnProgram {
  programManager: ProgramManager;

  constructor(account: Account) {
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
    const recordProvider = new NetworkRecordProvider(account, networkClient);
    this.programManager = new ProgramManager("https://api.explorer.provable.com/v1", keyProvider, recordProvider);
    this.programManager.setAccount(account);
  }

  /**
   * Executes a transition on the RLN program.
   */
  async executeTransition(
    functionName: string,
    inputs: string[],
    keySearchParams: Record<string, string>,
    fee: number = DEFAULT_FEE,
    privateFee: boolean = false
  ): Promise<any> {
    // Build the transaction for the given transition.
    const transaction = await this.programManager.buildExecutionTransaction({
      programName: "rln_boardv01.aleo",
      functionName,
      fee,
      privateFee,
      inputs,
      keySearchParams,
    });

    // Submit the transaction.
    const txResult = await this.programManager.networkClient.submitTransaction(transaction);

    // Retrieve the transaction object.
    const transactionObj = await this.programManager.networkClient.getTransactionObject(txResult);

    // Extract the first transition's output.
    const transition = transactionObj.transitions()[0] as Transition;
    const output = transition.outputs(true)[0];
    return output;
  }

  /**
   * Creates a new board.
   * @param groupId - The group ID as a field string.
   */
  async createGroup(groupId: string): Promise<any> {
    const inputs = [`${groupId}field`];
    return this.executeTransition("create_group", inputs, { cacheKey: "rln.aleo:create_group" });
  }

  /**
   * Registers a new member.
   * @param groupId - The group ID.
   * @param secret - The secret used to derive the identity commitment.
   * @param token - The token record { owner, amount }.
   * @param root - The new Merkle tree root.
   * @param old_root - The previous Merkle tree root.
   */
  async register(
    groupId: string,
    secret: string,
    token: { owner: string; amount: number },
    root: string,
    old_root: string
  ): Promise<any> {
    const inputs = [
      `${groupId}field`,
      `${secret}field`,
      `${token.owner}address`,
      `${token.amount}u64`,
      `${root}field`,
      `${old_root}field`
    ];
    return this.executeTransition("register", inputs, { cacheKey: "rln.aleo:register" });
  }

  /**
   * Posts a message.
   * @param groupId - The group ID.
   * @param grpNullifier - The group nullifier.
   * @param secretKey - The member's secret key.
   * @param message - The message to post.
   * @param messageId - The message ID (u32).
   * @param index - The member's index (u32).
   * @param msgCounterRecord - Serialized UserMessageCounter record.
   * @param merklePathElements - Array of 15 field elements for the Merkle path.
   * @param merklePathIndices - Array of 15 field elements for the Merkle path indices.
   * @param root - The new Merkle tree root.
   * @param old_root - The previous Merkle tree root.
   */
  async postMessage(
    groupId: string,
    grpNullifier: string,
    address: string,
    secretKey: string,
    index: number,
    message: string,
    messageId: number,
    msgCounterRecord: string,
    merklePathElements: string[],
    merklePathIndices: string[],
    root: string,
    old_root: string
  ): Promise<any> {
    if (merklePathElements.length !== 15 || merklePathIndices.length !== 15) {
      throw new Error("Merkle path elements and indices must be arrays of length 15.");
    }
    const inputs = [
      `${groupId}field`,
      `${grpNullifier}field`,
      `${secretKey}field`,
      `${index}u32`,
      `${message}field`,
      `${messageId}u32`,
      `${msgCounterRecord}record`,
      ...merklePathElements,
      ...merklePathIndices,
      `${root}field`,
      `${old_root}field`
    ];
    return this.executeTransition("post_message", inputs, { cacheKey: "rln.aleo:post_message" });
  }

  /**
   * Withdraws stake.
   * @param groupId - The group ID.
   * @param member - The member's address.
   * @param secret - The secret for identity commitment.
   * @param index - The member's index (u32).
   * @param token - The token record.
   * @param msgCounterRecord - Serialized UserMessageCounter record.
   * @param merklePathElements - Array of 15 field elements for the Merkle path.
   * @param merklePathIndices - Array of 15 field elements for the Merkle path indices.
   * @param root - The new Merkle tree root.
   * @param old_root - The previous Merkle tree root.
   */
  async withdrawStake(
    groupId: string,
    member: string,
    secret: string,
    index: number,
    token: { owner: string; amount: number },
    msgCounterRecord: string,
    merklePathElements: string[],
    merklePathIndices: string[],
    root: string,
    old_root: string
  ): Promise<any> {
    const inputs = [
      `${groupId}field`,
      `${member}address`,
      `${secret}field`,
      `${index}u32`,
      `${token}`,
      `${msgCounterRecord}`,
      ...merklePathElements,
      ...merklePathIndices,
      `${root}field`,
      `${old_root}field`
    ];
    return this.executeTransition("withdraw_stake", inputs, { cacheKey: "rln.aleo:withdraw_stake" });
  }

  /**
   * Slashes a member's stake.
   * @param groupId - The group ID.
   * @param slasher - The slasher's address.
   * @param slasherSecret - The slasher's secret.
   * @param slasheeIdentityCommitment - The slashee's identity commitment.
   * @param xShare0 - First x share.
   * @param xShare1 - Second x share.
   * @param yShare0 - First y share.
   * @param yShare1 - Second y share.
   * @param token - The token record.
   * @param merklePathElements - Array of 15 field elements for the Merkle path.
   * @param merklePathIndices - Array of 15 field elements for the Merkle path indices.
   * @param root - The new Merkle tree root.
   * @param old_root - The previous Merkle tree root.
   */
  async slash(
    groupId: string,
    slasher: string,
    slasherSecret: string,
    slasheeIdentityCommitment: string,
    xShare0: string,
    xShare1: string,
    yShare0: string,
    yShare1: string,
    token: { owner: string; amount: number },
    merklePathElements: string[],
    merklePathIndices: string[],
    root: string,
    old_root: string
  ): Promise<any> {
    const inputs = [
      `${groupId}field`,
      `${slasher}address`,
      `${slasherSecret}field`,
      `${slasheeIdentityCommitment}field`,
      `${xShare0}field`,
      `${xShare1}field`,
      `${yShare0}field`,
      `${yShare1}field`,
      `${token.owner}address`,
      `${token.amount}u64`,
      ...merklePathElements,
      ...merklePathIndices,
      `${root}field`,
      `${old_root}field`
    ];
    return this.executeTransition("slash", inputs, { cacheKey: "rln.aleo:slash" });
  }
}
